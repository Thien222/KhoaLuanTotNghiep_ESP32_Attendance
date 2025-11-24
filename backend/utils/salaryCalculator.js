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
  
  // 1. CẬP NHẬT THÂM NIÊN
  employee.updateSeniority();
  await employee.save();
  
  // 2. LẤY DỮ LIỆU THÁNG
  const startDate = moment(`${year}-${String(month).padStart(2, '0')}-01`).startOf('day');
  const endDate = startDate.clone().endOf('month');
  
  // Lấy settings
  const [attendanceSettings, overtimeSettings, latePolicy, salaryStructure] = await Promise.all([
    Settings.findOne({ type: 'working-hours' }),
    Settings.findOne({ type: 'overtime' }),
    Settings.findOne({ type: 'late-policy' }),
    Settings.findOne({ type: 'salary-structure' })
  ]);
  
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
  
  // 4. TÍNH LƯƠNG CƠ BẢN
  const baseSalary = employee.baseSalary || employee.salary || 0;
  
  // 5. TÍNH PHỤ CẤP THÂM NIÊN
  const seniorityAllowance = calculateSeniorityAllowance(
    baseSalary, 
    employee.joinDate,
    salaryStructure?.config
  );
  
  // 6. TÍNH PHỤ CẤP CHỨC VỤ
  const positionAllowance = calculatePositionAllowance(
    baseSalary,
    employee.position,
    salaryStructure?.config
  );
  
  // 7. TÍNH LƯƠNG OT
  const overtimePay = calculateOvertimePay(
    employee,
    stats.overtimeHours,
    stats.overtimeDetails,
    overtimeSettings?.config
  );
  
  // 8. TÍNH LƯƠNG LÀM VIỆC NGÀY LỄ
  const holidayWorkPay = calculateHolidayWorkPay(
    employee,
    stats.holidayWorkDays,
    baseSalary
  );
  
  // 9. TÍNH LƯƠNG LÀM VIỆC CUỐI TUẦN
  const weekendWorkPay = calculateWeekendWorkPay(
    employee,
    stats.weekendWorkDays,
    baseSalary,
    overtimeSettings?.config
  );
  
  // 10. TÍNH PHẠT ĐI MUỘN
  const latePenalty = calculateLatePenalty(
    stats.lateCount,
    stats.lateMinutes,
    latePolicy?.config
  );
  
  // 11. TÍNH KHẤU TRỪ NGHỈ
  const absentDeduction = calculateAbsentDeduction(
    baseSalary,
    stats.absentDays
  );
  
  const unpaidLeaveDeduction = calculateUnpaidLeaveDeduction(
    baseSalary,
    leaveStats.unpaidDays
  );
  
  const halfDayDeduction = calculateHalfDayDeduction(
    baseSalary,
    stats.halfDays
  );
  
  // 12. TÍNH CHẾ ĐỘ THAI SẢN
  const maternityPay = calculateMaternityPay(
    employee,
    baseSalary,
    leaveStats.maternityDays,
    startDate,
    endDate
  );
  
  // 13. TÍNH NGHỈ ỐM CÓ LƯƠNG
  const sickLeavePay = calculateSickLeavePay(
    baseSalary,
    leaveStats.sickLeaveDays
  );
  
  // 14. TÍNH NGHỈ PHÉP CÓ LƯƠNG
  const annualLeavePay = calculateAnnualLeavePay(
    baseSalary,
    leaveStats.annualLeaveDays
  );
  
  // 15. TẠO PAYROLL OBJECT
  const payroll = {
    employee: employeeId,
    month: `${year}-${String(month).padStart(2, '0')}`,
    
    // Lương cơ bản
    baseSalary: baseSalary,
    seniorityAllowance: seniorityAllowance,
    positionAllowance: positionAllowance,
    
    // Thành phần tăng
    overtimePay: overtimePay,
    holidayWorkPay: holidayWorkPay,
    weekendWorkPay: weekendWorkPay,
    bonus: 0,
    performanceBonus: 0,
    otherAllowances: 0,
    
    // Thành phần giảm
    latePenalty: latePenalty,
    absentDeduction: absentDeduction,
    unpaidLeaveDeduction: unpaidLeaveDeduction,
    halfDayDeduction: halfDayDeduction,
    otherDeductions: 0,
    
    // Chế độ đặc biệt
    maternityPay: maternityPay,
    sickLeavePay: sickLeavePay,
    annualLeavePay: annualLeavePay,
    
    // Thông tin
    workingDays: stats.workingDays,
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
  
  // Tính tổng
  payroll.grossSalary = payroll.baseSalary + 
                       payroll.seniorityAllowance + 
                       payroll.positionAllowance +
                       payroll.overtimePay + 
                       payroll.holidayWorkPay +
                       payroll.weekendWorkPay +
                       payroll.bonus + 
                       payroll.performanceBonus +
                       payroll.otherAllowances +
                       payroll.maternityPay +
                       payroll.sickLeavePay +
                       payroll.annualLeavePay;
  
  payroll.totalDeductions = payroll.latePenalty + 
                            payroll.absentDeduction + 
                            payroll.unpaidLeaveDeduction +
                            payroll.halfDayDeduction +
                            payroll.otherDeductions;
  
  payroll.netSalary = payroll.grossSalary - payroll.totalDeductions;
  
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
 * Tính lương OT
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
    
    if (att.status === 'late') {
      lateCount++;
      lateMinutes += att.lateMinutes || 0;
    }
    
    if (att.overtimeHours > 0) {
      overtimeHours += att.overtimeHours;
      overtimeDetails.push({
        hours: att.overtimeHours,
        isHoliday: isHoliday,
        isWeekend: isWeekend
      });
    }
  });
  
  return {
    workingDays,
    absentDays,
    halfDays,
    lateCount,
    lateMinutes,
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
  calculateHolidayWorkPay,
  calculateLatePenalty
};




