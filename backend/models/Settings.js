const mongoose = require('mongoose');


const settingsSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['working-hours', 'overtime', 'late-policy', 'early-checkin', 'salary-structure', 'leave-policy', 'auto-checkout'],
    required: true,
    unique: true
  },
  config: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  updatedBy: {
    type: String,
    default: 'System'
  }
}, {
  timestamps: true
});

// Default settings
settingsSchema.statics.getDefaultSettings = function() {
  return {
    'working-hours': {
      startTime: '08:00',
      endTime: '17:00',
      totalHours: 8,
      lunchBreak: {
        start: '12:00',
        end: '13:00',
        duration: 1
      }
    },
    'overtime': {
      maxTime: '23:30',
      minDuration: 1,
      roundingRule: 'hour',
      weekdayRate: 1.5,
      weekendRate: 2.0,
      holidayRate: 3.0
    },
    'late-policy': {
      graceMinutes: 15,
      penaltyAfterGrace: 50000,  // 50k VND per late (after grace)
      halfDayThreshold: 60,      // Late >60 mins = deduct half day
      penaltyPerMinute: 0        // Not used if penaltyAfterGrace is set
    },
    'early-checkin': {
      allowed: true,
      bufferMinutes: 30 // Allow check-in 30 minutes before working hours start time
    },
    'salary-structure': {
      positions: {
        'Intern': { basicSalary: 3000000, overtimeMultiplier: 1.0 },
        'Junior': { basicSalary: 8000000, overtimeMultiplier: 1.2 },
        'Mid-Level': { basicSalary: 15000000, overtimeMultiplier: 1.3 },
        'Senior': { basicSalary: 25000000, overtimeMultiplier: 1.5 },
        'Team Lead': { basicSalary: 35000000, overtimeMultiplier: 1.5 },
        'Manager': { basicSalary: 50000000, overtimeMultiplier: 1.8 },
        'Director': { basicSalary: 80000000, overtimeMultiplier: 2.0 }
      }
    }
  };
};

module.exports = mongoose.model('Settings', settingsSchema);








