const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

// Dashboard routes (protected)
router.get('/stats', protect, dashboardController.getDashboardStats);
router.get('/monthly-stats', protect, dashboardController.getMonthlyStats);

module.exports = router;


