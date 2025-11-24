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
  baseSalary: { type: Number, default: 0 },              // Lương cơ bản
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
  latePenalty: { type: Number, default: 0 },            // Phạt đi muộn
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
PayrollSchema.methods.calculate = function() {
  // Tổng thu nhập
  this.grossSalary = this.baseSalary + 
                     this.seniorityAllowance + 
                     this.positionAllowance +
                     this.overtimePay + 
                     this.holidayWorkPay +
                     this.weekendWorkPay +
                     this.bonus + 
                     this.performanceBonus +
                     this.otherAllowances +
                     this.maternityPay +
                     this.sickLeavePay +
                     this.annualLeavePay;
  
  // Tổng khấu trừ
  this.totalDeductions = this.latePenalty + 
                         this.absentDeduction + 
                         this.unpaidLeaveDeduction +
                         this.halfDayDeduction +
                         this.otherDeductions;
  
  // Lương thực nhận
  this.netSalary = this.grossSalary - this.totalDeductions;
  
  // Backward compatibility
  this.basePay = this.baseSalary;
  this.basicSalary = this.baseSalary;
  this.deductions = this.totalDeductions;
  this.totalSalary = this.netSalary;
  
  return this;
};

module.exports = mongoose.model('Payroll', PayrollSchema);
