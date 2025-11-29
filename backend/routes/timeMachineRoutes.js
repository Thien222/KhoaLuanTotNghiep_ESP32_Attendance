/**
 * TIME MACHINE ROUTES
 * API cho phép admin điều khiển thời gian hệ thống (Test mode)
 */

const express = require('express');
const router = express.Router();
const timeMachineController = require('../controllers/timeMachineController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// ⚠️ TẤT CẢ ROUTES ĐỀU CẦN MANAGER ROLE
// Middleware protect sẽ kiểm tra JWT token
// Middleware restrictTo('manager') sẽ kiểm tra role

/**
 * @route   GET /api/timemachine/status
 * @desc    Lấy trạng thái Time Machine
 * @access  Manager only
 */
router.get('/status', protect, restrictTo('manager'), timeMachineController.getStatus);

/**
 * @route   POST /api/timemachine/set
 * @desc    Set thời gian ảo
 * @access  Manager only
 * @body    { datetime: "2025-11-28T14:30:00" }
 */
router.post('/set', protect, restrictTo('manager'), timeMachineController.setTime);

/**
 * @route   POST /api/timemachine/reset
 * @desc    Reset về thời gian thật
 * @access  Manager only
 */
router.post('/reset', protect, restrictTo('manager'), timeMachineController.resetToRealTime);

/**
 * @route   POST /api/timemachine/fastforward
 * @desc    Tua nhanh thời gian
 * @access  Manager only
 * @body    { amount: 1, unit: 'hours' }
 */
router.post('/fastforward', protect, restrictTo('manager'), timeMachineController.fastForward);

/**
 * @route   POST /api/timemachine/scenario
 * @desc    Nhảy đến kịch bản test cụ thể
 * @access  Manager only
 * @body    { scenario: 'on-time' | 'late-15min' | 'late-2h' | ... }
 */
router.post('/scenario', protect, restrictTo('manager'), timeMachineController.jumpToScenario);

module.exports = router;

