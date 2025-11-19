const express = require('express');
const router = express.Router();
const holidayController = require('../controllers/holidayController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Public routes (employees can view holidays)
router.get('/', protect, holidayController.getHolidays);
router.get('/check', protect, holidayController.checkIsHoliday);
router.get('/:id', protect, holidayController.getHoliday);

// Admin only routes
router.post('/', protect, restrictTo('admin', 'manager'), holidayController.addHoliday);
router.put('/:id', protect, restrictTo('admin', 'manager'), holidayController.updateHoliday);
router.delete('/:id', protect, restrictTo('admin', 'manager'), holidayController.deleteHoliday);

module.exports = router;


