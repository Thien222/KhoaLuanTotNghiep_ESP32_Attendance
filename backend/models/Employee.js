const mongoose = require('mongoose');
const moment = require('moment-timezone');

moment.tz.setDefault('Asia/Ho_Chi_Minh');

const employeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  employeeId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  fingerprintId: {
    type: Number,
    unique: true,
    sparse: true // Allows null values to not violate unique constraint
  },
  fingerprintTemplate: {
    type: String,  // Base64 encoded template
    default: 'not_enrolled'
  },
  fingerprintEnrolled: {
    type: Boolean,
    default: false
  },
  position: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  
  // Contract & Salary Info
  contractType: {
    type: String,
    enum: ['intern', 'probation', 'official'],
    default: 'probation',
    required: true
  },
  salary: {
    type: Number,
    required: true,
    default: 0
  },
  baseSalary: {
    type: Number,
    default: 0
  },
  // Salary calculation fields
  allowance_rate: {
    type: Number,
    default: 0.1  // 10% allowance
  },
  tax_rate: {
    type: Number,
    default: 0.05  // 5% tax
  },
  
  // Lịch sử tăng lương
  salaryHistory: [{
    oldSalary: Number,
    newSalary: Number,
    effectiveDate: Date,
    reason: String,
    approvedBy: String,
    createdAt: { type: Date, default: Date.now }
  }],
  
  // === THÂM NIÊN (tự động tính) ===
  seniorityYears: {
    type: Number,
    default: 0
  },
  
  // === CHẾ ĐỘ ĐẶC BIỆT ===
  isMaternityLeave: {
    type: Boolean,
    default: false
  },
  maternityLeaveStart: Date,
  maternityLeaveEnd: Date,
  maternityLeaveDays: { type: Number, default: 0 }, // Tổng số ngày được nghỉ
  
  // Personal Info (to be completed by employee)
  address: {
    type: String,
    trim: true
  },
  citizenId: {
    type: String,
    trim: true
  },
  socialInsuranceNumber: {
    type: String,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  bankAccount: {
    bankName: String,
    accountNumber: String,
    accountName: String
  },
  profileCompleted: {
    type: Boolean,
    default: false
  },
  profileCompletedAt: Date,
  
  // Leave Management - Detailed quotas
  leaveQuotas: {
    // Nghỉ phép năm
    annual: {
      total: { type: Number, default: 12 }, // Tổng ngày phép năm
      used: { type: Number, default: 0 },   // Đã sử dụng
      remaining: { type: Number, default: 12 } // Còn lại (tự động tính)
    },
    // Nghỉ ốm (theo giờ)
    sick: {
      totalHours: { type: Number, default: 72 }, // Tổng 72 giờ/năm
      usedHours: { type: Number, default: 0 },   // Đã sử dụng
      remainingHours: { type: Number, default: 72 } // Còn lại
    },
    // Làm việc tại nhà (WFH)
    wfh: {
      totalDays: { type: Number, default: 0 }, // Không giới hạn mặc định
      usedDays: { type: Number, default: 0 },
      remainingDays: { type: Number, default: 0 }
    },
    // Nghỉ thai sản
    maternity: {
      totalDays: { type: Number, default: 180 }, // 180 ngày
      usedDays: { type: Number, default: 0 },
      remainingDays: { type: Number, default: 180 }
    },
    // Nghỉ không lương
    unpaid: {
      totalDays: { type: Number, default: 0 }, // Không giới hạn
      usedDays: { type: Number, default: 0 },
      remainingDays: { type: Number, default: 0 }
    }
  },
  
  // Backward compatibility - keep old fields
  annualLeaveDays: {
    type: Number,
    default: 12  // 12 days per year
  },
  usedLeaveDays: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Virtual: Tính thâm niên
employeeSchema.virtual('calculatedSeniority').get(function() {
  if (!this.joinDate) return 0;
  const years = moment().diff(moment(this.joinDate), 'years', true);
  return Math.floor(years * 10) / 10;
});

// Method: Cập nhật thâm niên
employeeSchema.methods.updateSeniority = function() {
  this.seniorityYears = this.calculatedSeniority;
  // Đảm bảo baseSalary được set từ salary nếu chưa có
  if (!this.baseSalary && this.salary) {
    this.baseSalary = this.salary;
  }
  return this;
};

// Method: Tăng lương
employeeSchema.methods.increaseSalary = function(newSalary, reason, approvedBy) {
  const oldSalary = this.baseSalary || this.salary;
  this.salaryHistory.push({
    oldSalary: oldSalary,
    newSalary: newSalary,
    effectiveDate: new Date(),
    reason: reason || '',
    approvedBy: approvedBy || 'System'
  });
  this.baseSalary = newSalary;
  this.salary = newSalary; // Giữ backward compatibility
  return this;
};

// Pre-save: Tự động cập nhật baseSalary từ salary nếu chưa có
employeeSchema.pre('save', function(next) {
  if (!this.baseSalary && this.salary) {
    this.baseSalary = this.salary;
  }
  next();
});

module.exports = mongoose.model('Employee', employeeSchema);