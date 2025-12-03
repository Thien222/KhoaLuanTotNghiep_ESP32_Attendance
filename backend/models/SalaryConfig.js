const mongoose = require('mongoose');

const salaryConfigSchema = new mongoose.Schema({
  // Standard working days per month
  standard_days: {
    type: Number,
    default: 28,
    required: true
  },
  // Overtime rate per hour (VND)
  ot_rate: {
    type: Number,
    default: 100000,  // 100,000 VND per hour
    required: true
  },
  // Fine per 15-minute block (VND)
  fine_per_15m: {
    type: Number,
    default: 20000,  // 20,000 VND per 15 minutes
    required: true
  },
  // Standard working hours
  standard_start_hour: {
    type: Number,
    default: 7,  // 07:00
    min: 0,
    max: 23
  },
  standard_start_minute: {
    type: Number,
    default: 0,
    min: 0,
    max: 59
  },
  standard_end_hour: {
    type: Number,
    default: 17,  // 17:00
    min: 0,
    max: 23
  },
  standard_end_minute: {
    type: Number,
    default: 0,
    min: 0,
    max: 59
  },
  // Critical threshold: if missed time > this (minutes), lose whole day
  critical_missed_minutes: {
    type: Number,
    default: 120,  // 2 hours
    required: true
  }
}, {
  timestamps: true
});

// Static method: Get default config (singleton pattern)
salaryConfigSchema.statics.getDefaultConfig = async function() {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({});
  }
  return config;
};

// Instance method: Get standard start time as Date
salaryConfigSchema.methods.getStandardStartTime = function(date) {
  const d = new Date(date);
  d.setHours(this.standard_start_hour, this.standard_start_minute, 0, 0);
  return d;
};

// Instance method: Get standard end time as Date
salaryConfigSchema.methods.getStandardEndTime = function(date) {
  const d = new Date(date);
  d.setHours(this.standard_end_hour, this.standard_end_minute, 0, 0);
  return d;
};

module.exports = mongoose.model('SalaryConfig', salaryConfigSchema);







