const Payroll = require('../models/Payroll');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Leave = require('../models/Leave');
const Holiday = require('../models/Holiday');
const Settings = require('../models/Settings');
const moment = require('moment-timezone');

moment.tz.setDefault('Asia/Ho_Chi_Minh');

/**
 * Calculate payroll for a specific employee and month
 */
exports.calculatePayroll = async (req, res) => {
  try {
    const { employeeId, month } = req.body; // month format: "YYYY-MM"
    
    if (!employeeId || !month) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin nhân viên hoặc tháng'
      });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhân viên'
      });
    }

    // Calculate payroll
    const payrollData = await calculateEmployeePayroll(employee, month);
    
    // Save or update payroll
    const payroll = await Payroll.findOneAndUpdate(
      { employee: employeeId, month },
      payrollData,
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Tính lương thành công',
      data: payroll
    });
  } catch (error) {
    console.error('Calculate payroll error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tính lương',
      error: error.message
    });
  }
};

/**
 * Calculate payroll for all employees in a month
 */
exports.calculatePayrollForAll = async (req, res) => {
  try {
    const { month } = req.body;
    
    if (!month) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin tháng'
      });
    }

    const employees = await Employee.find({ status: 'Đang làm việc' });
    const results = [];
    const errors = [];

    for (const employee of employees) {
      try {
        const payrollData = await calculateEmployeePayroll(employee, month);
        const payroll = await Payroll.findOneAndUpdate(
          { employee: employee._id, month },
          payrollData,
          { new: true, upsert: true, runValidators: true }
        );
        results.push(payroll);
      } catch (error) {
        errors.push({
          employee: employee.name,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Tính lương thành công cho ${results.length} nhân viên`,
      data: results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Calculate payroll for all error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tính lương',
      error: error.message
    });
  }
};

/**
 * Get payrolls with query params (month, year) - Main endpoint for frontend
 */
exports.getPayrolls = async (req, res) => {
  try {
    const { month, year } = req.query;
    const user = req.user;
    
    // Build query
    const query = {};
    
    if (month && year) {
      // Format: month=11, year=2024
      query.year = parseInt(year);
      query.monthNum = parseInt(month);
    } else if (month) {
      // If only month provided, try to match current year
      const currentYear = new Date().getFullYear();
      query.year = currentYear;
      query.monthNum = parseInt(month);
    }
    
    // If user is employee, only show their own payroll
    if (user.role === 'employee' && user.employee) {
      query.employee = user.employee._id || user.employee;
    }
    
    const payrolls = await Payroll.find(query)
      .populate({
        path: 'employee',
        select: 'name employeeId position department email contractType salary',
        model: 'Employee'
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: payrolls,
      count: payrolls.length
    });
  } catch (error) {
    console.error('Get payrolls error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy bảng lương',
      error: error.message
    });
  }
};

/**
 * Get payroll by month
 */
exports.getPayrollByMonth = async (req, res) => {
  try {
    const { month } = req.params;
    
    const payrolls = await Payroll.find({ month })
      .populate('employee', 'employeeId name position department')
      .sort({ totalSalary: -1 });

    res.json({
      success: true,
      data: payrolls,
      count: payrolls.length
    });
  } catch (error) {
    console.error('Get payroll by month error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy bảng lương',
      error: error.message
    });
  }
};

/**
 * Get employee payroll history
 */
exports.getEmployeePayroll = async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const payrolls = await Payroll.find({ employee: employeeId })
      .sort({ month: -1 });

    res.json({
      success: true,
      data: payrolls,
      count: payrolls.length
    });
  } catch (error) {
    console.error('Get employee payroll error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy lịch sử lương',
      error: error.message
    });
  }
};

/**
 * Approve payroll
 */
exports.approvePayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;
    
    const payroll = await Payroll.findByIdAndUpdate(
      id,
      {
        status: 'approved',
        approvedBy: approvedBy || 'Admin',
        approvedAt: new Date()
      },
      { new: true }
    ).populate('employee', 'employeeId name position');

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bảng lương'
      });
    }

    res.json({
      success: true,
      message: 'Duyệt lương thành công',
      data: payroll
    });
  } catch (error) {
    console.error('Approve payroll error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi duyệt lương',
      error: error.message
    });
  }
};

/**
 * Add manual adjustment to payroll
 */
exports.addManualAdjustment = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, amount, reason } = req.body;
    const user = req.user;
    
    if (!type || !amount || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin: type, amount, reason là bắt buộc'
      });
    }
    
    if (!['bonus', 'penalty', 'increase', 'decrease'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Loại điều chỉnh không hợp lệ. Phải là: bonus, penalty, increase, decrease'
      });
    }
    
    const payroll = await Payroll.findById(id);
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bảng lương'
      });
    }
    
    // Add adjustment
    if (!payroll.manualAdjustments) {
      payroll.manualAdjustments = [];
    }
    
    payroll.manualAdjustments.push({
      type,
      amount: parseFloat(amount),
      reason,
      date: new Date(),
      createdBy: user.username || user.email || 'Admin'
    });
    
    // Recalculate total salary
    let adjustmentTotal = 0;
    payroll.manualAdjustments.forEach(adj => {
      if (adj.type === 'bonus' || adj.type === 'increase') {
        adjustmentTotal += adj.amount;
      } else {
        adjustmentTotal -= adj.amount;
      }
    });
    
    payroll.totalSalary = (payroll.basicSalary || 0) + 
                         (payroll.overtimePay || 0) + 
                         (payroll.bonus || 0) + 
                         (payroll.yearEndBonus || 0) - 
                         (payroll.deductions || 0) + 
                         adjustmentTotal;
    
    await payroll.save();
    
    res.json({
      success: true,
      message: 'Điều chỉnh lương thành công',
      data: payroll
    });
  } catch (error) {
    console.error('Add manual adjustment error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi điều chỉnh lương',
      error: error.message
    });
  }
};

/**
 * Mark payroll as paid
 */
exports.markAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payroll = await Payroll.findByIdAndUpdate(
      id,
      {
        status: 'paid',
        paidAt: new Date()
      },
      { new: true }
    ).populate('employee', 'employeeId name position');

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bảng lương'
      });
    }

    res.json({
      success: true,
      message: 'Đánh dấu đã thanh toán thành công',
      data: payroll
    });
  } catch (error) {
    console.error('Mark as paid error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi đánh dấu thanh toán',
      error: error.message
    });
  }
};

/**
 * Helper function to calculate employee payroll
 */
async function calculateEmployeePayroll(employee, month) {
  // Parse month
  const [year, monthNum] = month.split('-').map(Number);
  const startDate = moment.tz([year, monthNum - 1, 1], 'Asia/Ho_Chi_Minh').startOf('day').toDate();
  const endDate = moment.tz([year, monthNum - 1, 1], 'Asia/Ho_Chi_Minh').endOf('month').endOf('day').toDate();

  // Get attendance records
  const attendances = await Attendance.find({
    employee: employee._id,
    date: { $gte: startDate, $lte: endDate }
  });

  // Get approved leaves in this month
  const approvedLeaves = await Leave.find({
    employee: employee._id,
    status: 'approved',
    $or: [
      { startDate: { $gte: startDate, $lte: endDate } },
      { endDate: { $gte: startDate, $lte: endDate } },
      { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
    ]
  });

  // Get holidays in this month
  const holidays = await Holiday.find({
    date: { $gte: startDate, $lte: endDate }
  });

  // Calculate leave days in this month
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;

  approvedLeaves.forEach(leave => {
    const leaveStart = moment.max(moment(leave.startDate), moment(startDate));
    const leaveEnd = moment.min(moment(leave.endDate), moment(endDate));
    const days = leaveEnd.diff(leaveStart, 'days') + 1;

    if (leave.type === 'unpaid') {
      unpaidLeaveDays += days;
    } else {
      paidLeaveDays += days;
    }
  });

  // Count holidays
  const holidayDays = holidays.length;

  // Calculate working days in month (excluding weekends)
  let totalWorkingDays = 0;
  let currentDate = moment(startDate);
  while (currentDate.isSameOrBefore(endDate)) {
    const dayOfWeek = currentDate.day();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
      totalWorkingDays++;
    }
    currentDate.add(1, 'day');
  }

  // Subtract holidays from total working days
  totalWorkingDays -= holidayDays;

  // Calculate statistics from attendance
  let actualWorkingDays = 0;
  let lateDays = 0;
  let absentDays = 0;
  let totalWorkingHours = 0;
  let totalOvertimeHours = 0;
  let totalLatePenalty = 0;
  let totalOvertimePay = 0;
  let holidayWorkDays = 0;
  let holidayWorkPay = 0;

  // Create holiday date set for quick lookup
  const holidayDates = new Set(holidays.map(h => moment(h.date).format('YYYY-MM-DD')));

  attendances.forEach(attendance => {
    const attendanceDate = moment(attendance.date).format('YYYY-MM-DD');
    const isHoliday = holidayDates.has(attendanceDate);

    if (attendance.status === 'present' || attendance.status === 'late') {
      actualWorkingDays++;
      totalWorkingHours += attendance.workingHours || 0;

      // If working on holiday, calculate bonus pay (2x)
      if (isHoliday) {
        holidayWorkDays++;
        const empSalary = employee.salary || 0;
        const dailyRate = empSalary / 22;
        holidayWorkPay += dailyRate; // Extra 1x pay (already counted in actualWorkingDays)
      }
    }
    
    if (attendance.status === 'late') {
      lateDays++;
      totalLatePenalty += attendance.latePenalty || 0;
    }
    
    if (attendance.status === 'absent') {
      absentDays++;
    }
    
    totalOvertimeHours += attendance.overtimeHours || 0;
    totalOvertimePay += attendance.overtimePay || 0;
  });

  // Calculate salary
  const basicSalary = employee.salary || 0;
  const dailyRate = basicSalary > 0 ? basicSalary / 22 : 0; // 22 working days per month
  
  // Base pay (proportional to actual working days + paid leave days)
  const basePay = dailyRate * (actualWorkingDays + paidLeaveDays);
  
  // Absent deduction
  const absentDeduction = dailyRate * absentDays;
  
  // Unpaid leave deduction
  const unpaidLeaveDeduction = dailyRate * unpaidLeaveDays;
  
  // Total salary
  const totalSalary = basePay + totalOvertimePay + holidayWorkPay - totalLatePenalty - absentDeduction - unpaidLeaveDeduction;

  // year and monthNum are already parsed at the beginning of the function
  // Reuse them instead of parsing again
  
  return {
    employee: employee._id,
    month, // Keep for backward compatibility
    year: year, // Add year as number (already parsed)
    monthNum: monthNum, // Add month as number (1-12) (already parsed)
    basicSalary: basicSalary,
    position: employee.position,
    totalWorkingDays,
    actualWorkingDays,
    lateDays,
    absentDays,
    paidLeaveDays,
    unpaidLeaveDays,
    holidayDays,
    holidayWorkDays,
    totalWorkingHours,
    overtimeHours: totalOvertimeHours,
    basePay: Math.round(basePay),
    overtimePay: Math.round(totalOvertimePay),
    holidayWorkPay: Math.round(holidayWorkPay),
    latePenalty: Math.round(totalLatePenalty),
    absentDeduction: Math.round(absentDeduction),
    unpaidLeaveDeduction: Math.round(unpaidLeaveDeduction),
    allowances: 0,
    deductions: Math.round(totalLatePenalty + absentDeduction + unpaidLeaveDeduction),
    totalSalary: Math.round(totalSalary),
    status: 'pending',
    calculatedAt: new Date()
  };
}

module.exports = exports;







