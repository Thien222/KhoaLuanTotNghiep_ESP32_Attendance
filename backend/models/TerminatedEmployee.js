const mongoose = require('mongoose');

const terminatedEmployeeSchema = new mongoose.Schema({
  // Original employee info
  originalEmployeeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  employeeId: {
    type: String,
    required: true
  },
  fingerprintId: {
    type: Number
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String
  },
  phone: {
    type: String
  },
  position: {
    type: String
  },
  department: {
    type: String
  },
  contractType: {
    type: String,
    enum: ['intern', 'probation', 'official'],
    default: 'probation'
  },
  
  // Salary info
  baseSalary: {
    type: Number,
    default: 0
  },
  
  // Work history
  joinDate: {
    type: Date
  },
  terminationDate: {
    type: Date,
    default: Date.now
  },
  totalWorkingDays: {
    type: Number,
    default: 0
  },
  
  // Termination info
  terminationReason: {
    type: String,
    enum: ['resigned', 'terminated', 'contract_ended', 'retirement', 'other'],
    default: 'resigned'
  },
  terminationNote: {
    type: String
  },
  terminatedBy: {
    type: String
  },
  
  // Status
  status: {
    type: String,
    enum: ['terminated', 'resigned'],
    default: 'terminated'
  },
  
  // Additional info from original employee
  address: String,
  citizenId: String,
  dateOfBirth: Date,
  gender: String,
  bankAccount: {
    bankName: String,
    accountNumber: String,
    accountName: String
  },
  socialInsuranceNumber: String
  
}, {
  timestamps: true
});

// Index for searching
terminatedEmployeeSchema.index({ name: 'text', employeeId: 'text' });
terminatedEmployeeSchema.index({ terminationDate: -1 });

module.exports = mongoose.model('TerminatedEmployee', terminatedEmployeeSchema);


