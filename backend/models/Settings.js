const mongoose = require('mongoose');


const settingsSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['working-hours', 'overtime', 'late-policy', 'early-checkin', 'salary-structure', 'leave-policy', 'auto-checkout', 'tax-config', 'ot-rate'],
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
      holidayRate: 3.0,
      otRate: 100000 // NEW: OT rate 100k/1h (cố định)
    },
    'late-policy': {
      graceMinutes: 4,           // NEW: Grace period 4 phút (8h04)
      penaltyRate: 20000,        // NEW: Phạt 20k/15 phút
      penaltyInterval: 15,       // NEW: Mỗi 15 phút
      lateThreshold2Hours: 120,  // NEW: >= 2h mất ngày công
      penaltyAfterGrace: 50000,  // Legacy (không dùng nữa)
      halfDayThreshold: 60,      // Legacy (không dùng nữa)
      penaltyPerMinute: 0        // Legacy (không dùng nữa)
    },
    'ot-rate': {
      enabled: true,
      ratePerHour: 100000,       // NEW: 100k VND/1h
      calculationType: 'fixed',  // 'fixed' hoặc 'percentage'
      percentage: 0,             // Nếu dùng % lương
      startTime: '19:00',        // NEW: OT bắt đầu từ 19h
      breakTime: {               // NEW: Giờ nghỉ không tính OT
        start: '18:00',
        end: '18:59'
      }
    },
    'tax-config': {
      enabled: true,
      taxRate: 10,               // NEW: 10% (bao gồm thuế + TNCN + bảo hiểm)
      applyTo: 'gross-minus-penalty', // Tính thuế trên (Gross - Phạt)
      description: 'Thuế TNCN + Bảo hiểm (10%)'
    },
    'early-checkin': {
      allowed: true,
      bufferMinutes: 30 // Allow check-in 30 minutes before working hours start time
    },
    'salary-structure': {
      // Lương cơ bản theo chức vụ
      positionBaseSalary: {
        'Intern': 3000000,
        'Junior': 8000000,
        'Mid-Level': 15000000,
        'Senior': 25000000,
        'Team Lead': 35000000,
        'Manager': 50000000,
        'Director': 80000000
      },
      // Hệ số OT theo chức vụ
      positionOvertimeMultiplier: {
        'Intern': 1.0,
        'Junior': 1.2,
        'Mid-Level': 1.3,
        'Senior': 1.5,
        'Team Lead': 1.5,
        'Manager': 1.8,
        'Director': 2.0
      },
      // Phụ cấp thâm niên
      seniorityPolicy: {
        percentPerYear: 2,      // 2% mỗi năm
        maxPercent: 20         // Tối đa 20%
      },
      // Phụ cấp chức vụ (% của lương cơ bản)
      positionAllowance: {
        'Intern': 0,
        'Junior': 0,
        'Mid-Level': 5,
        'Senior': 10,
        'Team Lead': 15,
        'Manager': 20,
        'Director': 30
      },
      // NEW: Phụ cấp chung (5% thay vì 10%)
      generalAllowanceRate: 5, // 5% LCB
      // Hệ số theo loại hợp đồng
      contractMultiplier: {
        'intern': 0.8,
        'probation': 0.85,
        'official': 1.0
      }
    }
  };
};

module.exports = mongoose.model('Settings', settingsSchema);









