const mongoose = require('mongoose');
const moment = require('moment-timezone');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const SalaryConfig = require('../models/SalaryConfig');

moment.tz.setDefault('Asia/Ho_Chi_Minh');

/**
 * Calculate fine for late check-in or early check-out
 * @param {Date} checkIn - Check-in time
 * @param {Date} checkOut - Check-out time (can be null)
 * @param {Object} config - SalaryConfig instance
 * @returns {Object} { totalFine, missedMinutes, workingDay }
 */
const calculateFine = async (checkIn, checkOut, config) => {
  let totalFine = 0;
  let missedMinutes = 0;
  let workingDay = 1.0; // Default: full day

  if (!checkIn) {
    // No check-in = absent
    return { totalFine: 0, missedMinutes: 0, workingDay: 0 };
  }

  const checkInDate = moment(checkIn).startOf('day');
  const standardStart = config.getStandardStartTime(checkInDate.toDate());
  const standardEnd = config.getStandardEndTime(checkInDate.toDate());

  // Normalize check-in: if before 07:00, count as 07:00
  let actualCheckIn = moment(checkIn);
  if (actualCheckIn.isBefore(standardStart)) {
    actualCheckIn = moment(standardStart);
  }

  // Check-in late: after 08:00
  const lateStart = moment(standardStart).add(1, 'hour'); // 08:00
  if (actualCheckIn.isAfter(lateStart)) {
    const lateMinutes = actualCheckIn.diff(lateStart, 'minutes');
    missedMinutes += lateMinutes;
  }

  // Check-out early: before 17:00
  if (checkOut) {
    // Normalize check-out: if after 24:00, handle properly
    let actualCheckOut = moment(checkOut);
    if (actualCheckOut.hour() >= 24 || (actualCheckOut.hour() === 0 && actualCheckOut.minute() < 7)) {
      // If check-out is after midnight but before 07:00 next day, count as end of previous day
      actualCheckOut = moment(checkInDate).endOf('day');
    }

    if (actualCheckOut.isBefore(standardEnd)) {
      const earlyMinutes = standardEnd.diff(actualCheckOut, 'minutes');
      missedMinutes += earlyMinutes;
    }
  } else {
    // Missing check-out = lose whole day
    workingDay = 0;
    // Optional: add fine for missing check-out
    // totalFine += config.fine_per_15m * 4; // Example: 1 hour fine
  }

  // Critical rule: If total missed time > 2 hours (120 mins) -> working_day = 0
  if (missedMinutes > config.critical_missed_minutes) {
    workingDay = 0;
  }

  // Calculate fine: Round up to 15-minute blocks
  if (missedMinutes > 0) {
    const blocks = Math.ceil(missedMinutes / 15);
    totalFine = blocks * config.fine_per_15m;
  }

  return { totalFine, missedMinutes, workingDay };
};

/**
 * Calculate overtime hours and pay
 * @param {Date} checkIn - Check-in time
 * @param {Date} checkOut - Check-out time
 * @param {Boolean} isOTApproved - Whether OT is approved
 * @param {Object} config - SalaryConfig instance
 * @returns {Object} { otHours, otPay }
 */
const calculateOT = (checkIn, checkOut, isOTApproved, config) => {
  if (!isOTApproved || !checkIn || !checkOut) {
    return { otHours: 0, otPay: 0 };
  }

  const checkInMoment = moment(checkIn);
  const checkOutMoment = moment(checkOut);

  // Time from 18:00 - 19:00: Counts as working_day = 1, but ot_hours = 0
  // Time from 19:00 - 24:00: Calculate ot_hours (round down to hour)
  const otStartTime = moment(checkInMoment).startOf('day').hour(19).minute(0); // 19:00
  const dayEnd = moment(checkInMoment).startOf('day').hour(24).minute(0); // 24:00

  let otHours = 0;

  if (checkOutMoment.isAfter(otStartTime)) {
    // Calculate OT from 19:00 to check-out (or 24:00, whichever is earlier)
    const otEndTime = checkOutMoment.isBefore(dayEnd) ? checkOutMoment : dayEnd;
    const otMinutes = otEndTime.diff(otStartTime, 'minutes');
    // Round down to hour: e.g., 1h45m = 1h
    otHours = Math.floor(otMinutes / 60);
  }

  const otPay = otHours * config.ot_rate;

  return { otHours, otPay };
};

/**
 * Calculate valid working days from attendances
 * @param {Array} attendances - Array of Attendance documents
 * @returns {Number} Total valid working days
 */
const calculateWorkingDays = (attendances) => {
  let totalDays = 0;
  attendances.forEach(attendance => {
    // Use workingDay from fine calculation or default to 1.0
    // This will be calculated in the main function
    if (attendance.workingDay !== undefined) {
      totalDays += attendance.workingDay;
    }
  });
  return totalDays;
};

/**
 * Main function: Calculate monthly salary for a user
 * @param {String} userId - Employee ID (ObjectId or employeeId string)
 * @param {Number} month - Month (1-12)
 * @param {Number} year - Year (e.g., 2025)
 * @returns {Object} Salary calculation result
 */
const calculateMonthlySalary = async (userId, month, year) => {
  try {
    // 1. Find employee
    let employee;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      employee = await Employee.findById(userId);
    } else {
      employee = await Employee.findOne({ employeeId: userId });
    }

    if (!employee) {
      throw new Error('Employee not found');
    }

    // 2. Get salary config
    const config = await SalaryConfig.getDefaultConfig();

    // 3. Get basic salary (use baseSalary or salary)
    const basicSalary = employee.baseSalary || employee.salary || 0;
    if (basicSalary === 0) {
      throw new Error('Employee basic salary is not set');
    }

    // 4. Get attendances for the month
    const startDate = moment(`${year}-${String(month).padStart(2, '0')}-01`).startOf('day');
    const endDate = moment(startDate).endOf('month');

    const attendances = await Attendance.find({
      employee: employee._id,
      date: {
        $gte: startDate.toDate(),
        $lte: endDate.toDate()
      }
    }).sort({ date: 1 });

    // 5. Calculate fine, OT, and working days for each attendance
    let totalFines = 0;
    let totalOTPay = 0;
    let totalWorkingDays = 0;

    const attendanceDetails = [];

    for (const attendance of attendances) {
      const checkIn = attendance.checkIn?.time;
      const checkOut = attendance.checkOut?.time;
      const isOTApproved = attendance.is_ot_approved || false;

      // Calculate fine
      const fineResult = await calculateFine(checkIn, checkOut, config);
      totalFines += fineResult.totalFine;

      // Calculate OT
      const otResult = calculateOT(checkIn, checkOut, isOTApproved, config);
      totalOTPay += otResult.otPay;

      // Accumulate working days
      totalWorkingDays += fineResult.workingDay;

      attendanceDetails.push({
        date: attendance.date,
        checkIn: checkIn,
        checkOut: checkOut,
        fine: fineResult.totalFine,
        missedMinutes: fineResult.missedMinutes,
        workingDay: fineResult.workingDay,
        otHours: otResult.otHours,
        otPay: otResult.otPay,
        isOTApproved: isOTApproved
      });
    }

    // 6. Calculate salary components
    // Real_Work_Salary = (basic_salary / 28) * Total_Valid_Working_Days
    const dailyRate = basicSalary / config.standard_days;
    const realWorkSalary = dailyRate * totalWorkingDays;

    // Allowance = basic_salary * 0.1 (or employee.allowance_rate)
    const allowanceRate = employee.allowance_rate || 0.1;
    const allowance = basicSalary * allowanceRate;

    // Gross_Income = Real_Work_Salary + Total_OT_Pay + Allowance - Total_Fines
    const grossIncome = realWorkSalary + totalOTPay + allowance - totalFines;

    // Tax = Gross_Income * tax_rate
    const taxRate = employee.tax_rate || 0.05;
    const tax = grossIncome * taxRate;

    // Final_Net_Salary = Gross_Income - Tax
    const netSalary = grossIncome - tax;

    // 7. Return result
    return {
      employee: {
        _id: employee._id,
        name: employee.name,
        employeeId: employee.employeeId
      },
      period: {
        month,
        year,
        monthString: `${year}-${String(month).padStart(2, '0')}`
      },
      basicSalary,
      calculations: {
        dailyRate: Math.round(dailyRate),
        totalWorkingDays: Math.round(totalWorkingDays * 100) / 100, // Round to 2 decimals
        realWorkSalary: Math.round(realWorkSalary),
        allowance: Math.round(allowance),
        totalOTPay: Math.round(totalOTPay),
        totalFines: Math.round(totalFines),
        grossIncome: Math.round(grossIncome),
        tax: Math.round(tax),
        netSalary: Math.round(netSalary)
      },
      attendanceDetails,
      summary: {
        totalAttendances: attendances.length,
        totalWorkingDays: Math.round(totalWorkingDays * 100) / 100,
        totalOTHours: attendanceDetails.reduce((sum, d) => sum + d.otHours, 0),
        totalFines: Math.round(totalFines),
        finalSalary: Math.round(netSalary)
      }
    };
  } catch (error) {
    console.error('Error calculating monthly salary:', error);
    throw error;
  }
};

module.exports = {
  calculateMonthlySalary,
  calculateFine,
  calculateOT,
  calculateWorkingDays
};

