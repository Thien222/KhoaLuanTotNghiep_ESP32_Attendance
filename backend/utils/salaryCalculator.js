const moment = require('moment-timezone');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Holiday = require('../models/Holiday');
const Settings = require('../models/Settings');

moment.tz.setDefault('Asia/Ho_Chi_Minh');

/**
 * Tính lương hoàn chỉnh cho nhân viên trong tháng
 */
async function calculateMonthlySalary(employeeId, year, month) {
  const employee = await Employee.findById(employeeId);
  if (!employee) throw new Error('Không tìm thấy nhân viên');
  
  // // 1. CẬP NHẬT THÂM NIÊN
  // employee.updateSeniority();
  // await employee.save();
  
  // // 2. LẤY DỮ LIỆU THÁNG
  // const startDate = moment(`${year}-${String(month).padStart(2, '0')}-01`).startOf('day');
  // const endDate = startDate.clone().endOf('month');
  
  // Lấy TẤT CẢ settings từ database
  const [attendanceSettings, overtimeSettings, latePolicy, salaryStructure, taxConfig, otRateConfig] = await Promise.all([
    Settings.findOne({ type: 'working-hours' }),
    Settings.findOne({ type: 'overtime' }),
    Settings.findOne({ type: 'late-policy' }),
    Settings.findOne({ type: 'salary-structure' }),
    Settings.findOne({ type: 'tax-config' }),
    Settings.findOne({ type: 'ot-rate' })
  ]);
  
  console.log(' [SALARY CALC] Settings loaded:', {
    allowanceRate: salaryStructure?.config?.generalAllowanceRate || 5,
    taxRate: taxConfig?.config?.taxRate || 10,
    otRatePerHour: otRateConfig?.config?.ratePerHour || overtimeSettings?.config?.otRate || 100000,
    latePenaltyPer15Min: latePolicy?.config?.penaltyRate || 20000
  });
  
  // Lấy attendance
  const attendances = await Attendance.find({
    employee: employeeId,
    date: { $gte: startDate.toDate(), $lte: endDate.toDate() }
  });
  
  // Lấy leave
  const leaves = await Leave.find({
    employee: employeeId,
    startDate: { $lte: endDate.toDate() },
    endDate: { $gte: startDate.toDate() },
    status: 'approved'
  });
  
  // Lấy holidays
  const holidays = await Holiday.find({
    date: { $gte: startDate.toDate(), $lte: endDate.toDate() }
  });
  const holidayDates = new Set(holidays.map(h => moment(h.date).format('YYYY-MM-DD')));
  
  // 3. TÍNH TOÁN CÁC THÀNH PHẦN
  const stats = await calculateAttendanceStats(
    attendances, 
    startDate, 
    endDate, 
    holidayDates,
    overtimeSettings?.config,
    latePolicy?.config
  );
  
  const leaveStats = calculateLeaveStats(leaves, startDate, endDate);
  
  // 4. TÍNH LƯƠNG CƠ BẢN (UPDATED - Theo ngày công / 30)
  const baseSalaryFull = employee.baseSalary || employee.salary || 0;
  
  // NEW: Lương cơ bản = LCB × (số ngày công / 30)
  const workDaysInMonth = stats.workingDays + (stats.halfDays * 0.5);
  const baseSalary = Math.round((baseSalaryFull * workDaysInMonth) / 30);
  
  // 5. TÍNH PHỤ CẤP (UPDATED - 5% thay vì 10%)
  const allowanceRate = salaryStructure?.config?.generalAllowanceRate || 5;
  const generalAllowance = Math.round((baseSalaryFull * allowanceRate) / 100);
  
  // 6. TÍNH PHỤ CẤP THÂM NIÊN
  const seniorityAllowance = calculateSeniorityAllowance(
    baseSalaryFull, 
    employee.joinDate,
    salaryStructure?.config
  );
  
  // 7. TÍNH PHỤ CẤP CHỨC VỤ
  const positionAllowance = calculatePositionAllowance(
    baseSalaryFull,
    employee.position,
    salaryStructure?.config
  );
  
  // 8. TÍNH LƯƠNG OT (UPDATED - Dùng estimatedOTSalary từ attendance records)
  // Vì estimatedOTSalary đã được tính với hệ số đúng (weekday/weekend/holiday) trong attendanceController
  // Nên chỉ cần cộng lại từ các attendance records
  let overtimePay = 0;
  attendances.forEach(att => {
    if (att.estimatedOTSalary) {
      overtimePay += att.estimatedOTSalary;
    }
  });
  
  // Fallback: Nếu không có estimatedOTSalary, tính theo rate cố định (không có hệ số)
  if (overtimePay === 0 && stats.overtimeHours > 0) {
    const otRatePerHour = otRateConfig?.config?.ratePerHour || overtimeSettings?.config?.otRate || 100000;
    overtimePay = calculateOvertimePayFixed(
      stats.overtimeHours,
      { ...overtimeSettings?.config, otRate: otRatePerHour }
    );
    console.log(`⚠️ [PAYROLL] Using fallback OT calculation (no estimatedOTSalary in attendance records)`);
  }
  
  // 9. TÍNH LƯƠNG LÀM VIỆC NGÀY LỄ
  const holidayWorkPay = calculateHolidayWorkPay(
    employee,
    stats.holidayWorkDays,
    baseSalaryFull
  );
  
  // 10. TÍNH LƯƠNG LÀM VIỆC CUỐI TUẦN
  const weekendWorkPay = calculateWeekendWorkPay(
    employee,
    stats.weekendWorkDays,
    baseSalaryFull,
    overtimeSettings?.config
  );
  
  // 11. TÍNH TỔNG PHẠT (ĐI MUỘN + VỀ SỚM)
  const latePenalty = stats.totalPenalty || 0; // Đã tính trong attendance
  
  // 12. TÍNH KHẤU TRỪ NGHỈ (UPDATED - Dựa trên baseSalaryFull)
  const absentDeduction = calculateAbsentDeduction(
    baseSalaryFull,
    stats.absentDays
  );
  
  const unpaidLeaveDeduction = calculateUnpaidLeaveDeduction(
    baseSalaryFull,
    leaveStats.unpaidDays
  );
  
  const halfDayDeduction = calculateHalfDayDeduction(
    baseSalaryFull,
    stats.halfDays
  );
  
  // 13. TÍNH CHẾ ĐỘ THAI SẢN
  const maternityPay = calculateMaternityPay(
    employee,
    baseSalaryFull,
    leaveStats.maternityDays,
    startDate,
    endDate
  );
  
  // 14. TÍNH NGHỈ ỐM CÓ LƯƠNG
  const sickLeavePay = calculateSickLeavePay(
    baseSalaryFull,
    leaveStats.sickLeaveDays
  );
  
  // 15. TÍNH NGHỈ PHÉP CÓ LƯƠNG
  const annualLeavePay = calculateAnnualLeavePay(
    baseSalaryFull,
    leaveStats.annualLeaveDays
  );
  
  // 16. TẠO PAYROLL OBJECT (UPDATED - Công thức mới)
  // =====================================================
  // CÔNG THỨC MỚI: 
  // Net Salary = (Base Salary × Actual Working Days / 30) + Allowances + OT Salary - Fines - Tax
  // =====================================================
  
  // Tổng phụ cấp
  const totalAllowances = generalAllowance + seniorityAllowance + positionAllowance;
  
  // Tổng lương OT (bao gồm cả làm lễ, cuối tuần)
  const totalOTSalary = overtimePay + holidayWorkPay + weekendWorkPay;
  
  // Tổng phạt (chỉ tính latePenalty, không trừ ngày nghỉ vì đã tính trong baseSalary)
  const totalFines = latePenalty;
  
  // Tính thuế
  const taxRate = taxConfig?.config?.taxRate || 10;
  // Thuế tính trên: (Lương cơ bản + Phụ cấp + OT - Phạt)
  const taxableIncome = baseSalary + totalAllowances + totalOTSalary - totalFines;
  const taxAmount = Math.round((taxableIncome * taxRate) / 100);
  
  // NET SALARY = (Base × Days/30) + Allowances + OT - Fines - Tax
  const netSalary = baseSalary + totalAllowances + totalOTSalary - totalFines - taxAmount;
  
  console.log(`📊 [SALARY] ${employee.name}:`);
  console.log(`   Base (${workDaysInMonth} days/30): ${baseSalary.toLocaleString()}đ`);
  console.log(`   + Allowances: ${totalAllowances.toLocaleString()}đ`);
  console.log(`   + OT Salary: ${totalOTSalary.toLocaleString()}đ`);
  console.log(`   - Fines: ${totalFines.toLocaleString()}đ`);
  console.log(`   - Tax (${taxRate}%): ${taxAmount.toLocaleString()}đ`);
  console.log(`   = NET: ${netSalary.toLocaleString()}đ`);
  
  const payroll = {
    employee: employeeId,
    month: `${year}-${String(month).padStart(2, '0')}`,
    
    // Lương cơ bản THÁNG (do admin set)
    basicSalaryFull: baseSalaryFull,
    // Lương tính theo ngày công = LCB × (số ngày / 30)
    baseSalary: baseSalary,
    // Lương 1 ngày công
    dailyRate: Math.round(baseSalaryFull / 30),
    
    // Phụ cấp
    generalAllowance: generalAllowance,
    seniorityAllowance: seniorityAllowance,
    positionAllowance: positionAllowance,
    
    // Thành phần tăng
    overtimePay: overtimePay,
    holidayWorkPay: holidayWorkPay,
    weekendWorkPay: weekendWorkPay,
    bonus: 0,
    performanceBonus: 0,
    otherAllowances: 0,
    
    // Thành phần giảm (Fines)
    latePenalty: latePenalty,
    // Các khấu trừ nghỉ (hiển thị để tham khảo, nhưng đã tính trong baseSalary prorated)
    absentDeduction: 0, // Đã tính trong baseSalary = LCB × days/30
    unpaidLeaveDeduction: 0, // Đã tính trong baseSalary
    halfDayDeduction: 0, // Đã tính trong baseSalary
    otherDeductions: 0,
    
    // Chế độ đặc biệt (hiển thị riêng)
    maternityPay: maternityPay,
    sickLeavePay: sickLeavePay,
    annualLeavePay: annualLeavePay,
    
    // Thuế
    taxRate: taxRate,
    taxAmount: taxAmount,
    
    // Tổng hợp
    grossSalary: baseSalary + totalAllowances + totalOTSalary + maternityPay + sickLeavePay + annualLeavePay,
    totalDeductions: totalFines + taxAmount,
    netSalary: netSalary,
    
    // Thông tin chi tiết
    workingDays: stats.workingDays,
    actualWorkingDays: workDaysInMonth, // NEW: Số ngày thực tế (dùng để tính lương)
    absentDays: stats.absentDays,
    halfDays: stats.halfDays,
    lateCount: stats.lateCount,
    lateMinutes: stats.lateMinutes,
    overtimeHours: stats.overtimeHours,
    holidayWorkDays: stats.holidayWorkDays,
    weekendWorkDays: stats.weekendWorkDays,
    paidLeaveDays: leaveStats.annualLeaveDays + leaveStats.sickLeaveDays,
    unpaidLeaveDays: leaveStats.unpaidDays,
    maternityDays: leaveStats.maternityDays,
    sickLeaveDays: leaveStats.sickLeaveDays,
    
    status: 'calculated',
    calculatedAt: new Date()
  };
  
  return payroll;
}

/**
 * Tính phụ cấp thâm niên
 */
function calculateSeniorityAllowance(baseSalary, joinDate, salaryConfig) {
  if (!joinDate) return 0;
  
  const years = moment().diff(moment(joinDate), 'years', true);
  const config = salaryConfig?.seniorityPolicy || {};
  const percentPerYear = config.percentPerYear || 2;
  const maxPercent = config.maxPercent || 20;
  
  const seniorityPercent = Math.min(Math.floor(years) * percentPerYear, maxPercent);
  return Math.round((baseSalary * seniorityPercent) / 100);
}

/**
 * Tính phụ cấp chức vụ
 */
function calculatePositionAllowance(baseSalary, position, salaryConfig) {
  const config = salaryConfig?.positionAllowance || {};
  const percent = config[position] || 0;
  return Math.round((baseSalary * percent) / 100);
}

/**
 * Tính lương OT (OLD - Keep for compatibility)
 */
function calculateOvertimePay(employee, overtimeHours, overtimeDetails, overtimeConfig) {
  const baseSalary = employee.baseSalary || employee.salary || 0;
  const hourlyRate = baseSalary / (22 * 8); // 22 ngày, 8 giờ/ngày
  const config = overtimeConfig || {};
  
  if (overtimeDetails && overtimeDetails.length > 0) {
    let totalPay = 0;
    overtimeDetails.forEach(detail => {
      const rate = detail.isHoliday ? (config.holidayRate || 3.0) :
                   detail.isWeekend ? (config.weekendRate || 2.0) :
                   (config.weekdayRate || 1.5);
      totalPay += hourlyRate * detail.hours * rate;
    });
    return Math.round(totalPay);
  }
  
  // Fallback: tính đơn giản nếu không có chi tiết
  const defaultRate = config.weekdayRate || 1.5;
  return Math.round(hourlyRate * overtimeHours * defaultRate);
}

/**
 * Tính lương OT theo rate cố định (NEW)
 * OT rate: 100k VND/1h (mặc định)
 */
function calculateOvertimePayFixed(overtimeHours, overtimeConfig) {
  if (!overtimeHours || overtimeHours <= 0) {
    return 0;
  }
  
  const config = overtimeConfig || {};
  const ratePerHour = config.otRate || 100000; // 100k VND/1h
  
  return Math.round(overtimeHours * ratePerHour);
}

/**
 * Tính lương làm việc ngày lễ
 */
function calculateHolidayWorkPay(employee, holidayWorkDays, baseSalary) {
  if (holidayWorkDays === 0) return 0;
  const dailyRate = baseSalary / 22;
  // Làm lễ được tính 2x (1x đã tính trong basePay, thêm 1x)
  return Math.round(dailyRate * holidayWorkDays);
}

/**
 * Tính lương làm việc cuối tuần
 */
function calculateWeekendWorkPay(employee, weekendWorkDays, baseSalary, overtimeConfig) {
  if (weekendWorkDays === 0) return 0;
  const dailyRate = baseSalary / 22;
  const config = overtimeConfig || {};
  const weekendRate = config.weekendRate || 2.0;
  // Làm cuối tuần được tính 2x (1x đã tính trong basePay, thêm 1x)
  return Math.round(dailyRate * weekendWorkDays * (weekendRate - 1));
}

/**
 * Tính phạt đi muộn
 */
function calculateLatePenalty(lateCount, lateMinutes, latePolicy) {
  const config = latePolicy || {};
  const penaltyPerLate = config.penaltyAfterGrace || 50000;
  const penaltyPerMinute = config.penaltyPerMinute || 0;
  
  if (penaltyPerMinute > 0) {
    return Math.round(lateMinutes * penaltyPerMinute);
  }
  return lateCount * penaltyPerLate;
}

/**
 * Tính khấu trừ nghỉ không lương
 */
function calculateAbsentDeduction(baseSalary, absentDays) {
  if (absentDays === 0) return 0;
  const dailyRate = baseSalary / 22;
  return Math.round(dailyRate * absentDays);
}

function calculateUnpaidLeaveDeduction(baseSalary, unpaidDays) {
  if (unpaidDays === 0) return 0;
  const dailyRate = baseSalary / 22;
  return Math.round(dailyRate * unpaidDays);
}

function calculateHalfDayDeduction(baseSalary, halfDays) {
  if (halfDays === 0) return 0;
  const dailyRate = baseSalary / 22;
  return Math.round(dailyRate * halfDays * 0.5);
}

/**
 * Tính chế độ thai sản
 */
function calculateMaternityPay(employee, baseSalary, maternityDays, startDate, endDate) {
  if (maternityDays === 0) return 0;
  if (!employee.isMaternityLeave) return 0;
  
  // Theo quy định: 100% lương trong 6 tháng đầu, 30% trong 2 tháng cuối
  const dailyRate = baseSalary / 22;
  const totalMaternityDays = employee.maternityLeaveDays || 180; // 6 tháng
  
  if (maternityDays <= 120) {
    // 4 tháng đầu: 100%
    return Math.round(dailyRate * maternityDays);
  } else if (maternityDays <= 150) {
    // 2 tháng tiếp: 100%
    return Math.round(dailyRate * maternityDays);
  } else {
    // 2 tháng cuối: 30%
    const fullPayDays = 150;
    const partialPayDays = maternityDays - fullPayDays;
    return Math.round(dailyRate * fullPayDays + dailyRate * partialPayDays * 0.3);
  }
}

/**
 * Tính nghỉ ốm có lương
 */
function calculateSickLeavePay(baseSalary, sickLeaveDays) {
  if (sickLeaveDays === 0) return 0;
  const dailyRate = baseSalary / 22;
  // Nghỉ ốm: 75% lương (theo quy định)
  return Math.round(dailyRate * sickLeaveDays * 0.75);
}

/**
 * Tính nghỉ phép có lương
 */
function calculateAnnualLeavePay(baseSalary, annualLeaveDays) {
  if (annualLeaveDays === 0) return 0;
  const dailyRate = baseSalary / 22;
  // Nghỉ phép: 100% lương
  return Math.round(dailyRate * annualLeaveDays);
}

/**
 * Tính thống kê attendance
 */
async function calculateAttendanceStats(attendances, startDate, endDate, holidayDates, overtimeConfig, latePolicy) {
  let workingDays = 0;
  let absentDays = 0;
  let halfDays = 0;
  let lateCount = 0;
  let lateMinutes = 0;
  let overtimeHours = 0;
  let holidayWorkDays = 0;
  let weekendWorkDays = 0;
  
  const overtimeDetails = [];
  
  let totalPenalty = 0; // NEW: Tổng phạt từ attendance
  
  attendances.forEach(att => {
    const attDate = moment(att.date).format('YYYY-MM-DD');
    const isHoliday = holidayDates.has(attDate);
    const dayOfWeek = moment(att.date).day();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    if (att.status === 'present' || att.status === 'late') {
      workingDays++;
      if (isHoliday) holidayWorkDays++;
      if (isWeekend) weekendWorkDays++;
    }
    
    if (att.status === 'half-day') {
      halfDays++;
    }
    
    if (att.status === 'absent') {
      absentDays++;
    }
    
    if (att.checkIn && att.checkIn.status === 'late') {
      lateCount++;
      lateMinutes += att.lateMinutes || 0;
    }
    
    // NEW: Cộng tổng phạt từ actualPenalty
    if (att.actualPenalty) {
      totalPenalty += att.actualPenalty;
    }
    
    if (att.overtimeHours > 0) {
      overtimeHours += att.overtimeHours;
      overtimeDetails.push({
        hours: att.overtimeHours,
        isHoliday: isHoliday,
        isWeekend: isWeekend,
        estimatedOTSalary: att.estimatedOTSalary || 0  // Lưu OT salary đã tính (có hệ số)
      });
    }
  });
  
  return {
    workingDays,
    absentDays,
    halfDays,
    lateCount,
    lateMinutes,
    totalPenalty, // NEW
    overtimeHours,
    overtimeDetails,
    holidayWorkDays,
    weekendWorkDays
  };
}

/**
 * Tính thống kê leave
 */
function calculateLeaveStats(leaves, startDate, endDate) {
  let unpaidDays = 0;
  let annualLeaveDays = 0;
  let sickLeaveDays = 0;
  let maternityDays = 0;
  
  leaves.forEach(leave => {
    const days = calculateOverlapDays(leave.startDate, leave.endDate, startDate.toDate(), endDate.toDate());
    
    if (leave.leaveType === 'unpaid' || leave.type === 'unpaid') {
      unpaidDays += days;
    } else if (leave.leaveType === 'annual' || leave.type === 'annual') {
      annualLeaveDays += days;
    } else if (leave.leaveType === 'sick' || leave.type === 'sick') {
      sickLeaveDays += days;
    } else if (leave.leaveType === 'maternity' || leave.type === 'maternity') {
      maternityDays += days;
    }
  });
  
  return {
    unpaidDays,
    annualLeaveDays,
    sickLeaveDays,
    maternityDays
  };
}

function calculateOverlapDays(start1, end1, start2, end2) {
  const overlapStart = moment.max(moment(start1), moment(start2));
  const overlapEnd = moment.min(moment(end1), moment(end2));
  if (overlapEnd.isBefore(overlapStart)) return 0;
  return overlapEnd.diff(overlapStart, 'days') + 1;
}

module.exports = {
  calculateMonthlySalary,
  calculateSeniorityAllowance,
  calculateOvertimePay,
  calculateOvertimePayFixed,
  calculateHolidayWorkPay,
  calculateLatePenalty
};




