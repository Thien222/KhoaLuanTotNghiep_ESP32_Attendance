const express = require('express');
const router = express.Router();
const {
  addEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  enrollFingerprint
} = require('../controllers/employeeController');

router.post('/', addEmployee);
router.get('/', getAllEmployees);
router.get('/:id', getEmployeeById);
router.put('/:id', updateEmployee);
router.delete('/:id', deleteEmployee);
router.post('/enroll-fingerprint', enrollFingerprint);

module.exports = router;
