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
  getEmployeeShifts
} = require('../controllers/shiftController');
const { protect } = require('../middleware/authMiddleware');

// All routes are protected
router.get('/', protect, getAllShifts);
router.get('/employee/:employeeId', protect, getEmployeeShift);
router.get('/assignments', protect, getEmployeeShifts);
router.get('/:id', protect, getShiftById);
router.post('/', protect, createShift);
router.post('/assign', protect, assignShift);
router.put('/:id', protect, updateShift);
router.delete('/:id', protect, deleteShift);

module.exports = router;




