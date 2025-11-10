<<<<<<< HEAD
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  fingerprintId: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  checkIn: {
    time: Date,
    status: {
      type: String,
      enum: ['on-time', 'late']
    }
  },
  checkOut: {
    time: Date,
    status: {
      type: String,
      enum: ['on-time', 'early', 'overtime']
    }
  },
  workingHours: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'half-day'],
    required: true
  },
  
  // Late tracking
  lateMinutes: {
    type: Number,
    default: 0
  },
  latePenalty: {
    type: Number,
    default: 0
  },
  
  // Overtime tracking
  overtimeHours: {
    type: Number,
    default: 0
  },
  overtimeRate: {
    type: Number,
    default: 1.0
  },
  
  // Holiday & Special days
  isHoliday: {
    type: Boolean,
    default: false
  },
  holidayRate: {
    type: Number,
    default: 1.0
  },
  
  // Checkout flags
  autoCheckout: {
    type: Boolean,
    default: false
  },
  incompleteCheckout: {
    type: Boolean,
    default: false
  },
  
  notes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Attendance', attendanceSchema);
=======
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  fingerprintId: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  checkIn: {
    time: Date,
    status: {
      type: String,
      enum: ['on-time', 'late']
    }
  },
  checkOut: {
    time: Date,
    status: {
      type: String,
      enum: ['on-time', 'early', 'overtime']
    }
  },
  workingHours: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'half-day'],
    required: true
  },
  notes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Attendance', attendanceSchema);
>>>>>>> 03f3fc8ca695fadb2e80e46e5549b7e9db5477cf
