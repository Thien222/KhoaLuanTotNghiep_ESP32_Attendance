const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Get payrolls with query params (month, year) - for frontend
router.get('/', protect, payrollController.getPayrolls);

// Admin-only routes
router.post('/calculate', protect, restrictTo('admin', 'manager'), payrollController.calculatePayroll);
router.post('/calculate-all', protect, restrictTo('admin', 'manager'), payrollController.calculatePayrollForAll);
router.put('/:id/approve', protect, restrictTo('admin', 'manager'), payrollController.approvePayroll);
router.put('/:id/paid', protect, restrictTo('admin', 'manager'), payrollController.markAsPaid);
router.post('/:id/adjust', protect, restrictTo('admin', 'manager'), payrollController.addManualAdjustment);

// Protected routes - employees can view their own payroll
router.get('/month/:month', protect, payrollController.getPayrollByMonth);
router.get('/employee/:employeeId', protect, payrollController.getEmployeePayroll);

module.exports = router;




