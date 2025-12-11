// backend/utils/timeMachine.js
// Server Time Travel - Allows testing with real ESP32 by controlling server time
// Now persists to MongoDB for cross-instance sync

const TimeMachineState = require('../models/TimeMachineState');

// In-memory cache để giảm số lần query MongoDB
let cachedOffset = 0;
let lastCacheUpdate = 0;
const CACHE_TTL = 5000; // 5 seconds cache

/**
 * Lấy offset từ MongoDB (có cache)
 */
const getOffsetFromDB = async () => {
  const now = Date.now();

  // Nếu cache còn hạn, dùng cache
  if (now - lastCacheUpdate < CACHE_TTL && cachedOffset !== undefined) {
    return cachedOffset;
  }

  try {
    const state = await TimeMachineState.getState();
    cachedOffset = state.timeOffset || 0;
    lastCacheUpdate = now;
    return cachedOffset;
  } catch (error) {
    console.error('[TIME MACHINE] Error getting offset from DB:', error.message);
    // Fallback to cached value or 0
    return cachedOffset || 0;
  }
};

/**
 * Hàm lấy giờ hiện tại (đã bị bẻ cong nếu đang có offset)
 * @returns {Date} - Current system time (real or virtual)
 */
const getSystemTime = async () => {
  const offset = await getOffsetFromDB();

  if (offset !== 0) {
    const virtualTime = new Date(Date.now() + offset);
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
 * Hàm lấy giờ hiện tại - SYNC VERSION (dùng cached offset)
 * Dùng cho các controller cần gọi đồng bộ
 * @returns {Date} - Current system time (real or virtual)
 */
const getSystemTimeSync = () => {
  if (cachedOffset !== 0) {
    const virtualTime = new Date(Date.now() + cachedOffset);
    return virtualTime;
  }
  return new Date();
};

/**
 * Refresh cache từ database (gọi khi cần đảm bảo dữ liệu mới nhất)
 */
const refreshCache = async () => {
  try {
    const state = await TimeMachineState.getState();
    cachedOffset = state.timeOffset || 0;
    lastCacheUpdate = Date.now();
    console.log(`🕒 [TIME MACHINE] Cache refreshed. Offset: ${cachedOffset}ms`);
    return cachedOffset;
  } catch (error) {
    console.error('[TIME MACHINE] Error refreshing cache:', error.message);
    return cachedOffset || 0;
  }
};

/**
 * Hàm set giờ ảo (nhận vào thời gian muốn giả lập)
 * @param {Date|String} targetDate - Date object hoặc ISO string: "2025-11-27T19:00:00.000Z"
 * @param {String} setBy - Người đã set (email/username)
 */
const setVirtualTime = async (targetDate, setBy = 'Unknown') => {
  const targetTime = targetDate instanceof Date ? targetDate.getTime() : new Date(targetDate).getTime();
  const now = Date.now();
  const offset = targetTime - now; // Tính độ lệch

  console.log(`🕒 [TIME MACHINE] ========================================`);
  console.log(`🕒 [TIME MACHINE] System time moved to: ${new Date(targetTime).toISOString()}`);
  console.log(`🕒 [TIME MACHINE] Real time: ${new Date(now).toISOString()}`);
  console.log(`🕒 [TIME MACHINE] Offset: ${offset}ms (${Math.round(offset / 1000 / 60)} minutes)`);
  console.log(`🕒 [TIME MACHINE] Set by: ${setBy}`);
  console.log(`🕒 [TIME MACHINE] ========================================`);

  // Save to MongoDB
  try {
    await TimeMachineState.setOffset(offset, new Date(targetTime), setBy);

    // Update cache immediately
    cachedOffset = offset;
    lastCacheUpdate = Date.now();

    console.log(`🕒 [TIME MACHINE] ✅ Offset saved to MongoDB`);
  } catch (error) {
    console.error('[TIME MACHINE] Error saving offset to DB:', error.message);
    // Still update local cache
    cachedOffset = offset;
  }

  return {
    success: true,
    virtualTime: new Date(targetTime).toISOString(),
    realTime: new Date(now).toISOString(),
    offsetMinutes: Math.round(offset / 1000 / 60)
  };
};

/**
 * Reset về giờ thật
 */
const resetTime = async () => {
  console.log(`🕒 [TIME MACHINE] System time reset to real time: ${new Date().toISOString()}`);

  // Reset in MongoDB
  try {
    await TimeMachineState.resetOffset();

    // Update cache immediately
    cachedOffset = 0;
    lastCacheUpdate = Date.now();

    console.log(`🕒 [TIME MACHINE] ✅ Offset reset in MongoDB`);
  } catch (error) {
    console.error('[TIME MACHINE] Error resetting offset in DB:', error.message);
    cachedOffset = 0;
  }

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
const isTimeMachineActive = async () => {
  const offset = await getOffsetFromDB();
  return offset !== 0;
};

/**
 * Kiểm tra sync (dùng cached offset)
 */
const isTimeMachineActiveSync = () => {
  return cachedOffset !== 0;
};

/**
 * Lấy thông tin trạng thái time machine
 * @returns {Object} - Status information
 */
const getTimeStatus = async () => {
  const offset = await getOffsetFromDB();
  const currentTime = offset !== 0 ? new Date(Date.now() + offset) : new Date();
  const realTime = new Date();

  return {
    isActive: offset !== 0,
    currentTime: currentTime.toISOString(),
    realTime: realTime.toISOString(),
    offset: offset,
    offsetMinutes: Math.round(offset / 1000 / 60)
  };
};

/**
 * Lấy offset hiện tại (cached)
 */
const getOffset = () => cachedOffset;

/**
 * Lấy offset từ DB (async)
 */
const getOffsetAsync = async () => {
  return await getOffsetFromDB();
};

// Initialize: Load offset from DB on startup
const initializeTimeMachine = async () => {
  try {
    const state = await TimeMachineState.getState();
    cachedOffset = state.timeOffset || 0;
    lastCacheUpdate = Date.now();

    if (cachedOffset !== 0) {
      console.log(`🕒 [TIME MACHINE] Initialized with offset: ${cachedOffset}ms (${Math.round(cachedOffset / 1000 / 60)} minutes)`);
      console.log(`🕒 [TIME MACHINE] Virtual time: ${new Date(Date.now() + cachedOffset).toISOString()}`);
    } else {
      console.log(`🕒 [TIME MACHINE] Initialized with no offset (real time)`);
    }
  } catch (error) {
    console.error('[TIME MACHINE] Error initializing:', error.message);
    cachedOffset = 0;
  }
};

module.exports = {
  getSystemTime,
  getSystemTimeSync,
  setVirtualTime,
  resetTime,
  isTimeMachineActive,
  isTimeMachineActiveSync,
  getTimeStatus,
  getOffset,
  getOffsetAsync,
  refreshCache,
  initializeTimeMachine
};
