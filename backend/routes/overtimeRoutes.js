const express = require('express');
const router = express.Router();
const overtimeController = require('../controllers/overtimeController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Employee routes
router.post('/request', protect, overtimeController.createOTRequest);
router.get('/my-requests', protect, overtimeController.getMyOTRequests);
router.delete('/request/:id', protect, overtimeController.cancelOTRequest);
router.get('/preview/:date', protect, overtimeController.previewOTTimeframe); // NEW: Preview OT timeframe from shift

// Admin routes
router.get('/pending', protect, restrictTo('manager'), overtimeController.getPendingOTRequests);
router.get('/all', protect, restrictTo('manager'), overtimeController.getAllOTRequests);
router.put('/approve/:id', protect, restrictTo('manager'), overtimeController.approveOTRequest);
router.put('/reject/:id', protect, restrictTo('manager'), overtimeController.rejectOTRequest);

// Check if employee has approved OT for a date
router.get('/check/:employeeId/:date', protect, overtimeController.checkOTApproval);

module.exports = router;

