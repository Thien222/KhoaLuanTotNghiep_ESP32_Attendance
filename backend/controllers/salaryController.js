const { calculateMonthlySalary } = require('../utils/salaryCalculator');
const Employee = require('../models/Employee');
const mongoose = require('mongoose');

/**
 * Helper function: Find employee by userId (can be ObjectId or employeeId string)
 */
async function findEmployeeByUserId(userId) {
  if (mongoose.Types.ObjectId.isValid(userId)) {
    return await Employee.findById(userId);
  } else {
    return await Employee.findOne({ employeeId: userId });
  }
}

/**
 * Helper function: Format payroll response to match previous API format
 */
function formatSalaryResponse(employee, payroll, calcMonth, calcYear) {
  return {
    employee: {
      _id: employee._id,
      name: employee.name,
      employeeId: employee.employeeId
    },
    period: {
      month: calcMonth,
      year: calcYear,
      monthString: `${calcYear}-${String(calcMonth).padStart(2, '0')}`
    },
    basicSalary: payroll.basicSalaryFull || payroll.baseSalary || 0,
    calculations: {
      dailyRate: payroll.dailyRate || 0,
      totalWorkingDays: payroll.actualWorkingDays || payroll.workingDays || 0,
      realWorkSalary: payroll.baseSalary || 0,
      allowance: (payroll.generalAllowance || 0) + (payroll.seniorityAllowance || 0) + (payroll.positionAllowance || 0),
      totalOTPay: (payroll.overtimePay || 0) + (payroll.holidayWorkPay || 0) + (payroll.weekendWorkPay || 0),
      totalFines: payroll.latePenalty || 0,
      grossIncome: payroll.grossSalary || 0,
      tax: payroll.taxAmount || 0,
      netSalary: payroll.netSalary || 0
    },
    summary: {
      totalAttendances: 0, // Not available in payroll object
      totalWorkingDays: payroll.actualWorkingDays || payroll.workingDays || 0,
      totalOTHours: payroll.overtimeHours || 0,
      totalFines: payroll.latePenalty || 0,
      finalSalary: payroll.netSalary || 0
    },
    // Include full payroll data for reference
    payroll: payroll
  };
}

/**
 * POST /api/salary/calculate
 * Calculate monthly salary for an employee
 * Body: { userId, month, year }
 * 
 * NOTE: Now uses the standardized salaryCalculator.js which calculates:
 * - Tax on baseSalaryFull (10% default)
 * - Standard working days: 26 days
 * - Formula: Net = Base + Allowances + OT - Fines - Tax
 */
exports.calculateSalary = async (req, res) => {
  try {
    const { userId, month, year } = req.body;

    // Validation
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    const currentDate = new Date();
    const calcMonth = month || (currentDate.getMonth() + 1);
    const calcYear = year || currentDate.getFullYear();

    if (calcMonth < 1 || calcMonth > 12) {
      return res.status(400).json({
        success: false,
        message: 'Month must be between 1 and 12'
      });
    }

    if (calcYear < 2000 || calcYear > 2100) {
      return res.status(400).json({
        success: false,
        message: 'Year must be between 2000 and 2100'
      });
    }

    // Find employee by userId (can be ObjectId or employeeId string)
    const employee = await findEmployeeByUserId(userId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Calculate salary using standard calculator (employeeId, year, month)
    const payroll = await calculateMonthlySalary(employee._id, calcYear, calcMonth);

    // Format response to match previous API format for compatibility
    const result = formatSalaryResponse(employee, payroll, calcMonth, calcYear);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in calculateSalary:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error calculating salary'
    });
  }
};

/**
 * GET /api/salary/history?userId=xxx&month=11&year=2025
 * Get salary calculation history
 */
exports.getSalaryHistory = async (req, res) => {
  try {
    const { userId, month, year } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    // If month and year provided, calculate for that period
    if (month && year) {
      const calcMonth = parseInt(month);
      const calcYear = parseInt(year);

      if (calcMonth < 1 || calcMonth > 12) {
        return res.status(400).json({
          success: false,
          message: 'Month must be between 1 and 12'
        });
      }

      // Find employee by userId (can be ObjectId or employeeId string)
      const employee = await findEmployeeByUserId(userId);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      // Calculate salary using standard calculator (employeeId, year, month)
      const payroll = await calculateMonthlySalary(employee._id, calcYear, calcMonth);

      // Format response to match previous API format for compatibility
      const result = formatSalaryResponse(employee, payroll, calcMonth, calcYear);

      return res.status(200).json({
        success: true,
        data: result
      });
    }

    // Otherwise, return list of available months (from attendances)
    const employee = await Employee.findOne({
      $or: [
        { _id: userId },
        { employeeId: userId }
      ]
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Get all months with attendances
    const Attendance = require('../models/Attendance');
    const attendances = await Attendance.aggregate([
      { $match: { employee: employee._id } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } }
    ]);

    const history = attendances.map(item => ({
      year: item._id.year,
      month: item._id.month,
      monthString: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      attendanceCount: item.count
    }));

    res.status(200).json({
      success: true,
      data: {
        employee: {
          _id: employee._id,
          name: employee.name,
          employeeId: employee.employeeId
        },
        availableMonths: history
      }
    });
  } catch (error) {
    console.error('Error in getSalaryHistory:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching salary history'
    });
  }
};

/**
 * GET /api/salary/employees
 * Get list of employees with salary info
 */
exports.getEmployeesWithSalary = async (req, res) => {
  try {
    const employees = await Employee.find({ status: 'active' })
      .select('name employeeId baseSalary salary allowance_rate tax_rate')
      .sort({ name: 1 })
      .lean();

    const result = employees.map(emp => ({
      _id: emp._id,
      name: emp.name,
      employeeId: emp.employeeId,
      basicSalary: emp.baseSalary || emp.salary || 0,
      allowanceRate: emp.allowance_rate || 0.1,
      taxRate: emp.tax_rate || 0.05
    }));

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in getEmployeesWithSalary:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching employees'
    });
  }
};







