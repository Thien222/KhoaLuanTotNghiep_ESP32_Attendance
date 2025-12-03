const express = require('express');
const router = express.Router();
const terminatedEmployeeController = require('../controllers/terminatedEmployeeController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// All routes require authentication and manager role
router.use(protect);
router.use(restrictTo('admin', 'manager'));

// GET /api/terminated-employees - Lấy danh sách
router.get('/', terminatedEmployeeController.getAll);

// GET /api/terminated-employees/:id - Lấy chi tiết
router.get('/:id', terminatedEmployeeController.getById);

// POST /api/terminated-employees/terminate/:employeeId - Chuyển nhân viên sang nghỉ việc
router.post('/terminate/:employeeId', terminatedEmployeeController.terminateEmployee);

// PUT /api/terminated-employees/:id - Cập nhật thông tin
router.put('/:id', terminatedEmployeeController.update);

// DELETE /api/terminated-employees/:id - Xóa vĩnh viễn
router.delete('/:id', terminatedEmployeeController.deletePermanently);

module.exports = router;


