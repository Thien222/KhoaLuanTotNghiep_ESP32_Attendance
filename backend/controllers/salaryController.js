const { calculateMonthlySalary } = require('../services/salary.service');
const Employee = require('../models/Employee');

/**
 * POST /api/salary/calculate
 * Calculate monthly salary for an employee
 * Body: { userId, month, year }
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

    // Calculate salary
    const result = await calculateMonthlySalary(userId, calcMonth, calcYear);

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

      const result = await calculateMonthlySalary(userId, calcMonth, calcYear);
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







