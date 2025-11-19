// backend/models/Payroll.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const ManualAdjustmentSchema = new Schema({
  type: { type: String, enum: ['bonus', 'penalty', 'increase', 'decrease'], required: true },
  amount: { type: Number, required: true, min: 0 },
  reason: { type: String, default: '' },
  createdBy: { type: String, default: '' },
  date: { type: Date, default: Date.now }
}, { _id: false });

const PayrollSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  // month đang lưu kiểu "2025-10"
  month: { type: String, required: true },

  // các field sẵn có trong DB của bạn
  basePay: { type: Number, default: 0 },
  basicSalary: { type: Number, default: 0 },
  lateMinutes: { type: Number, default: 0 },
  lateCount: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
  overtimeHours: { type: Number, default: 0 },
  overtimePay: { type: Number, default: 0 },
  yearEndBonus: { type: Number, default: 0 },
  totalSalary: { type: Number, default: 0 },
  status: { type: String, default: 'pending' },

  // thêm chỗ lưu điều chỉnh thủ công cho FE
  manualAdjustments: { type: [ManualAdjustmentSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Payroll', PayrollSchema);
