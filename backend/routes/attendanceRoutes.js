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
