// backend/utils/timeMachine.js
// Server Time Travel - Allows testing with real ESP32 by controlling server time

let timeOffset = 0; // Độ lệch tính bằng milliseconds

/**
 * Hàm lấy giờ hiện tại (đã bị bẻ cong nếu đang test)
 * @returns {Date} - Current system time (real or virtual)
 */
const getSystemTime = () => {
  if (process.env.ENABLE_TEST_MODE !== 'true') {
    return new Date(); // Luôn trả về giờ thật nếu không phải chế độ test
  }
  return new Date(Date.now() + timeOffset);
};

/**
 * Hàm set giờ ảo (nhận vào thời gian muốn giả lập)
 * @param {String} targetDateString - ISO string hoặc date string: "2025-11-27T19:00:00.000Z"
 */
const setVirtualTime = (targetDateString) => {
  if (process.env.ENABLE_TEST_MODE !== 'true') {
    console.warn('⚠️ [TIME MACHINE] Test mode is disabled. Cannot set virtual time.');
    return;
  }
  
  const targetTime = new Date(targetDateString).getTime();
  const now = Date.now();
  timeOffset = targetTime - now; // Tính độ lệch
  
  console.log(`🕒 [TIME MACHINE] System time moved to: ${new Date(targetTime).toISOString()}`);
  console.log(`🕒 [TIME MACHINE] Offset: ${timeOffset}ms (${Math.round(timeOffset / 1000 / 60)} minutes)`);
};

/**
 * Reset về giờ thật
 */
const resetTime = () => {
  if (process.env.ENABLE_TEST_MODE !== 'true') {
    console.warn('⚠️ [TIME MACHINE] Test mode is disabled.');
    return;
  }
  
  timeOffset = 0;
  console.log(`🕒 [TIME MACHINE] System time reset to real time`);
};

/**
 * Lấy thông tin trạng thái time machine
 * @returns {Object} - Status information
 */
const getTimeStatus = () => {
  const isTestMode = process.env.ENABLE_TEST_MODE === 'true';
  const currentTime = getSystemTime();
  const realTime = new Date();
  
  return {
    testModeEnabled: isTestMode,
    currentTime: currentTime.toISOString(),
    realTime: realTime.toISOString(),
    offset: timeOffset,
    offsetMinutes: Math.round(timeOffset / 1000 / 60)
  };
};

module.exports = { 
  getSystemTime, 
  setVirtualTime, 
  resetTime,
  getTimeStatus
};

