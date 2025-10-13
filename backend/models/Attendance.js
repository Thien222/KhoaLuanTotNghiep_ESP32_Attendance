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
