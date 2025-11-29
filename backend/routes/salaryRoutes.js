const express = require('express');
const router = express.Router();
const { calculateSalary, getSalaryHistory, getEmployeesWithSalary } = require('../controllers/salaryController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// POST /api/salary/calculate - Calculate monthly salary
router.post('/calculate', calculateSalary);

// GET /api/salary/history - Get salary history
router.get('/history', getSalaryHistory);

// GET /api/salary/employees - Get list of employees with salary info
router.get('/employees', getEmployeesWithSalary);

module.exports = router;

