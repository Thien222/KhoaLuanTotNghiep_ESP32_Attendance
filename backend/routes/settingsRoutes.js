const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Protected routes - all users can view
router.get('/', protect, settingsController.getAllSettings);
router.get('/:type', protect, settingsController.getSettingByType);

// Admin-only routes
router.put('/:type', protect, restrictTo('admin'), settingsController.updateSetting);
router.post('/reset/:type?', protect, restrictTo('admin'), settingsController.resetToDefault);
router.post('/initialize', protect, restrictTo('admin'), settingsController.initializeSettings);

module.exports = router;



