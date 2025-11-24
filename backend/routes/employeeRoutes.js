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
  getEmployeeLeaveBalance,
  getMyProfile,
  updateMyProfile
} = require('../controllers/employeeController');
const { protect, authenticate } = require('../middleware/authMiddleware');

router.post('/', addEmployee);
router.get('/', getAllEmployees);
router.post('/enroll-fingerprint', enrollFingerprint);

// Routes cho nhân viên tự cập nhật profile (phải đặt trước /:id)
router.get('/profile/me', authenticate, getMyProfile);
router.put('/profile/me', authenticate, updateMyProfile);
router.post('/profile/complete', authenticate, completeProfile);

// Specific routes must come before /:id route to avoid conflicts
router.post('/:employeeId/complete-profile', protect, completeProfile);
router.get('/:employeeId/leave-balance', protect, getEmployeeLeaveBalance);

// Generic routes
router.get('/:id', getEmployeeById);
router.put('/:id', updateEmployee);
router.delete('/:id', deleteEmployee);

module.exports = router;