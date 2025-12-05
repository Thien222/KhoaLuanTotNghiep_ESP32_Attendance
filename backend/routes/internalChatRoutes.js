const express = require('express');
const router = express.Router();
const {
  getConversation,
  getConversations,
  getGroupMessages,
  markAsRead,
  getUnreadCount,
  sendMessage
} = require('../controllers/internalChatController');

// Import auth middleware
let protect;
try {
  ({ protect } = require('../middleware/authMiddleware'));
} catch {
  ({ protect } = require('../middlewares/authMiddleware'));
}

// All routes require authentication
router.use(protect);

// Get all conversations for current user
router.get('/conversations', getConversations);

// Get conversation between current user and another user
router.get('/messages/:receiverId', getConversation);

// Get group chat messages
router.get('/group/:room', getGroupMessages);

// Mark messages as read
router.post('/mark-read', markAsRead);

// Send message (REST endpoint for mobile)
router.post('/send', sendMessage);

// Get unread message count
router.get('/unread-count', getUnreadCount);

module.exports = router;

