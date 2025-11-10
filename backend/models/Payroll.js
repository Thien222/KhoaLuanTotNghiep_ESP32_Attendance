const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  month: {
    type: String, // Format: "YYYY-MM" for backward compatibility
    required: true
  },
  year: {
    type: Number, // Year as number (e.g., 2025)
    required: false // Optional for backward compatibility
  },
  monthNum: {
    type: Number, // Month as number (1-12)
    required: false // Optional for backward compatibility
  },
  basicSalary: {
    type: Number,
    required: true,
    default: 0
  },
  position: {
    type: String
  },
  totalWorkingDays: {
    type: Number,
    default: 0
  },
  actualWorkingDays: {
    type: Number,
    default: 0
  },
  lateDays: {
    type: Number,
    default: 0
  },
  lateMinutes: {
    type: Number,
    default: 0
  },
  lateCount: {
    type: Number,
    default: 0
  },
  absentDays: {
    type: Number,
    default: 0
  },
  paidLeaveDays: {
    type: Number,
    default: 0
  },
  unpaidLeaveDays: {
    type: Number,
    default: 0
  },
  holidayDays: {
    type: Number,
    default: 0
  },
  holidayWorkDays: {
    type: Number,
    default: 0
  },
  totalWorkingHours: {
    type: Number,
    default: 0
  },
  overtimeHours: {
    type: Number,
    default: 0
  },
  basePay: {
    type: Number,
    default: 0
  },
  overtimePay: {
    type: Number,
    default: 0
  },
  holidayWorkPay: {
    type: Number,
    default: 0
  },
  latePenalty: {
    type: Number,
    default: 0
  },
  absentDeduction: {
    type: Number,
    default: 0
  },
  unpaidLeaveDeduction: {
    type: Number,
    default: 0
  },
  allowances: {
    type: Number,
    default: 0
  },
  bonus: {
    type: Number,
    default: 0
  },
  yearEndBonus: {
    type: Number,
    default: 0
  },
  deductions: {
    type: Number,
    default: 0
  },
  totalSalary: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'paid'],
    default: 'pending'
  },
  approvedBy: {
    type: String
  },
  approvedAt: {
    type: Date
  },
  paidAt: {
    type: Date
  },
  calculatedAt: {
    type: Date,
    default: Date.now
  },
  manualAdjustments: [{
    type: {
      type: String,
      enum: ['increase', 'decrease', 'bonus', 'penalty'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    createdBy: String
  }]
}, {
  timestamps: true
});

// Index for faster queries
payrollSchema.index({ employee: 1, month: 1 });
payrollSchema.index({ employee: 1, year: 1, monthNum: 1 });

module.exports = mongoose.model('Payroll', payrollSchema);

