const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getProfile,
  changePassword
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/profile', protect, getProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;