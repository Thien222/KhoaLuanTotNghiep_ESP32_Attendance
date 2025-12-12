const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getProfile,
  changePassword,
  getAllAccounts,
  updateAccount,
  resetAccountPassword
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/profile', protect, getProfile);
router.put('/change-password', protect, changePassword);

// Account management routes (Admin only)
router.get('/accounts', protect, getAllAccounts);
router.put('/accounts/:id', protect, updateAccount);
router.put('/accounts/:id/reset-password', protect, resetAccountPassword);

module.exports = router;