<<<<<<< HEAD
const express = require('express');
const router = express.Router();
const {
  addAttendance,
  handleAttendance,
  getEmployeeAttendance,
  getTodayAttendance,
  getAllAttendance,
  deleteTodayAttendance,
  deleteAllAttendance
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');

// Public routes (for ESP32)
router.post('/fingerprint', handleAttendance);
router.post('/add', addAttendance);

// Protected routes (for frontend)
router.get('/employee/:employeeId', protect, getEmployeeAttendance);
router.get('/today', protect, getTodayAttendance);
router.get('/all', protect, getAllAttendance); // Alias for backward compatibility
router.get('/', protect, getAllAttendance); // Main route for frontend - Get all attendance records with query params (MUST BE LAST)
router.delete('/today', protect, deleteTodayAttendance); // Delete today's attendance (for testing)
router.delete('/all', protect, deleteAllAttendance); // Delete all attendance records (for testing)

module.exports = router;
=======
const express = require('express');
const router = express.Router();
const {
  addAttendance,
  handleAttendance,
  getEmployeeAttendance,
  getTodayAttendance,
  getAllAttendance,
  deleteTodayAttendance,
  deleteAllAttendance
} = require('../controllers/attendanceController');

router.post('/add', addAttendance);
router.post('/fingerprint', handleAttendance);
router.get('/employee/:employeeId', getEmployeeAttendance);
router.get('/today', getTodayAttendance);
router.get('/all', getAllAttendance); // Get all attendance records
router.delete('/today', deleteTodayAttendance); // Delete today's attendance (for testing)
router.delete('/all', deleteAllAttendance); // Delete all attendance records (for testing)

module.exports = router;
>>>>>>> 03f3fc8ca695fadb2e80e46e5549b7e9db5477cf
