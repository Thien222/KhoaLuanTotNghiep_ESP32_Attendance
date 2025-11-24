const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { checkProfileCompleted } = require('../middleware/profileCheckMiddleware');

// Protected routes - all authenticated users
// Apply profile check for employee routes
router.post('/apply', protect, checkProfileCompleted, leaveController.applyLeave); // Changed from '/' to '/apply'
router.post('/', protect, checkProfileCompleted, leaveController.applyLeave); // Keep '/' for backward compatibility
router.get('/', protect, leaveController.getAllLeaves);
router.get('/stats', protect, leaveController.getLeaveStats); // Changed from '/stats/:employeeId'
router.get('/stats/:employeeId', protect, leaveController.getLeaveStats); // Keep for backward compatibility
router.get('/:id', protect, leaveController.getLeaveById);
router.put('/:id', protect, checkProfileCompleted, leaveController.updateLeave);
router.delete('/:id', protect, checkProfileCompleted, leaveController.cancelLeave);

// Admin/Manager-only routes
router.put('/:id/review', protect, restrictTo('admin', 'manager'), leaveController.reviewLeave);

module.exports = router;











