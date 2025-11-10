const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  type: {
    type: String,
    enum: ['national', 'tet', 'custom'],
    default: 'national',
    required: true
  },
  workRate: {
    type: Number,
    default: 2.0,  // Default x2 for holidays, x3 for special days
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
holidaySchema.index({ date: 1 });
holidaySchema.index({ active: 1 });

// Helper method to check if a date is a holiday
holidaySchema.statics.isHoliday = async function(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const holiday = await this.findOne({
    date: { $gte: startOfDay, $lte: endOfDay },
    active: true
  });
  
  return holiday;
};

module.exports = mongoose.model('Holiday', holidaySchema);



