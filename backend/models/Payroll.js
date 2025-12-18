// backend/models/Payroll.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

// Điều chỉnh thủ công
const ManualAdjustmentSchema = new Schema({
  type: {
    type: String,
    enum: ['bonus', 'penalty', 'salary_increase', 'salary_decrease', 'allowance', 'deduction'],
    required: true
  },
  amount: { type: Number, required: true, min: 0 },
  reason: { type: String, default: '' },
  createdBy: { type: String, default: '' },
  date: { type: Date, default: Date.now }
}, { _id: false });

// Lịch sử tăng lương
const SalaryHistorySchema = new Schema({
  oldSalary: { type: Number, required: true },
  newSalary: { type: Number, required: true },
  effectiveDate: { type: Date, required: true },
  reason: { type: String, default: '' },
  approvedBy: { type: String, default: '' }
}, { _id: false });

const PayrollSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  month: { type: String, required: true }, // Format: "YYYY-MM"

  // === LƯƠNG CƠ BẢN ===
  baseSalary: { type: Number, default: 0 },              // Lương cơ bản (theo ngày công)
  generalAllowance: { type: Number, default: 0 },        // NEW: Phụ cấp chung 5%
  seniorityAllowance: { type: Number, default: 0 },     // Phụ cấp thâm niên (%)
  positionAllowance: { type: Number, default: 0 },     // Phụ cấp chức vụ

  // === THÀNH PHẦN TĂNG ===
  overtimePay: { type: Number, default: 0 },            // Lương OT
  holidayWorkPay: { type: Number, default: 0 },        // Làm việc ngày lễ
  weekendWorkPay: { type: Number, default: 0 },        // Làm việc cuối tuần
  bonus: { type: Number, default: 0 },                 // Thưởng
  performanceBonus: { type: Number, default: 0 },       // Thưởng hiệu suất
  otherAllowances: { type: Number, default: 0 },       // Phụ cấp khác

  // === THÀNH PHẦN GIẢM ===
  latePenalty: { type: Number, default: 0 },            // Phạt đi muộn + về sớm
  absentDeduction: { type: Number, default: 0 },      // Trừ nghỉ không lương
  unpaidLeaveDeduction: { type: Number, default: 0 },   // Trừ nghỉ không lương
  halfDayDeduction: { type: Number, default: 0 },      // Trừ nửa ngày
  otherDeductions: { type: Number, default: 0 },        // Khấu trừ khác

  // === CHẾ ĐỘ ĐẶC BIỆT ===
  maternityPay: { type: Number, default: 0 },          // Chế độ thai sản
  sickLeavePay: { type: Number, default: 0 },         // Nghỉ ốm có lương
  annualLeavePay: { type: Number, default: 0 },        // Nghỉ phép có lương

  // === TỔNG ===
  grossSalary: { type: Number, default: 0 },             // Tổng thu nhập
  totalDeductions: { type: Number, default: 0 },        // Tổng khấu trừ
  netSalary: { type: Number, default: 0 },             // Lương thực nhận

  // === THÔNG TIN CHI TIẾT ===
  workingDays: { type: Number, default: 0 },             // Số ngày làm việc
  absentDays: { type: Number, default: 0 },            // Số ngày nghỉ
  halfDays: { type: Number, default: 0 },              // Số nửa ngày
  lateCount: { type: Number, default: 0 },              // Số lần đi muộn
  lateMinutes: { type: Number, default: 0 },           // Tổng phút đi muộn
  overtimeHours: { type: Number, default: 0 },           // Số giờ OT
  holidayWorkDays: { type: Number, default: 0 },        // Số ngày làm lễ
  weekendWorkDays: { type: Number, default: 0 },        // Số ngày làm cuối tuần
  paidLeaveDays: { type: Number, default: 0 },         // Số ngày nghỉ có lương
  unpaidLeaveDays: { type: Number, default: 0 },       // Số ngày nghỉ không lương
  maternityDays: { type: Number, default: 0 },           // Số ngày thai sản
  sickLeaveDays: { type: Number, default: 0 },          // Số ngày nghỉ ốm

  // === ĐIỀU CHỈNH & LỊCH SỬ ===
  manualAdjustments: { type: [ManualAdjustmentSchema], default: [] },
  salaryHistory: { type: [SalaryHistorySchema], default: [] },

  // === TRẠNG THÁI ===
  status: {
    type: String,
    enum: ['draft', 'calculated', 'reviewed', 'approved', 'paid', 'cancelled'],
    default: 'draft'
  },
  calculatedAt: { type: Date },
  approvedAt: { type: Date },
  approvedBy: { type: String },
  paidAt: { type: Date },

  // === BACKWARD COMPATIBILITY ===
  basePay: { type: Number, default: 0 },
  basicSalary: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  totalSalary: { type: Number, default: 0 },

  notes: { type: String, default: '' }
}, { timestamps: true });

// Index
PayrollSchema.index({ employee: 1, month: 1 }, { unique: true });
PayrollSchema.index({ status: 1 });
PayrollSchema.index({ month: 1 });

  // Method: Tính toán tự động
  // CÔNG THỨC (Cách 1 - Chia cho 26 ngày công chuẩn): Net = (Base × Days/26) + Allowances + OT - Fines
  PayrollSchema.methods.calculate = function () {
    // Tổng phụ cấp
    const totalAllowances = (this.generalAllowance || 0) +
      (this.seniorityAllowance || 0) +
      (this.positionAllowance || 0);

    // Tổng OT (BỎ weekendWorkPay - phiếu lương gốc không có khoản này)
    const totalOT = (this.overtimePay || 0) +
      (this.holidayWorkPay || 0);

    // Tổng phạt (chỉ latePenalty, các khấu trừ khác đã tính trong baseSalary prorated)
    const totalFines = this.latePenalty || 0;

    // Gross = Base + Allowances + OT + Special Pays
    this.grossSalary = (this.baseSalary || 0) +
      totalAllowances +
      totalOT +
      (this.bonus || 0) +
      (this.performanceBonus || 0) +
      (this.otherAllowances || 0) +
      (this.maternityPay || 0) +
      (this.sickLeavePay || 0) +
      (this.annualLeavePay || 0);

    // Tổng khấu trừ = Fines (bỏ otherDeductions)
    this.totalDeductions = totalFines;

    // NET = Base + Allowances + OT - Fines
    this.netSalary = (this.baseSalary || 0) + totalAllowances + totalOT - totalFines;

  // Backward compatibility
  this.basePay = this.baseSalary;
  this.basicSalary = this.baseSalary;
  this.deductions = this.totalDeductions;
  this.totalSalary = this.netSalary;

  return this;
};

module.exports = mongoose.model('Payroll', PayrollSchema);
