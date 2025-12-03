// const express = require('express');
// const router = express.Router();
// const payrollController = require('../controllers/payrollController');
// const { protect, restrictTo } = require('../middleware/authMiddleware');

// // Get payrolls with query params (month, year) - for frontend
// router.get('/', protect, payrollController.getPayrolls);

// // Admin-only routes
// router.post('/calculate', protect, restrictTo('admin', 'manager'), payrollController.calculatePayroll);
// router.post('/calculate-all', protect, restrictTo('admin', 'manager'), payrollController.calculatePayrollForAll);
// router.put('/:id/approve', protect, restrictTo('admin', 'manager'), payrollController.approvePayroll);
// router.put('/:id/paid', protect, restrictTo('admin', 'manager'), payrollController.markAsPaid);
// router.post('/:id/adjust', protect, restrictTo('admin', 'manager'), payrollController.addManualAdjustment);

// // Protected routes - employees can view their own payroll
// router.get('/month/:month', protect, payrollController.getPayrollByMonth);
// router.get('/employee/:employeeId', protect, payrollController.getEmployeePayroll);

// // module.exports = router;
// backend/routes/payrollRoutes.js
const express = require('express');
const router = express.Router();

const payrollController = require('../controllers/payrollController');
// LƯU Ý: đường dẫn này phải giống hệt các route khác (attendance, leave, ...)
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { checkProfileCompleted } = require('../middleware/profileCheckMiddleware');

// ================== ROUTES ==================

// FE gọi: GET /api/payroll?month=11&year=2025
// -> listMonthly trong controller
// NOTE: Bỏ checkProfileCompleted vì xem lương không cần profile hoàn thiện
router.get('/', protect, payrollController.listMonthly);

// FE gọi: POST /api/payroll/calculate { month, year }
// -> tính lương (tạm thời chỉ return success) rồi FE tự gọi lại GET ở trên
router.post(
  '/calculate',
  protect,
  restrictTo('admin', 'manager'),   // nếu muốn bỏ check quyền thì xoá restrictTo
  payrollController.calculateMonthly
);

// FE gọi: POST /api/payroll/:id/adjust { type, amount, reason }
// -> thêm điều chỉnh thủ công
router.post(
  '/:id/adjust',
  protect,
  restrictTo('admin', 'manager'),
  payrollController.adjustPayroll
);

// FE gọi: DELETE /api/payroll/:id
// -> xóa bảng lương
router.delete(
  '/:id',
  protect,
  restrictTo('admin', 'manager'),
  payrollController.deletePayroll
);

module.exports = router;








