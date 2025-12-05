const express = require('express');
const router = express.Router();
const {
  getAllShifts,
  getShiftById,
  createShift,
  updateShift,
  deleteShift,
  getEmployeeShift,
  assignShift,
  getEmployeeShifts,
  getShiftAssignments,
  getMyOTSchedule,
  deleteEmployeeShift
} = require('../controllers/shiftController');
const { protect } = require('../middleware/authMiddleware');

// All routes are protected
router.get('/', protect, getAllShifts);
router.get('/my-ot-schedule', protect, getMyOTSchedule); // Get my OT schedule (mobile)
router.get('/employee/:employeeId', protect, getEmployeeShift);
router.get('/assignments', protect, getShiftAssignments); // Get assignments for a specific date
router.get('/all-assignments', protect, getEmployeeShifts); // Get all assignments with filters
router.get('/:id', protect, getShiftById);
router.post('/', protect, createShift);
router.post('/assign', protect, assignShift);
router.put('/:id', protect, updateShift);
router.delete('/:id', protect, deleteShift);
router.delete('/assignment/:id', protect, deleteEmployeeShift); // Delete employee shift assignment

module.exports = router;




