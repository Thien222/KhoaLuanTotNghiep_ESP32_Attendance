const express = require('express');
const router = express.Router();
const { setVirtualTime, resetTime, getSystemTime, getTimeStatus } = require('../utils/timeMachine');

/**
 * Middleware: Chỉ cho phép nếu đang bật chế độ Test
 */
const checkTestMode = (req, res, next) => {
  if (process.env.ENABLE_TEST_MODE !== 'true') {
    return res.status(403).json({ 
      success: false,
      message: 'Test mode is disabled. Set ENABLE_TEST_MODE=true to enable.',
      testModeEnabled: false
    });
  }
  next();
};

/**
 * POST /api/test/set-time
 * Set virtual time for testing
 * Body: { time: "2025-11-27T19:00:00.000Z" }
 */
router.post('/set-time', checkTestMode, (req, res) => {
  try {
    const { time } = req.body;
    
    if (!time) {
      return res.status(400).json({
        success: false,
        message: 'Time parameter is required. Format: ISO string (e.g., "2025-11-27T19:00:00.000Z")'
      });
    }
    
    setVirtualTime(time);
    const status = getTimeStatus();
    
    res.json({ 
      success: true, 
      message: 'Virtual time set successfully',
      currentTime: getSystemTime().toISOString(),
      status
    });
  } catch (error) {
    console.error('Error setting virtual time:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting virtual time',
      error: error.message
    });
  }
});

/**
 * POST /api/test/reset-time
 * Reset to real time
 */
router.post('/reset-time', checkTestMode, (req, res) => {
  try {
    resetTime();
    const status = getTimeStatus();
    
    res.json({ 
      success: true, 
      message: 'Time reset to real time',
      currentTime: getSystemTime().toISOString(),
      status
    });
  } catch (error) {
    console.error('Error resetting time:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting time',
      error: error.message
    });
  }
});

/**
 * GET /api/test/current-time
 * Get current system time (real or virtual)
 */
router.get('/current-time', checkTestMode, (req, res) => {
  try {
    const status = getTimeStatus();
    
    res.json({
      success: true,
      currentTime: getSystemTime().toISOString(),
      status
    });
  } catch (error) {
    console.error('Error getting current time:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting current time',
      error: error.message
    });
  }
});

module.exports = router;

