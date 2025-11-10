<<<<<<< HEAD
const express = require('express');
const router = express.Router();
const {
  addEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  enrollFingerprint,
  completeProfile,
  getEmployeeLeaveBalance
} = require('../controllers/employeeController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', addEmployee);
router.get('/', getAllEmployees);
router.post('/enroll-fingerprint', enrollFingerprint);

// Specific routes must come before /:id route to avoid conflicts
router.post('/:employeeId/complete-profile', protect, completeProfile);
router.get('/:employeeId/leave-balance', protect, getEmployeeLeaveBalance);

// Generic routes
router.get('/:id', getEmployeeById);
router.put('/:id', updateEmployee);
router.delete('/:id', deleteEmployee);

module.exports = router;
=======
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
>>>>>>> 03f3fc8ca695fadb2e80e46e5549b7e9db5477cf
