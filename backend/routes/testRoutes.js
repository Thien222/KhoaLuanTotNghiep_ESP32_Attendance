const express = require('express');
const router = express.Router();
const { setVirtualTime, resetTime, getSystemTime, getTimeStatus } = require('../utils/timeMachine');

/**
 * Middleware: Chỉ cho phép nếu đang bật chế độ Test
 */
const checkTestMode = (req, res, next) => {
  if (process.env.ENABLE_TEST_MODE !== 'true') {
    return res.status(403).json({
      success: false,
      message: 'Test mode is disabled. Set ENABLE_TEST_MODE=true to enable.',
      testModeEnabled: false
    });
  }
  next();
};

/**
 * POST /api/test/set-time
 * Set virtual time for testing
 * Body: { time: "2025-11-27T19:00:00.000Z" }
 */
router.post('/set-time', checkTestMode, (req, res) => {
  try {
    const { time } = req.body;

    if (!time) {
      return res.status(400).json({
        success: false,
        message: 'Time parameter is required. Format: ISO string (e.g., "2025-11-27T19:00:00.000Z")'
      });
    }

    setVirtualTime(time);
    const status = getTimeStatus();

    res.json({
      success: true,
      message: 'Virtual time set successfully',
      currentTime: getSystemTime().toISOString(),
      status
    });
  } catch (error) {
    console.error('Error setting virtual time:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting virtual time',
      error: error.message
    });
  }
});

/**
 * POST /api/test/reset-time
 * Reset to real time
 */
router.post('/reset-time', checkTestMode, (req, res) => {
  try {
    resetTime();
    const status = getTimeStatus();

    res.json({
      success: true,
      message: 'Time reset to real time',
      currentTime: getSystemTime().toISOString(),
      status
    });
  } catch (error) {
    console.error('Error resetting time:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting time',
      error: error.message
    });
  }
});

/**
 * GET /api/test/current-time
 * Get current system time (real or virtual)
 */
router.get('/current-time', checkTestMode, (req, res) => {
  try {
    const status = getTimeStatus();

    res.json({
      success: true,
      currentTime: getSystemTime().toISOString(),
      status
    });
  } catch (error) {
    console.error('Error getting current time:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting current time',
      error: error.message
    });
  }
});

/**
 * GET /api/test/email-config
 * Check email configuration status
 */
router.get('/email-config', (req, res) => {
  try {
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_APP_PASSWORD;

    res.json({
      success: true,
      config: {
        hasEmailUser: !!emailUser,
        hasEmailPassword: !!emailPassword,
        emailUser: emailUser ? emailUser.substring(0, 5) + '***' : null,
        nodeEnv: process.env.NODE_ENV
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking email config',
      error: error.message
    });
  }
});

/**
 * POST /api/test/send-test-email
 * Send a test email to verify configuration
 * Body: { email: "test@example.com" }
 */
router.post('/send-test-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email parameter is required'
      });
    }

    const emailService = require('../services/emailService');

    // First verify configuration
    const configTest = await emailService.testEmailConfig();
    if (!configTest.success) {
      return res.status(500).json({
        success: false,
        message: 'Email server not configured properly',
        error: configTest.error
      });
    }

    // Send test email
    const result = await emailService.sendEnrollmentNotification({
      name: 'Test User',
      email: email,
      employeeId: 'TEST001',
      fingerprintId: 999,
      username: 'TEST001',
      password: 'testpassword123'
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'Test email sent successfully!',
        messageId: result.messageId,
        sentTo: email
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending test email',
      error: error.message
    });
  }
});

/**
 * POST /api/test/reset-password
 * Reset password for a user (for testing purposes)
 * Body: { username: "EMP001", newPassword: "test1234" }
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'username and newPassword are required'
      });
    }

    const User = require('../models/User');
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User not found: ${username}`
      });
    }

    // Reset password - pre-save hook will hash it
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: `Password reset for user: ${username}`,
      newPassword: newPassword,
      note: 'Use this password to login!'
    });

  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password',
      error: error.message
    });
  }
});

module.exports = router;

