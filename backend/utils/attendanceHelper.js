const Holiday = require('../models/Holiday');
const Settings = require('../models/Settings');
const moment = require('moment-timezone');

moment.tz.setDefault('Asia/Ho_Chi_Minh');

/**
 * Calculate late minutes
 * @param {Date} checkInTime - Actual check-in time
 * @param {String} workStartTime - Expected work start time (HH:mm format)
 * @param {Number} graceMinutes - Grace period in minutes
 * @returns {Number} - Minutes late (0 if on time)
 */
const calculateLateMinutes = (checkInTime, workStartTime = '08:00', graceMinutes = 15) => {
  const checkIn = moment(checkInTime);
  const [hour, minute] = workStartTime.split(':').map(Number);
  
  const workStart = moment(checkInTime).set({ hour, minute, second: 0, millisecond: 0 });
  const graceEnd = workStart.clone().add(graceMinutes, 'minutes');
  
  if (checkIn.isAfter(graceEnd)) {
    return Math.floor(checkIn.diff(graceEnd, 'minutes', true));
  }
  
  return 0;
};

/**
 * Calculate late penalty
 * @param {Number} lateMinutes - Minutes late
 * @param {Object} latePolicy - Late policy settings
 * @returns {Number} - Penalty amount in VND
 */
const calculateLatePenalty = (lateMinutes, latePolicy) => {
  if (!lateMinutes || lateMinutes <= 0) {
    return 0;
  }
  
  const { penaltyAfterGrace = 50000, penaltyPerMinute = 0 } = latePolicy || {};
  
  // Use flat penalty after grace period
  if (penaltyAfterGrace > 0) {
    return penaltyAfterGrace;
  }
  
  // Or use per-minute penalty
  return lateMinutes * penaltyPerMinute;
};

/**
 * Calculate overtime hours
 * @param {Date} checkInTime - Check-in time
 * @param {Date} checkOutTime - Check-out time
 * @param {Number} standardWorkHours - Standard work hours per day
 * @returns {Number} - Overtime hours
 */
const calculateOvertimeHours = (checkInTime, checkOutTime, standardWorkHours = 8) => {
  if (!checkInTime || !checkOutTime) {
    return 0;
  }
  
  const totalHours = moment(checkOutTime).diff(moment(checkInTime), 'hours', true);
  const overtimeHours = totalHours - standardWorkHours;
  
  return overtimeHours > 0 ? Math.round(overtimeHours * 100) / 100 : 0;
};

/**
 * Get overtime rate based on date and conditions
 * @param {Date} date - The date to check
 * @param {Boolean} isHoliday - Is it a holiday
 * @param {Object} overtimeSettings - Overtime settings
 * @returns {Number} - Overtime rate multiplier
 */
const getOvertimeRate = async (date, isHoliday = false, overtimeSettings = null) => {
  // If holiday, use holiday rate
  if (isHoliday) {
    return overtimeSettings?.holidayRate || 3.0;
  }
  
  // Check if weekend
  const dayOfWeek = moment(date).day();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  if (isWeekend) {
    return overtimeSettings?.weekendRate || 2.0;
  }
  
  // Regular weekday
  return overtimeSettings?.weekdayRate || 1.5;
};

/**
 * Check if a date is a holiday
 * @param {Date} date - The date to check
 * @returns {Promise<Object|null>} - Holiday object if found, null otherwise
 */
const isHoliday = async (date) => {
  try {
    const holiday = await Holiday.isHoliday(date);
    return holiday;
  } catch (error) {
    console.error('Error checking holiday:', error);
    return null;
  }
};

/**
 * Auto checkout for incomplete records
 * @param {Object} attendance - Attendance record
 * @param {Object} autoCheckoutSettings - Auto checkout settings
 * @returns {Object} - Updated attendance data
 */
const autoCheckout = (attendance, autoCheckoutSettings) => {
  const { enabled = false, defaultTime = '17:00' } = autoCheckoutSettings || {};
  
  if (!enabled || !attendance.checkIn || !attendance.checkIn.time) {
    return null;
  }
  
  // If already checked out, do nothing
  if (attendance.checkOut && attendance.checkOut.time) {
    return null;
  }
  
  const checkInDate = moment(attendance.checkIn.time);
  const [hour, minute] = defaultTime.split(':').map(Number);
  
  const autoCheckoutTime = checkInDate.clone().set({ hour, minute, second: 0, millisecond: 0 });
  
  return {
    time: autoCheckoutTime.toDate(),
    status: 'on-time',
    auto: true
  };
};

/**
 * Calculate working hours excluding lunch break
 * @param {Date} checkInTime - Check-in time
 * @param {Date} checkOutTime - Check-out time
 * @param {Object} lunchBreak - Lunch break config {start, end, duration}
 * @returns {Number} - Working hours
 */
const calculateWorkingHours = (checkInTime, checkOutTime, lunchBreak = null) => {
  if (!checkInTime || !checkOutTime) {
    return 0;
  }
  
  const totalHours = moment(checkOutTime).diff(moment(checkInTime), 'hours', true);
  
  // Subtract lunch break if applicable
  if (lunchBreak && lunchBreak.duration) {
    return Math.max(0, totalHours - lunchBreak.duration);
  }
  
  return totalHours;
};

/**
 * Get all settings at once
 * @returns {Promise<Object>} - All settings
 */
const getAllSettings = async () => {
  try {
    const settings = await Settings.find({});
    const settingsObj = {};
    
    settings.forEach(setting => {
      settingsObj[setting.type] = setting.config;
    });
    
    // If no settings found, return defaults
    if (Object.keys(settingsObj).length === 0) {
      return Settings.getDefaultSettings();
    }
    
    return settingsObj;
  } catch (error) {
    console.error('Error getting settings:', error);
    return Settings.getDefaultSettings();
  }
};

module.exports = {
  calculateLateMinutes,
  calculateLatePenalty,
  calculateOvertimeHours,
  getOvertimeRate,
  isHoliday,
  autoCheckout,
  calculateWorkingHours,
  getAllSettings
};


