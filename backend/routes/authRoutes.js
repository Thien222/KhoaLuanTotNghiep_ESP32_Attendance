const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getProfile,
  changePassword
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/profile', authenticate, getProfile);
router.put('/change-password', authenticate, changePassword);

module.exports = router;


