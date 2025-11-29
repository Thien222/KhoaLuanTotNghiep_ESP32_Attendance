const mongoose = require('mongoose');

const employeeShiftSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  shift: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift',
    required: true
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    // null means currently active
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isOvertimeShift: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
employeeShiftSchema.index({ employee: 1, startDate: -1 });
employeeShiftSchema.index({ shift: 1 });

// Ensure only one active shift per employee at a time
employeeShiftSchema.pre('save', async function(next) {
  if (this.isActive && this.isNew) {
    // Deactivate previous shifts for this employee
    await this.constructor.updateMany(
      { employee: this.employee, isActive: true },
      { isActive: false, endDate: this.startDate }
    );
  }
  next();
});

module.exports = mongoose.model('EmployeeShift', employeeShiftSchema);




