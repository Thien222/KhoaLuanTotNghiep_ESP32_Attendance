const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const { calculateMonthlySalary } = require('../utils/salaryCalculator');
const moment = require('moment-timezone');

moment.tz.setDefault('Asia/Ho_Chi_Minh');

/**
 * Chuyển đổi month string "YYYY-MM" thành {year, month}
 */
function parseMonthString(str) {
  const [y, m] = String(str).split('-');
  return {
    year: Number(y) || new Date().getFullYear(),
    month: Number(m) || (new Date().getMonth() + 1)
  };
}

/**
 * GET /api/payroll?month=11&year=2025
 * Lấy danh sách bảng lương theo tháng
 */
exports.listMonthly = async (req, res) => {
  try {
    const now = new Date();
    const year = Number(req.query.year || now.getFullYear());
    const month = Number(req.query.month || (now.getMonth() + 1));
    const user = req.user;

    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    console.log('>>> /api/payroll listMonthly', { year, month, monthStr });

    const filter = { month: monthStr };

    // Nếu là nhân viên, chỉ xem được lương của chính mình
    if (user && user.role === 'employee' && user.employee) {
      filter.employee = user.employee._id || user.employee;
    }

    const docs = await Payroll.find(filter)
      .populate('employee', 'name employeeId position department email contractType salary baseSalary')
      .sort({ createdAt: -1 })
      .lean();

    console.log('Payroll docs found:', docs.length);

    const data = docs.map(doc => {
      const parsed = parseMonthString(doc.month);
      const employee = doc.employee || {};

      return {
        _id: String(doc._id),
        employee: {
          _id: employee._id,
          name: employee.name || '',
          employeeId: employee.employeeId || '',
          position: employee.position || '',
          department: employee.department || '',
          // Include baseSalary from employee for reference
          baseSalary: employee.baseSalary || employee.salary || 0
        },
        month: parsed.month,
        year: parsed.year,
        monthStr: doc.month,

        // NEW: Lương cơ bản THÁNG (do admin set) - Hiển thị trên bảng lương
        basicSalaryFull: doc.basicSalaryFull || employee.baseSalary || employee.salary || 0,
        // Lương tính theo ngày công (prorated)
        baseSalary: doc.baseSalary || doc.basicSalary || 0,
        proratedSalary: doc.baseSalary || doc.basicSalary || 0, // Alias for mobile
        // Lương 1 ngày công
        dailyRate: doc.dailyRate || Math.round((employee.baseSalary || employee.salary || 0) / 26),
        
        // Phụ cấp - Đảm bảo trả về đầy đủ
        generalAllowance: doc.generalAllowance || Math.round((doc.basicSalaryFull || employee.baseSalary || employee.salary || 0) * 0.05),
        allowance: doc.generalAllowance || Math.round((doc.basicSalaryFull || employee.baseSalary || employee.salary || 0) * 0.05), // Alias
        seniorityAllowance: doc.seniorityAllowance || 0,
        positionAllowance: doc.positionAllowance || 0,

        // Thành phần tăng
        overtimePay: doc.overtimePay || 0,
        holidayWorkPay: doc.holidayWorkPay || 0,
        weekendWorkPay: doc.weekendWorkPay || 0,
        bonus: doc.bonus || 0,
        performanceBonus: doc.performanceBonus || 0,
        otherAllowances: doc.otherAllowances || 0,

        // Thành phần giảm - Đảm bảo trả về đầy đủ
        latePenalty: doc.latePenalty || 0,
        absentDeduction: doc.absentDeduction || 0,
        unpaidLeaveDeduction: doc.unpaidLeaveDeduction || 0,
        halfDayDeduction: doc.halfDayDeduction || 0,
        otherDeductions: doc.otherDeductions || 0,

        // Chế độ đặc biệt
        maternityPay: doc.maternityPay || 0,
        sickLeavePay: doc.sickLeavePay || 0,
        annualLeavePay: doc.annualLeavePay || 0,

        // Tổng
        grossSalary: doc.grossSalary || 0,
        totalDeductions: doc.totalDeductions || doc.deductions || 0,
        netSalary: doc.netSalary || doc.totalSalary || 0,

        // Thông tin chi tiết
        workingDays: doc.workingDays || 0,
        absentDays: doc.absentDays || 0,
        halfDays: doc.halfDays || 0,
        lateCount: doc.lateCount || 0,
        lateMinutes: doc.lateMinutes || 0,
        overtimeHours: doc.overtimeHours || 0,
        holidayWorkDays: doc.holidayWorkDays || 0,
        weekendWorkDays: doc.weekendWorkDays || 0,
        paidLeaveDays: doc.paidLeaveDays || 0,
        unpaidLeaveDays: doc.unpaidLeaveDays || 0,
        maternityDays: doc.maternityDays || 0,
        sickLeaveDays: doc.sickLeaveDays || 0,

        // Backward compatibility
        basicSalary: doc.basicSalary || doc.baseSalary || 0,
        deductions: doc.deductions || doc.totalDeductions || 0,
        totalSalary: doc.totalSalary || doc.netSalary || 0,

        status: doc.status || 'draft',
        manualAdjustments: doc.manualAdjustments || [],
        calculatedAt: doc.calculatedAt,
        createdAt: doc.createdAt
      };
    });

    return res.json({ success: true, data, count: data.length });
  } catch (err) {
    console.error('[payrollController.listMonthly]', err);
    res.status(500).json({
      success: false,
      message: 'Lỗi tải bảng lương',
      detail: err.message
    });
  }
};

/**
 * POST /api/payroll/calculate { month, year, employeeId? }
 * Tính lương cho tất cả nhân viên hoặc một nhân viên cụ thể
 */
exports.calculateMonthly = async (req, res) => {
  try {
    const now = new Date();
    const year = Number(req.body.year || now.getFullYear());
    const month = Number(req.body.month || (now.getMonth() + 1));
    const { employeeId } = req.body;

    console.log('>>> /api/payroll/calculate', { year, month, employeeId });

    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    if (employeeId) {
      // Tính lương cho một nhân viên
      try {
        const payrollData = await calculateMonthlySalary(employeeId, year, month);
        
        // Lưu hoặc cập nhật payroll với $set để đảm bảo tất cả field được cập nhật
        // KHÔNG gọi payroll.calculate() vì nó sẽ tính lại theo công thức trong model (khác với salaryCalculator)
        const payroll = await Payroll.findOneAndUpdate(
          { employee: employeeId, month: monthStr },
          { $set: payrollData },
          { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        ).populate('employee', 'name employeeId position');

        console.log(`✅ [PAYROLL] Updated single employee: Net = ${payroll.netSalary.toLocaleString()}đ`);

        return res.json({
          success: true,
          message: 'Tính lương thành công',
          data: payroll
        });
      } catch (error) {
        console.error(`❌ [PAYROLL] Error calculating for employee ${employeeId}:`, error);
        return res.status(500).json({
          success: false,
          message: `Lỗi khi tính lương cho nhân viên: ${error.message}`,
          error: error.message
        });
      }
    } else {
      // Tính lương cho tất cả nhân viên active
      const employees = await Employee.find({ status: 'active' });
      const results = [];
      const errors = [];

      for (const employee of employees) {
        try {
          const payrollData = await calculateMonthlySalary(employee._id, year, month);
          
          // Đảm bảo cập nhật tất cả các field bằng cách dùng $set
          // KHÔNG gọi payroll.calculate() vì nó sẽ tính lại theo công thức trong model (khác với salaryCalculator)
          const payroll = await Payroll.findOneAndUpdate(
            { employee: employee._id, month: monthStr },
            { $set: payrollData },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
          );
          
          console.log(`✅ [PAYROLL] Updated ${employee.name}: Net = ${payroll.netSalary.toLocaleString()}đ (Base: ${payroll.baseSalary?.toLocaleString()}đ, Allowance: ${payroll.generalAllowance?.toLocaleString()}đ)`);
          
          results.push({
            employee: employee.name,
            employeeId: employee.employeeId,
            payrollId: payroll._id
          });
        } catch (error) {
          console.error(`❌ [PAYROLL] Error for ${employee.name}:`, error.message);
          errors.push({
            employee: employee.name,
            employeeId: employee.employeeId,
            error: error.message
          });
        }
      }

      return res.json({
        success: true,
        message: `Tính lương thành công cho ${results.length} nhân viên`,
        data: results,
        errors: errors.length > 0 ? errors : undefined
      });
    }
  } catch (err) {
    console.error('[payrollController.calculateMonthly]', err);
    res.status(500).json({
      success: false,
      message: 'Lỗi tính lương',
      detail: err.message
    });
  }
};

/**
 * GET /api/payroll/:id
 * Lấy chi tiết một bảng lương
 */
exports.getPayrollById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const payroll = await Payroll.findById(id)
      .populate('employee', 'name employeeId position department email contractType salary baseSalary joinDate');

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bảng lương'
      });
    }

    // Kiểm tra quyền: nhân viên chỉ xem được lương của chính mình
    if (user && user.role === 'employee' && user.employee) {
      const employeeId = user.employee._id || user.employee;
      if (String(payroll.employee._id) !== String(employeeId)) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xem bảng lương này'
        });
      }
    }

    return res.json({
      success: true,
      data: payroll
    });
  } catch (err) {
    console.error('[payrollController.getPayrollById]', err);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy chi tiết bảng lương',
      detail: err.message
    });
  }
};

/**
 * POST /api/payroll/:id/adjust { type, amount, reason }
 * Điều chỉnh lương thủ công
 */
exports.adjustPayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, amount, reason } = req.body;
    const user = req.user;

    // Kiểm tra quyền
    if (!['manager', 'accountant', 'admin'].includes(user?.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền điều chỉnh lương'
      });
    }

    if (!type || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin: type và amount là bắt buộc'
      });
    }

    if (!['bonus', 'penalty', 'salary_increase', 'salary_decrease', 'allowance', 'deduction'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Loại điều chỉnh không hợp lệ'
      });
    }

    const payroll = await Payroll.findById(id);
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bảng lương'
      });
    }

    // Thêm điều chỉnh
    const adjustment = {
      type,
      amount: Number(amount),
      reason: reason || '',
      createdBy: user.name || user.email || 'Admin',
      date: new Date()
    };

    if (!payroll.manualAdjustments) {
      payroll.manualAdjustments = [];
    }
    payroll.manualAdjustments.push(adjustment);

    // Cập nhật các field tương ứng
    if (type === 'bonus' || type === 'salary_increase' || type === 'allowance') {
      if (type === 'bonus') {
        payroll.bonus = (payroll.bonus || 0) + adjustment.amount;
      } else if (type === 'allowance') {
        payroll.otherAllowances = (payroll.otherAllowances || 0) + adjustment.amount;
      }
      payroll.grossSalary = (payroll.grossSalary || 0) + adjustment.amount;
    } else {
      if (type === 'penalty') {
        payroll.latePenalty = (payroll.latePenalty || 0) + adjustment.amount;
      } else if (type === 'deduction') {
        payroll.otherDeductions = (payroll.otherDeductions || 0) + adjustment.amount;
      }
      payroll.totalDeductions = (payroll.totalDeductions || 0) + adjustment.amount;
    }

    // Tính lại netSalary
    payroll.netSalary = payroll.grossSalary - payroll.totalDeductions;
    payroll.totalSalary = payroll.netSalary; // Backward compatibility

    await payroll.save();

    return res.json({
      success: true,
      message: 'Điều chỉnh lương thành công',
      data: payroll
    });
  } catch (err) {
    console.error('[payrollController.adjustPayroll]', err);
    res.status(500).json({
      success: false,
      message: 'Lỗi điều chỉnh lương',
      detail: err.message
    });
  }
};

/**
 * PUT /api/payroll/:id/approve
 * Duyệt bảng lương
 */
exports.approvePayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Kiểm tra quyền
    if (!['manager', 'accountant', 'admin'].includes(user?.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền duyệt lương'
      });
    }

    const payroll = await Payroll.findByIdAndUpdate(
      id,
      {
        status: 'approved',
        approvedBy: user.name || user.email || 'Admin',
        approvedAt: new Date()
      },
      { new: true }
    ).populate('employee', 'name employeeId position');

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bảng lương'
      });
    }

    return res.json({
      success: true,
      message: 'Duyệt lương thành công',
      data: payroll
    });
  } catch (err) {
    console.error('[payrollController.approvePayroll]', err);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi duyệt lương',
      detail: err.message
    });
  }
};

/**
 * PUT /api/payroll/:id/mark-paid
 * Đánh dấu đã thanh toán
 */
exports.markAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Kiểm tra quyền
    if (!['manager', 'accountant', 'admin'].includes(user?.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền đánh dấu thanh toán'
      });
    }

    const payroll = await Payroll.findByIdAndUpdate(
      id,
      {
        status: 'paid',
        paidAt: new Date()
      },
      { new: true }
    ).populate('employee', 'name employeeId position');

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bảng lương'
      });
    }

    return res.json({
      success: true,
      message: 'Đánh dấu đã thanh toán thành công',
      data: payroll
    });
  } catch (err) {
    console.error('[payrollController.markAsPaid]', err);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi đánh dấu thanh toán',
      detail: err.message
    });
  }
};

/**
 * DELETE /api/payroll/:id
 * Xóa bảng lương
 */
exports.deletePayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Kiểm tra quyền
    if (!['manager', 'accountant', 'admin'].includes(user?.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa bảng lương'
      });
    }

    const payroll = await Payroll.findById(id);
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bảng lương'
      });
    }

    await Payroll.findByIdAndDelete(id);

    console.log(`[payrollController.deletePayroll] Deleted payroll ${id} by ${user.name || user.email}`);

    return res.json({
      success: true,
      message: 'Xóa bảng lương thành công'
    });
  } catch (err) {
    console.error('[payrollController.deletePayroll]', err);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa bảng lương',
      detail: err.message
    });
  }
};



