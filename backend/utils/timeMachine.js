// backend/utils/timeMachine.js
// Server Time Travel - Allows testing with real ESP32 by controlling server time

let timeOffset = 0; // Độ lệch tính bằng milliseconds

/**
 * Hàm lấy giờ hiện tại (đã bị bẻ cong nếu đang có offset)
 * @returns {Date} - Current system time (real or virtual)
 */
const getSystemTime = () => {
  // LUÔN áp dụng offset nếu có (không cần ENABLE_TEST_MODE)
  if (timeOffset !== 0) {
    const virtualTime = new Date(Date.now() + timeOffset);
    // Chỉ log mỗi 10 giây để tránh spam
    const now = Date.now();
    if (!getSystemTime._lastLog || (now - getSystemTime._lastLog) > 10000) {
      console.log(`🕒 [TIME] Using virtual time: ${virtualTime.toISOString()}`);
      getSystemTime._lastLog = now;
    }
    return virtualTime;
  }
  return new Date();
};

/**
 * Hàm set giờ ảo (nhận vào thời gian muốn giả lập)
 * @param {Date|String} targetDate - Date object hoặc ISO string: "2025-11-27T19:00:00.000Z"
 */
const setVirtualTime = (targetDate) => {
  const targetTime = targetDate instanceof Date ? targetDate.getTime() : new Date(targetDate).getTime();
  const now = Date.now();
  timeOffset = targetTime - now; // Tính độ lệch
  
  console.log(`🕒 [TIME MACHINE] ========================================`);
  console.log(`🕒 [TIME MACHINE] System time moved to: ${new Date(targetTime).toISOString()}`);
  console.log(`🕒 [TIME MACHINE] Real time: ${new Date(now).toISOString()}`);
  console.log(`🕒 [TIME MACHINE] Offset: ${timeOffset}ms (${Math.round(timeOffset / 1000 / 60)} minutes)`);
  console.log(`🕒 [TIME MACHINE] ========================================`);
  
  return {
    success: true,
    virtualTime: new Date(targetTime).toISOString(),
    realTime: new Date(now).toISOString(),
    offsetMinutes: Math.round(timeOffset / 1000 / 60)
  };
};

/**
 * Reset về giờ thật
 */
const resetTime = () => {
  timeOffset = 0;
  console.log(`🕒 [TIME MACHINE] System time reset to real time: ${new Date().toISOString()}`);
  return {
    success: true,
    message: 'Time reset to real time',
    currentTime: new Date().toISOString()
  };
};

/**
 * Kiểm tra Time Machine có đang active không
 * @returns {Boolean} - true nếu đang dùng thời gian ảo
 */
const isTimeMachineActive = () => {
  return timeOffset !== 0;
};

/**
 * Lấy thông tin trạng thái time machine
 * @returns {Object} - Status information
 */
const getTimeStatus = () => {
  const currentTime = getSystemTime();
  const realTime = new Date();
  
  return {
    isActive: timeOffset !== 0,
    currentTime: currentTime.toISOString(),
    realTime: realTime.toISOString(),
    offset: timeOffset,
    offsetMinutes: Math.round(timeOffset / 1000 / 60)
  };
};

/**
 * Lấy offset hiện tại
 */
const getOffset = () => timeOffset;

module.exports = { 
  getSystemTime, 
  setVirtualTime, 
  resetTime,
  isTimeMachineActive,
  getTimeStatus,
  getOffset
};
