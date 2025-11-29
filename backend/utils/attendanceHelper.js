/**
 * ATTENDANCE HELPER - Strict Timeline Logic
 * Khung giờ làm việc: 08:00 - 17:00
 * Check-in: 07:00 - 08:15 hợp lệ, > 08:15 phạt 20k/15 phút
 * Check-out: < 16:45 về sớm (20k/15 phút), 16:45 - 18:00 hợp lệ
 * OT: 18:00 - 24:00, cần đơn duyệt, >= 19:00 tính 100k/h
 */

const Holiday = require('../models/Holiday');
const Settings = require('../models/Settings');
const OvertimeRequest = require('../models/OvertimeRequest');
const EmployeeShift = require('../models/EmployeeShift');
const moment = require('moment-timezone');

moment.tz.setDefault('Asia/Ho_Chi_Minh');

// =====================
// CONSTANTS (DEFAULTS - Sẽ được override bởi Settings)
// =====================
const WORK_START = '08:00';
const WORK_END = '17:00';
const CHECKIN_GATE_OPEN = '07:00';
const CHECKIN_GATE_CLOSE = '08:15';  // Sau 08:15 bắt đầu tính trễ
const CHECKOUT_GATE_OPEN = '16:45';  // Trước 16:45 = về sớm
const CHECKOUT_GATE_CLOSE = '18:00'; // Hết giờ checkout thường
const OT_START = '18:00';
const OT_END = '24:00';
const OT_MIN_THRESHOLD = '19:00';    // Phải checkout >= 19:00 mới tính OT

// DEFAULT VALUES (sẽ được override bởi Settings từ database)
const DEFAULT_PENALTY_PER_15MIN = 20000;     // 20k mỗi 15 phút
const DEFAULT_PENALTY_INTERVAL = 15;         // Mỗi 15 phút
const DEFAULT_LOST_WORKDAY_THRESHOLD = 120;  // 2 tiếng = mất ngày công
const DEFAULT_OT_RATE_PER_HOUR = 100000;     // 100k/1 giờ OT

/**
 * Parse time string to minutes from midnight
 */
const timeToMinutes = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Get current time as minutes from midnight
 */
const dateToMinutes = (date) => {
  const m = moment(date);
  return m.hours() * 60 + m.minutes();
};

/**
 * Validate Check-in time
 * @returns {Object} { valid: Boolean, message: String, blocked: Boolean }
 */
const validateCheckinTime = (checkInTime) => {
  const m = moment(checkInTime);
  const hour = m.hours();
  const mins = dateToMinutes(checkInTime);
  
  const gateOpen = timeToMinutes(CHECKIN_GATE_OPEN);   // 07:00 = 420
  const gateClose = timeToMinutes(CHECKIN_GATE_CLOSE); // 08:15 = 495
  
  // Block: < 07:00 hoặc >= 24:00 (0:00-6:59)
  if (hour < 7) {
    return { 
      valid: false, 
      blocked: true, 
      message: 'Chưa đến giờ chấm công',
      subMessage: 'Cổng mở từ 07:00'
    };
  }
  
  // Hợp lệ: 07:00 - 08:15
  if (mins >= gateOpen && mins <= gateClose) {
    return { 
      valid: true, 
      blocked: false, 
      lateMinutes: 0,
      message: 'Check-in thành công',
      subMessage: 'Đúng giờ'
    };
  }
  
  // Trễ: > 08:15
  if (mins > gateClose) {
    const lateMinutes = mins - gateClose;
    return { 
      valid: true, 
      blocked: false, 
      lateMinutes,
      message: 'Check-in thành công',
      subMessage: `Tre ${lateMinutes}p`
    };
  }
  
  return { valid: true, blocked: false, lateMinutes: 0 };
};

/**
 * Validate Check-out time
 * @param {Date} checkOutTime - Check-out time
 * @param {Boolean} hasApprovedOT - Whether employee has approved OT
 * @param {Object} otSettings - OT settings config (optional, for message display)
 * @returns {Object} { valid: Boolean, message: String, earlyMinutes: Number, isOTTime: Boolean }
 */
const validateCheckoutTime = (checkOutTime, hasApprovedOT = false, otSettings = {}) => {
  const m = moment(checkOutTime);
  const hour = m.hours();
  const mins = dateToMinutes(checkOutTime);
  
  const checkoutOpen = timeToMinutes(CHECKOUT_GATE_OPEN);  // 16:45 = 1005
  const checkoutClose = timeToMinutes(CHECKOUT_GATE_CLOSE); // 18:00 = 1080
  const otStart = timeToMinutes(OT_START);                 // 18:00 = 1080
  const otMinThreshold = timeToMinutes(OT_MIN_THRESHOLD);  // 19:00 = 1140
  
  // Block: 0:00 - 6:59 sáng
  if (hour >= 0 && hour < 7) {
    return { 
      valid: false, 
      blocked: true, 
      message: 'Ngoài giờ làm việc',
      subMessage: 'Quay lại sau 16:45'
    };
  }
  
  // Về sớm: < 16:45
  if (mins < checkoutOpen) {
    const earlyMinutes = checkoutOpen - mins;
    return { 
      valid: true, 
      blocked: false, 
      earlyMinutes,
      isOTTime: false,
      message: 'Check-out sớm',
      subMessage: `Som ${earlyMinutes}p`
    };
  }
  
  // Hợp lệ thường: 16:45 - 18:00
  if (mins >= checkoutOpen && mins < otStart) {
    return { 
      valid: true, 
      blocked: false, 
      earlyMinutes: 0,
      isOTTime: false,
      message: 'Check-out thành công',
      subMessage: 'Dung gio'
    };
  }
  
  // Sau 18:00 - Thời gian OT
  if (mins >= otStart) {
    // Không có OT approved -> Block
    if (!hasApprovedOT) {
      return { 
        valid: false, 
        blocked: true, 
        message: 'Không có OT',
        subMessage: 'Chua dang ky OT',
        isOTTime: true
      };
    }
    
    // Có OT nhưng < 19:00 -> Không tính tiền OT
    if (mins < otMinThreshold) {
      return { 
        valid: true, 
        blocked: false, 
        earlyMinutes: 0,
        isOTTime: true,
        otHours: 0,
        message: 'Check-out OT',
        subMessage: 'OT < 1h - Khong tinh tien'
      };
    }
    
    // Có OT và >= 19:00 -> Tính tiền OT
    const otMinutes = mins - otStart; // Từ 18:00
    const otHours = Math.floor(otMinutes / 60); // Bước nhảy 1 giờ
    
    // Lấy OT rate từ settings để hiển thị message
    const otRatePerHour = otSettings.ratePerHour || otSettings.otRate || DEFAULT_OT_RATE_PER_HOUR;
    const otSalary = otHours * otRatePerHour;
    
    return { 
      valid: true, 
      blocked: false, 
      earlyMinutes: 0,
      isOTTime: true,
      otHours,
      message: 'Check-out OT',
      subMessage: `OT: ${otHours}h = +${(otSalary / 1000)}k`
    };
  }
  
  return { valid: true, blocked: false, earlyMinutes: 0 };
};

/**
 * Calculate late penalty
 * @param {Number} lateMinutes - Minutes late after 08:15
 * @param {Object} latePolicy - Late policy config from Settings (optional)
 * @param {Number} dailyRate - Daily salary for lost workday calculation
 * @returns {Object} { penalty: Number, lostWorkDay: Boolean, message: String }
 */
const calculateLatePenalty = (lateMinutes, latePolicy = {}, dailyRate = 0) => {
  if (!lateMinutes || lateMinutes <= 0) {
    return { penalty: 0, lostWorkDay: false, penaltyBlocks: 0 };
  }
  
  // Lấy giá trị từ Settings (nếu có), nếu không dùng default
  const penaltyRate = latePolicy.penaltyRate || DEFAULT_PENALTY_PER_15MIN;
  const penaltyInterval = latePolicy.penaltyInterval || DEFAULT_PENALTY_INTERVAL;
  const lostWorkDayThreshold = latePolicy.lateThreshold2Hours || DEFAULT_LOST_WORKDAY_THRESHOLD;
  
  // Mất ngày công nếu trễ >= threshold (mặc định 2 tiếng)
  if (lateMinutes >= lostWorkDayThreshold) {
    return { 
      penalty: dailyRate, 
      lostWorkDay: true,
      penaltyBlocks: 0,
      message: `Tre >= ${Math.floor(lostWorkDayThreshold / 60)}h - Mat ngay cong`
    };
  }
  
  // Tính phạt: mỗi interval phút = penaltyRate
  const penaltyBlocks = Math.ceil(lateMinutes / penaltyInterval);
  const penalty = penaltyBlocks * penaltyRate;
  
  return { 
    penalty, 
    lostWorkDay: false,
    penaltyBlocks,
    message: `Tre ${lateMinutes}p - Phat ${penalty / 1000}k`
  };
};

/**
 * Calculate early checkout penalty
 * @param {Date} checkOutTime - Check-out time
 * @param {String} workEndTime - Work end time (default: '16:45')
 * @param {Number} graceMinutes - Grace period (default: 0)
 * @param {Number} dailyRate - Daily salary for lost workday calculation
 * @param {Object} latePolicy - Late policy config from Settings (optional, dùng chung với late penalty)
 * @returns {Object} { penalty: Number, lostWorkDay: Boolean, message: String }
 */
const calculateEarlyPenalty = (checkOutTime, workEndTime = '16:45', graceMinutes = 0, dailyRate = 0, latePolicy = {}) => {
  const m = moment(checkOutTime);
  const mins = dateToMinutes(checkOutTime);
  const checkoutOpen = timeToMinutes(CHECKOUT_GATE_OPEN); // 16:45
  
  // Không về sớm
  if (mins >= checkoutOpen) {
    return { penalty: 0, earlyMinutes: 0, lostWorkDay: false };
  }
  
  const earlyMinutes = checkoutOpen - mins;
  
  // Lấy giá trị từ Settings (nếu có), nếu không dùng default
  const penaltyRate = latePolicy.penaltyRate || DEFAULT_PENALTY_PER_15MIN;
  const penaltyInterval = latePolicy.penaltyInterval || DEFAULT_PENALTY_INTERVAL;
  const lostWorkDayThreshold = latePolicy.lateThreshold2Hours || DEFAULT_LOST_WORKDAY_THRESHOLD;
  
  // Mất ngày công nếu về sớm >= threshold (mặc định 2 tiếng)
  if (earlyMinutes >= lostWorkDayThreshold) {
    return { 
      penalty: dailyRate, 
      earlyMinutes,
      lostWorkDay: true,
      message: `Ve som >= ${Math.floor(lostWorkDayThreshold / 60)}h - Mat ngay cong`
    };
  }
  
  // Tính phạt: mỗi interval phút = penaltyRate
  const penaltyBlocks = Math.ceil(earlyMinutes / penaltyInterval);
  const penalty = penaltyBlocks * penaltyRate;
  
  return { 
    penalty, 
    earlyMinutes,
    lostWorkDay: false,
    penaltyBlocks,
    message: `Ve som ${earlyMinutes}p - Phat ${penalty / 1000}k`
  };
};

/**
 * Calculate late minutes (simple version for backwards compatibility)
 */
const calculateLateMinutes = (checkInTime, workStartTime = '08:15', graceMinutes = 0) => {
  const checkIn = moment(checkInTime);
  const mins = dateToMinutes(checkInTime);
  const gateClose = timeToMinutes(CHECKIN_GATE_CLOSE); // 08:15
  
  if (mins > gateClose) {
    return mins - gateClose;
  }
  
  return 0;
};

/**
 * Calculate overtime hours
 * Only counts full hours after 19:00 (step of 1 hour)
 */
const calculateOvertimeHours = (checkInTime, checkOutTime, standardWorkHours = 8) => {
  if (!checkInTime || !checkOutTime) return 0;
  
  const outMins = dateToMinutes(checkOutTime);
  const otMinThreshold = timeToMinutes(OT_MIN_THRESHOLD); // 19:00
  const otStart = timeToMinutes(OT_START); // 18:00
  
  // Nếu checkout trước 19:00, không tính OT
  if (outMins < otMinThreshold) return 0;
  
  // Tính giờ OT từ 18:00, bước nhảy 1 giờ
  const otMinutes = outMins - otStart;
  return Math.floor(otMinutes / 60);
};

/**
 * Calculate OT salary with multiplier (weekday/weekend/holiday)
 * @param {Number} otHours - Overtime hours
 * @param {Object} otSettings - OT settings config (optional)
 * @param {Date|String} date - Date to determine multiplier (optional)
 * @param {Boolean} isHoliday - Whether the date is a holiday (optional)
 * @param {Number} multiplier - Direct multiplier (1.5, 2.0, 3.0) - if provided, will use this instead of calculating
 * @returns {Number} OT salary in VND
 */
const calculateOTSalary = async (otHours, otSettings = {}, date = null, isHoliday = false, multiplier = null) => {
  if (!otHours || otHours <= 0) return 0;
  
  // Lấy base OT rate từ settings (có thể từ ot-rate hoặc overtime config)
  const baseRatePerHour = otSettings.ratePerHour || otSettings.otRate || DEFAULT_OT_RATE_PER_HOUR;
  
  // Tính multiplier (hệ số) dựa trên ngày
  let finalMultiplier = multiplier;
  
  if (finalMultiplier === null || finalMultiplier === undefined) {
    // Nếu không có multiplier trực tiếp, tính từ date
    if (date) {
      finalMultiplier = await getOvertimeRate(date, isHoliday, otSettings);
    } else {
      // Fallback: dùng weekday rate (1.5) nếu không có date
      finalMultiplier = otSettings.weekdayRate || 1.5;
    }
  }
  
  // Chỉ tính từ >= 1h (bước nhảy 1 giờ)
  const countableHours = Math.floor(otHours);
  
  // Tính lương: baseRate × multiplier
  const finalRatePerHour = baseRatePerHour * finalMultiplier;
  
  return Math.round(countableHours * finalRatePerHour);
};

/**
 * Get overtime rate multiplier based on date
 * @param {Date|String} date - Date to check
 * @param {Boolean} isHolidayFlag - Whether the date is a holiday
 * @param {Object} overtimeSettings - Overtime settings config (from 'overtime' or 'ot-rate' type)
 * @returns {Number} Multiplier (1.5 for weekday, 2.0 for weekend, 3.0 for holiday)
 */
const getOvertimeRate = async (date, isHolidayFlag = false, overtimeSettings = null) => {
  const config = overtimeSettings || {};
  
  // Ngày lễ: hệ số 3.0
  if (isHolidayFlag) {
    return Number(config.holidayRate) || 3.0;
  }
  
  // Kiểm tra cuối tuần
  const dayOfWeek = moment(date).day();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 0 = Chủ nhật, 6 = Thứ 7
  
  if (isWeekend) {
    // Cuối tuần: hệ số 2.0
    return Number(config.weekendRate) || 2.0;
  }
  
  // Ngày thường: hệ số 1.5
  return Number(config.weekdayRate) || 1.5;
};

/**
 * Check if a date is a holiday
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
 * Calculate working hours
 */
const calculateWorkingHours = (checkInTime, checkOutTime, lunchBreak = null) => {
  if (!checkInTime || !checkOutTime) return 0;
  
  const totalHours = moment(checkOutTime).diff(moment(checkInTime), 'hours', true);
  
  if (lunchBreak && lunchBreak.duration) {
    return Math.max(0, totalHours - lunchBreak.duration);
  }
  
  return Math.max(0, totalHours);
};

/**
 * Auto checkout for incomplete records
 */
const autoCheckout = (attendance, autoCheckoutSettings) => {
  const { enabled = false, defaultTime = '17:00', forgotCheckoutPenalty = 100000 } = autoCheckoutSettings || {};
  
  if (!enabled || !attendance.checkIn || !attendance.checkIn.time) {
    return null;
  }
  
  if (attendance.checkOut && attendance.checkOut.time) {
    return null;
  }
  
  const checkInDate = moment(attendance.checkIn.time);
  const [hour, minute] = defaultTime.split(':').map(Number);
  
  const autoCheckoutTime = checkInDate.clone().set({ hour, minute, second: 0, millisecond: 0 });
  
  return {
    time: autoCheckoutTime.toDate(),
    status: 'absent',
    auto: true,
    workingHours: 0,
    forgotCheckoutPenalty: forgotCheckoutPenalty,
    incompleteCheckout: true
  };
};

/**
 * Get all settings
 */
const getAllSettings = async () => {
  try {
    const settings = await Settings.find({});
    const settingsObj = {};
    
    settings.forEach(setting => {
      settingsObj[setting.type] = setting.config;
    });
    
    if (Object.keys(settingsObj).length === 0) {
      return Settings.getDefaultSettings ? Settings.getDefaultSettings() : {};
    }
    
    return settingsObj;
  } catch (error) {
    console.error('Error getting settings:', error);
    return {};
  }
};

/**
 * Check if employee has approved OT for date
 */
const hasOvertimeShiftForDate = async (employeeId, date) => {
  try {
    const startOfDay = moment(date).startOf('day').toDate();
    const endOfDay = moment(date).endOf('day').toDate();
    
    // Check approved OT request
    const approvedOTRequest = await OvertimeRequest.findOne({
      employee: employeeId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: 'approved'
    });
    
    if (approvedOTRequest) {
      console.log(`✅ Found approved OT request for employee ${employeeId} on ${moment(date).format('YYYY-MM-DD')}`);
      return true;
    }
    
    // Check OT shift assignment
    const overtimeShift = await EmployeeShift.findOne({
      employee: employeeId,
      startDate: { $lte: endOfDay },
      $or: [
        { endDate: null },
        { endDate: { $gte: startOfDay } }
      ],
      isActive: true,
      isOvertimeShift: true
    });
    
    if (overtimeShift) {
      console.log(`✅ Found OT shift for employee ${employeeId}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking OT shift:', error);
    return false;
  }
};

/**
 * Build ESP32 response message
 */
const buildESP32Response = (employeeName, action, details = {}) => {
  const name = employeeName.split(' ').pop(); // Lấy tên cuối
  
  if (action === 'checkin') {
    const message = `Xin chao ${name}`;
    let subMessage = 'Dung gio';
    
    if (details.lateMinutes > 0) {
      if (details.lostWorkDay) {
        subMessage = `Tre ${details.lateMinutes}p - Mat cong`;
      } else {
        subMessage = `Tre ${details.lateMinutes}p - Phat ${details.penalty / 1000}k`;
      }
    }
    
    return { message, sub_message: subMessage };
  }
  
  if (action === 'checkout') {
    const message = `Tam biet ${name}`;
    let subMessage = 'Hen gap lai';
    
    if (details.earlyMinutes > 0) {
      if (details.lostWorkDay) {
        subMessage = `Som ${details.earlyMinutes}p - Mat cong`;
      } else {
        subMessage = `Som ${details.earlyMinutes}p - Phat ${details.penalty / 1000}k`;
      }
    } else if (details.otHours > 0) {
      subMessage = `OT: ${details.otHours}h - +${details.otSalary / 1000}k`;
    }
    
    return { message, sub_message: subMessage };
  }
  
  return { message: `Xin chao ${name}`, sub_message: '' };
};

// Export all functions
module.exports = {
  // Constants
  WORK_START,
  WORK_END,
  CHECKIN_GATE_OPEN,
  CHECKIN_GATE_CLOSE,
  CHECKOUT_GATE_OPEN,
  CHECKOUT_GATE_CLOSE,
  OT_START,
  OT_END,
  OT_MIN_THRESHOLD,
  // DEPRECATED: Use settings from database instead
  // PENALTY_PER_15MIN,
  // OT_RATE_PER_HOUR,
  DEFAULT_PENALTY_PER_15MIN,
  DEFAULT_OT_RATE_PER_HOUR,
  LOST_WORKDAY_THRESHOLD,
  
  // Validators
  validateCheckinTime,
  validateCheckoutTime,
  
  // Calculations
  calculateLateMinutes,
  calculateLatePenalty,
  calculateEarlyPenalty,
  calculateOvertimeHours,
  calculateOTSalary,
  calculateWorkingHours,
  getOvertimeRate,
  
  // Utilities
  isHoliday,
  autoCheckout,
  getAllSettings,
  hasOvertimeShiftForDate,
  buildESP32Response,
  
  // Helpers
  timeToMinutes,
  dateToMinutes
};
