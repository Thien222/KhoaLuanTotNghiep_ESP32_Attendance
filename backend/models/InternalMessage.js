const mongoose = require('mongoose');

const internalMessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null = group chat
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['text', 'file', 'image'],
    default: 'text'
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  room: {
    type: String,
    default: null // room ID for group chats (e.g., 'role_admin', 'role_employee')
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
internalMessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
internalMessageSchema.index({ room: 1, createdAt: -1 });
internalMessageSchema.index({ receiver: 1, read: 1 });

module.exports = mongoose.model('InternalMessage', internalMessageSchema);





