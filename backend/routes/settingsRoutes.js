const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Protected routes - all users can view
// IMPORTANT: Query-based route (GET /?type=...) must come before param route (GET /:type)
router.get('/', protect, settingsController.getAllSettings);
// Param-based route for specific setting type
router.get('/:type', protect, settingsController.getSettingByType);

// Admin-only routes (support both admin and manager roles)
router.put('/', protect, restrictTo('admin', 'manager'), settingsController.updateSettingByBody);
router.put('/:type', protect, restrictTo('admin', 'manager'), settingsController.updateSetting);
router.post('/reset/:type?', protect, restrictTo('admin', 'manager'), settingsController.resetToDefault);
router.post('/initialize', protect, restrictTo('admin', 'manager'), settingsController.initializeSettings);

module.exports = router;



