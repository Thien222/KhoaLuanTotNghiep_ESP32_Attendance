<<<<<<< HEAD
const mongoose = require('mongoose');

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
  
  // Leave Management
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

=======
const mongoose = require('mongoose');

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
    baseSalary: {
    type: Number,
    default: 0
  },

  joinDate: {
    type: Date,
    default: Date.now
  },

  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

>>>>>>> 03f3fc8ca695fadb2e80e46e5549b7e9db5477cf
module.exports = mongoose.model('Employee', employeeSchema);