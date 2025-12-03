/**
 * ATTENDANCE HELPER - Strict Timeline Logic
 * Khung giờ làm việc: 08:00 - 17:00 (configurable)
 * Check-in: Trước startTime hợp lệ, >= startTime trễ ngay (KHÔNG CÓ GRACE PERIOD)
 * Phạt: Mỗi 15 phút trễ = 20k (configurable)
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
// DEFAULT CONSTANTS (Fallback khi không có Settings)
// =====================
const DEFAULT_WORK_START = '08:00';
const DEFAULT_WORK_END = '17:00';
const DEFAULT_CHECKIN_GATE_OPEN = '07:00';
// REMOVED: DEFAULT_CHECKIN_GATE_CLOSE - Không có grace period, gateClose = startTime
const DEFAULT_CHECKOUT_GATE_OPEN = '16:45';  // Trước 16:45 = về sớm
const DEFAULT_CHECKOUT_GATE_CLOSE = '18:00'; // Hết giờ checkout thường
const DEFAULT_OT_START = '18:00';
const DEFAULT_OT_END = '24:00';
const DEFAULT_OT_MIN_THRESHOLD = '19:00';    // Phải checkout >= 19:00 mới tính OT

// DEFAULT VALUES (sẽ được override bởi Settings từ database)
const DEFAULT_PENALTY_PER_15MIN = 20000;     // 20k mỗi 15 phút
const DEFAULT_PENALTY_INTERVAL = 15;         // Mỗi 15 phút
const DEFAULT_LOST_WORKDAY_THRESHOLD = 120;  // 2 tiếng = mất ngày công
const LOST_WORKDAY_THRESHOLD = DEFAULT_LOST_WORKDAY_THRESHOLD; // Alias for backward compatibility
const DEFAULT_OT_RATE_PER_HOUR = 100000;     // 100k/1 giờ OT

// =====================
// SETTINGS HELPER FUNCTIONS (Lấy giá trị từ Settings với fallback)
// =====================

/**
 * Get working hours (HARDCODED to 08:00-17:00)
 * @param {Object} settings - All settings object (ignored - hardcoded)
 * @returns {Object} { startTime, endTime }
 */
const getWorkingHours = (settings = {}) => {
  // HARDCODED: Giờ làm việc cố định 08:00-17:00
  return {
    startTime: DEFAULT_WORK_START, // 08:00
    endTime: DEFAULT_WORK_END       // 17:00
  };
};

/**
 * Get check-in gate times from settings
 * @param {Object} settings - All settings object
 * @returns {Object} { gateOpen, gateClose }
 */
const getCheckinGateTimes = (settings = {}) => {
  // HARDCODED: Giờ làm việc cố định 08:00-17:00
  // HARDCODED: Cổng mở từ 07:00 (1 giờ trước 08:00), không phụ thuộc vào bufferMinutes
  const workStart = DEFAULT_WORK_START; // Hardcoded 08:00
  const [startHour, startMin] = workStart.split(':').map(Number);
  const startMoment = moment().hour(startHour).minute(startMin);
  
  // HARDCODED: gateOpen luôn là 07:00 (1 giờ trước 08:00)
  const gateOpenMoment = moment().hour(7).minute(0);
  
  // BỎ GRACE PERIOD: gateClose = startTime (không cộng thêm)
  const gateCloseMoment = startMoment; // Không có grace period, trễ ngay từ phút đầu
  
  return {
    gateOpen: gateOpenMoment.format('HH:mm'), // Luôn là 07:00
    gateClose: gateCloseMoment.format('HH:mm') // = startTime (08:00)
  };
};

/**
 * Get check-out gate times from settings
 * @param {Object} settings - All settings object
 * @returns {Object} { gateOpen, gateClose }
 */
const getCheckoutGateTimes = (settings = {}) => {
  // HARDCODED: Giờ làm việc cố định 08:00-17:00
  const workEnd = DEFAULT_WORK_END; // Hardcoded 17:00
  
  const [endHour, endMin] = workEnd.split(':').map(Number);
  const endMoment = moment().hour(endHour).minute(endMin);
  const gateOpenMoment = endMoment.clone().subtract(15, 'minutes'); // Default 15 min before
  const gateCloseMoment = endMoment.clone().add(60, 'minutes'); // Default 1 hour after
  
  return {
    gateOpen: gateOpenMoment.format('HH:mm'),
    gateClose: gateCloseMoment.format('HH:mm')
  };
};

/**
 * Get OT times from settings
 * @param {Object} settings - All settings object
 * @returns {Object} { otStart, otEnd, otMinThreshold }
 */
const getOTTimes = (settings = {}) => {
  const workingHours = settings['working-hours'] || {};
  const otRate = settings['ot-rate'] || {};
  const overtime = settings['overtime'] || {};
  
  const workEnd = workingHours.endTime || DEFAULT_WORK_END;
  const [endHour, endMin] = workEnd.split(':').map(Number);
  const endMoment = moment().hour(endHour).minute(endMin);
  
  return {
    otStart: endMoment.format('HH:mm'), // OT bắt đầu từ giờ kết thúc làm việc
    otEnd: overtime.maxTime || DEFAULT_OT_END,
    otMinThreshold: otRate.startTime || DEFAULT_OT_MIN_THRESHOLD
  };
};

/**
 * Get late policy from settings
 * @param {Object} settings - All settings object
 * @returns {Object} { penaltyRate, penaltyInterval, lostWorkDayThreshold }
 */
const getLatePolicy = (settings = {}) => {
  const latePolicy = settings['late-policy'] || {};
  return {
    penaltyRate: latePolicy.penaltyRate || DEFAULT_PENALTY_PER_15MIN,
    penaltyInterval: latePolicy.penaltyInterval || DEFAULT_PENALTY_INTERVAL,
    lostWorkDayThreshold: latePolicy.lateThreshold2Hours || DEFAULT_LOST_WORKDAY_THRESHOLD
  };
};

/**
 * Get OT rate from settings
 * @param {Object} settings - All settings object
 * @returns {Number} OT rate per hour
 */
const getOTRate = (settings = {}) => {
  const otRate = settings['ot-rate'] || {};
  const overtime = settings['overtime'] || {};
  return otRate.ratePerHour || overtime.otRate || DEFAULT_OT_RATE_PER_HOUR;
};

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
 * @param {Date} checkInTime - Check-in time
 * @param {Object} settings - All settings object (optional)
 * @returns {Object} { valid: Boolean, message: String, blocked: Boolean }
 */
const validateCheckinTime = (checkInTime, settings = {}) => {
  const m = moment(checkInTime);
  const hour = m.hours();
  const mins = dateToMinutes(checkInTime);
  
  const gateTimes = getCheckinGateTimes(settings);
  const gateOpen = timeToMinutes(gateTimes.gateOpen);
  const gateClose = timeToMinutes(gateTimes.gateClose);
  
  // Block: Before gate open time (configurable, default 07:00)
  if (mins < gateOpen) {
    return { 
      valid: false, 
      blocked: true, 
      message: 'Chưa đến giờ chấm công',
      subMessage: `Cổng mở từ ${gateTimes.gateOpen}`
    };
  }
  
  // Hợp lệ: gateOpen đến startTime (KHÔNG CÓ GRACE PERIOD)
  // HARDCODED: Giờ làm việc cố định 08:00
  const workStart = DEFAULT_WORK_START; // Hardcoded 08:00
  const startTimeMins = timeToMinutes(workStart);
  
  if (mins >= gateOpen && mins <= startTimeMins) {
    return { 
      valid: true, 
      blocked: false, 
      lateMinutes: 0,
      message: 'Check-in thành công',
      subMessage: 'Đúng giờ'
    };
  }
  
  // Trễ: > startTime (KHÔNG CÓ GRACE PERIOD - TRỄ NGAY TỪ PHÚT ĐẦU)
  if (mins > startTimeMins) {
    const lateMinutes = mins - startTimeMins; // Tính từ startTime, không phải gateClose
    
    // Debug log
    console.log('🔍 [VALIDATE CHECK-IN] Late calculation:', {
      checkInTime: m.format('HH:mm'),
      startTime: workStart,
      startTimeMins,
      checkInMins: mins,
      lateMinutes,
      gateClose: gateTimes.gateClose,
      gateCloseMins: gateClose
    });
    
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
 * @param {Object} settings - All settings object (optional)
 * @returns {Object} { valid: Boolean, message: String, earlyMinutes: Number, isOTTime: Boolean }
 */
const validateCheckoutTime = (checkOutTime, hasApprovedOT = false, settings = {}) => {
  const m = moment(checkOutTime);
  const hour = m.hours();
  const mins = dateToMinutes(checkOutTime);
  
  const checkoutTimes = getCheckoutGateTimes(settings);
  const otTimes = getOTTimes(settings);
  const otSettings = settings['ot-rate'] || settings['overtime'] || {};
  
  const checkoutOpen = timeToMinutes(checkoutTimes.gateOpen);
  const checkoutClose = timeToMinutes(checkoutTimes.gateClose);
  const otStart = timeToMinutes(otTimes.otStart);
  const otMinThreshold = timeToMinutes(otTimes.otMinThreshold);
  
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
    const otRatePerHour = getOTRate(settings);
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
 * @param {Number} lateMinutes - Minutes late after startTime (KHÔNG CÓ GRACE PERIOD)
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
  
  // Debug log để kiểm tra Settings
  if (lateMinutes > 0) {
    console.log('🔍 [PENALTY CALC]', {
      lateMinutes,
      latePolicy,
      penaltyRate,
      penaltyInterval,
      usingDefault: !latePolicy.penaltyRate
    });
  }
  
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
 * @param {Number} dailyRate - Daily salary for lost workday calculation
 * @param {Object} settings - All settings object (optional)
 * @returns {Object} { penalty: Number, lostWorkDay: Boolean, message: String }
 */
const calculateEarlyPenalty = (checkOutTime, dailyRate = 0, settings = {}) => {
  const m = moment(checkOutTime);
  const mins = dateToMinutes(checkOutTime);
  const checkoutTimes = getCheckoutGateTimes(settings);
  const latePolicy = getLatePolicy(settings);
  const checkoutOpen = timeToMinutes(checkoutTimes.gateOpen);
  
  // Không về sớm
  if (mins >= checkoutOpen) {
    return { penalty: 0, earlyMinutes: 0, lostWorkDay: false };
  }
  
  const earlyMinutes = checkoutOpen - mins;
  
  // Lấy giá trị từ Settings (đã được xử lý trong getLatePolicy)
  const penaltyRate = latePolicy.penaltyRate;
  const penaltyInterval = latePolicy.penaltyInterval;
  const lostWorkDayThreshold = latePolicy.lostWorkDayThreshold;
  
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
 * @param {Date} checkInTime - Check-in time
 * @param {String} workStartTime - Work start time (optional, deprecated - use settings)
 * @param {Number} graceMinutes - Grace minutes (optional, deprecated - use settings)
 * @param {Object} settings - All settings object (optional)
 */
const calculateLateMinutes = (checkInTime, workStartTime = null, graceMinutes = 0, settings = {}) => {
  const checkIn = moment(checkInTime);
  const mins = dateToMinutes(checkInTime);
  
  // HARDCODED: Giờ làm việc cố định 08:00 (KHÔNG CÓ GRACE PERIOD)
  const workStart = workStartTime || DEFAULT_WORK_START; // Hardcoded 08:00 if not provided
  const startTimeMins = timeToMinutes(workStart);
  
  // Tính trễ từ startTime (không có grace period)
  if (mins > startTimeMins) {
    const lateMinutes = mins - startTimeMins;
    
    // Debug log
    console.log('🔍 [CALCULATE LATE MINUTES]', {
      checkInTime: checkIn.format('HH:mm'),
      workStart,
      startTimeMins,
      checkInMins: mins,
      lateMinutes,
      graceMinutes: 'IGNORED (no grace period)'
    });
    
    return lateMinutes;
  }
  
  return 0;
};

/**
 * Calculate overtime hours
 * Only counts full hours after threshold (step of 1 hour)
 * @param {Date} checkInTime - Check-in time
 * @param {Date} checkOutTime - Check-out time
 * @param {Number} standardWorkHours - Standard work hours (optional)
 * @param {Object} settings - All settings object (optional)
 */
const calculateOvertimeHours = (checkInTime, checkOutTime, standardWorkHours = 8, settings = {}) => {
  if (!checkInTime || !checkOutTime) return 0;
  
  const outMins = dateToMinutes(checkOutTime);
  const otTimes = getOTTimes(settings);
  const otMinThreshold = timeToMinutes(otTimes.otMinThreshold);
  const otStart = timeToMinutes(otTimes.otStart);
  
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
 * Convert Vietnamese text to ASCII (no accent) for ESP32 OLED display
 * Giữ nguyên chữ hoa/thường, chỉ bỏ dấu
 */
const removeVietnameseAccents = (str = '') => {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

/**
 * Build ESP32 response message
 */
const buildESP32Response = (employeeName, action, details = {}) => {
  const name = employeeName.split(' ').pop(); // Lấy tên cuối
  
  if (action === 'checkin') {
    const message = removeVietnameseAccents(`Xin chao ${name}`);
    let subMessage = 'Dung gio';
    
    if (details.lateMinutes > 0) {
      if (details.lostWorkDay) {
        subMessage = removeVietnameseAccents(`Tre ${details.lateMinutes}p - Mat cong`);
      } else {
        subMessage = removeVietnameseAccents(`Tre ${details.lateMinutes}p - Phat ${details.penalty / 1000}k`);
      }
    }
    
    return { message, sub_message: subMessage };
  }
  
  if (action === 'checkout') {
    const message = removeVietnameseAccents(`Tam biet ${name}`);
    let subMessage = 'Hen gap lai';
    
    if (details.earlyMinutes > 0) {
      if (details.lostWorkDay) {
        subMessage = removeVietnameseAccents(`Som ${details.earlyMinutes}p - Mat cong`);
      } else {
        subMessage = removeVietnameseAccents(`Som ${details.earlyMinutes}p - Phat ${details.penalty / 1000}k`);
      }
    } else if (details.otHours > 0) {
      subMessage = `OT: ${details.otHours}h - +${details.otSalary / 1000}k`;
    }
    
    return { message, sub_message: subMessage };
  }
  
  return { message: removeVietnameseAccents(`Xin chao ${name}`), sub_message: '' };
};

// Export all functions
module.exports = {
  // Helper for ESP32
  removeVietnameseAccents,
  // Constants (DEPRECATED: Use getWorkingHours, getCheckinGateTimes, etc. with settings instead)
  // Kept for backward compatibility
  WORK_START: DEFAULT_WORK_START,
  WORK_END: DEFAULT_WORK_END,
  CHECKIN_GATE_OPEN: DEFAULT_CHECKIN_GATE_OPEN,
  // REMOVED: CHECKIN_GATE_CLOSE - Không có grace period
  CHECKOUT_GATE_OPEN: DEFAULT_CHECKOUT_GATE_OPEN,
  CHECKOUT_GATE_CLOSE: DEFAULT_CHECKOUT_GATE_CLOSE,
  OT_START: DEFAULT_OT_START,
  OT_END: DEFAULT_OT_END,
  OT_MIN_THRESHOLD: DEFAULT_OT_MIN_THRESHOLD,
  DEFAULT_PENALTY_PER_15MIN,
  DEFAULT_OT_RATE_PER_HOUR,
  LOST_WORKDAY_THRESHOLD,
  
  // Settings Helper Functions (NEW - Use these with settings from getAllSettings)
  getWorkingHours,
  getCheckinGateTimes,
  getCheckoutGateTimes,
  getOTTimes,
  getLatePolicy,
  getOTRate,
  
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
