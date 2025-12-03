const mongoose = require('mongoose');

const overtimeRequestSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  // NEW: Auto-calculated from employee's shift (no longer required from frontend)
  startTime: {
    type: String,
    default: '' // Format: "HH:mm" - Auto-set from shift endTime
  },
  endTime: {
    type: String,
    default: '' // Format: "HH:mm" - Auto-set from system OT end time
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  estimatedHours: {
    type: Number,
    default: 0
  },
  // NEW: Reference to shift for tracking
  shift: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift'
  },
  shiftName: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  reviewComment: {
    type: String,
    trim: true
  },
  appliedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
overtimeRequestSchema.index({ employee: 1, date: 1 });
overtimeRequestSchema.index({ status: 1 });
overtimeRequestSchema.index({ date: 1 });

// Static method to check if employee has approved OT for a date
overtimeRequestSchema.statics.hasApprovedOTForDate = async function(employeeId, date) {
  const startOfDay = moment(date).startOf('day').toDate();
  const endOfDay = moment(date).endOf('day').toDate();
  
  const approvedOT = await this.findOne({
    employee: employeeId,
    date: { $gte: startOfDay, $lte: endOfDay },
    status: 'approved'
  });
  
  return !!approvedOT;
};

const moment = require('moment-timezone');

module.exports = mongoose.model('OvertimeRequest', overtimeRequestSchema);

