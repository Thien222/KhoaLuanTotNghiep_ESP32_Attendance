// backend/routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const { postMessage } = require('../controllers/chatController');

// robust import protect from either middleware path
let protect;
try {
  ({ protect } = require('../middleware/authMiddleware'));
} catch {
  ({ protect } = require('../middlewares/authMiddleware'));
}

// one canonical endpoint, POST only, must be authenticated
router.post('/message', protect, postMessage);

// Optional guard for GET
router.get('/message', (_req, res) =>
  res.status(405).json({ error: 'Use POST /api/chat/message' })
);

module.exports = router;
