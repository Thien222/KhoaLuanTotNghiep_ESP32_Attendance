
const express = require('express');
const router = express.Router();


const { postMessage } = require('../controllers/chatController');


router.post('/message', postMessage);


router.get('/message', (req, res) =>
  res.status(405).json({ error: 'Use POST /api/chat/message' })
);

module.exports = router;
