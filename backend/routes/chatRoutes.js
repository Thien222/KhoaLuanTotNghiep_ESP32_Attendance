// backend/routes/chatRoutes.js
const express = require('express');
const router = express.Router();

const { postMessage } = require('../controllers/chatController');

// POST /api/chat/message
router.post('/message', postMessage);

// Ai gọi GET nhầm thì nhắc dùng POST
router.get('/message', (req, res) =>
  res.status(405).json({ error: 'Use POST /api/chat/message' })
);

module.exports = router;
