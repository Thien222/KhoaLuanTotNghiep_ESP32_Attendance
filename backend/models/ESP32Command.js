const mongoose = require('mongoose');

const esp32CommandSchema = new mongoose.Schema({
    command: {
        type: String,
        required: true,
        enum: ['enroll', 'delete', 'sync', 'wipe']
    },
    fingerprintId: {
        type: Number,
        required: true
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },
    status: {
        type: String,
        default: 'pending',
        enum: ['pending', 'processing', 'completed', 'failed', 'timeout']
    },
    result: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300 // Auto-delete after 5 minutes
    },
    completedAt: {
        type: Date
    }
});

module.exports = mongoose.model('ESP32Command', esp32CommandSchema);
