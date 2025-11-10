const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Protected routes - all authenticated users
router.post('/apply', protect, leaveController.applyLeave); // Changed from '/' to '/apply'
router.post('/', protect, leaveController.applyLeave); // Keep '/' for backward compatibility
router.get('/', protect, leaveController.getAllLeaves);
router.get('/stats', protect, leaveController.getLeaveStats); // Changed from '/stats/:employeeId'
router.get('/stats/:employeeId', protect, leaveController.getLeaveStats); // Keep for backward compatibility
router.get('/:id', protect, leaveController.getLeaveById);
router.put('/:id', protect, leaveController.updateLeave);
router.delete('/:id', protect, leaveController.cancelLeave);

// Admin/Manager-only routes
router.put('/:id/review', protect, restrictTo('admin', 'manager'), leaveController.reviewLeave);

module.exports = router;




