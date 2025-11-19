const mongoose = require('mongoose');

const PayrollAdjustmentSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    type: { type: String, enum: ['bonus', 'penalty', 'increase', 'decrease'], required: true },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, default: '' },
    createdBy: { type: String, default: '' },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PayrollAdjustment', PayrollAdjustmentSchema);
