const mongoose = require('mongoose');

const esp32ConfigSchema = new mongoose.Schema({
  esp32Ip: {
    type: String,
    required: true,
    unique: true
  },
  serverUrl: {
    type: String,
    required: true,
    default: 'http://172.20.10.7:3000/api'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['online', 'offline'],
    default: 'offline'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ESP32Config', esp32ConfigSchema);



