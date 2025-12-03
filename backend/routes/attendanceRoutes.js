const express = require('express');
const router = express.Router();

const attendanceController = require('../controllers/attendanceController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Public routes (ESP32)
router.post('/fingerprint', attendanceController.handleAttendance);
router.post('/add', attendanceController.addAttendance);

// Protected routes (frontend)
router.get('/employee/:employeeId', protect, attendanceController.getEmployeeAttendance);
router.get('/today', protect, attendanceController.getTodayAttendance);
router.get('/all', protect, attendanceController.getAllAttendance);
router.get('/', protect, attendanceController.getAllAttendance);

// Manual attendance (preview + save dùng chung endpoint này)
// ⚠️ SECURITY: Chỉ Manager mới được tạo dữ liệu giả lập (test mode)
router.post('/manual', protect, restrictTo('manager'), attendanceController.manualCheckIn);

// Update a single attendance record (for editing work hours)
router.put('/:id', protect, restrictTo('manager'), attendanceController.updateAttendance);

// Delete a single attendance record
router.delete('/:id', protect, restrictTo('manager'), attendanceController.deleteAttendance);

// Auto-completion manual trigger (for testing/admin use)
router.post('/auto-complete', protect, restrictTo('manager'), async (req, res) => {
  try {
    const autoCompletionService = require('../services/autoCompletionService');
    const result = await autoCompletionService.runAutoCompletion();
    
    res.status(200).json({
      success: true,
      message: 'Auto-completion completed successfully',
      data: result
    });
  } catch (error) {
    console.error('Error running manual auto-completion:', error);
    res.status(500).json({
      success: false,
      message: 'Error running auto-completion',
      error: error.message
    });
  }
});

// (Nếu muốn test xoá thì bật lại 2 cái dưới, còn không thì để comment)
//// router.delete('/today', protect, attendanceController.deleteTodayAttendance);
//// router.delete('/all', protect, attendanceController.deleteAllAttendance);

module.exports = router;
