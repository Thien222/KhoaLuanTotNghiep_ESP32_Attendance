/**
 * TIME MACHINE CONTROLLER
 * Cho phép admin set thời gian ảo để test hệ thống
 * ⚠️ CHỈ SỬ DỤNG TRONG MÔI TRƯỜNG TEST!
 */

const { getSystemTime, setVirtualTime, resetTime, isTimeMachineActive } = require('../utils/timeMachine');
const moment = require('moment-timezone');

moment.tz.setDefault('Asia/Ho_Chi_Minh');

/**
 * Get Time Machine Status
 * GET /api/timemachine/status
 */
exports.getStatus = async (req, res) => {
  try {
    const isActive = isTimeMachineActive();
    const currentTime = getSystemTime();
    const realTime = new Date();

    res.status(200).json({
      success: true,
      data: {
        active: isActive,
        currentTime: currentTime.toISOString(),
        realTime: realTime.toISOString(),
        difference: isActive ? moment(currentTime).diff(moment(realTime), 'seconds') : 0,
        timezone: 'Asia/Ho_Chi_Minh'
      }
    });
  } catch (error) {
    console.error('Time Machine Status Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Set Virtual Time
 * POST /api/timemachine/set
 * Body: { datetime: "2025-11-28T14:30:00" }
 */
exports.setTime = async (req, res) => {
  try {
    // SECURITY: Middleware đã check role rồi, nhưng giữ lại để đảm bảo
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Chưa xác thực'
      });
    }

    const { datetime } = req.body;

    if (!datetime) {
      return res.status(400).json({
        success: false,
        message: 'datetime is required (ISO format)'
      });
    }

    // Parse datetime - Frontend gửi ISO string (ví dụ: "2025-11-19T10:00:00.000Z")
    // Cần parse và convert về timezone Asia/Ho_Chi_Minh
    let targetTime;
    
    if (typeof datetime === 'string') {
      // Nếu có 'Z' hoặc timezone offset -> parse như UTC rồi convert
      if (datetime.includes('Z') || datetime.match(/[+-]\d{2}:\d{2}$/)) {
        targetTime = moment.utc(datetime).tz('Asia/Ho_Chi_Minh');
      } else {
        // Không có timezone -> parse như local time rồi set timezone
        targetTime = moment.tz(datetime, 'Asia/Ho_Chi_Minh');
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'datetime must be a string'
      });
    }
    
    if (!targetTime.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid datetime format. Use ISO format (YYYY-MM-DDTHH:mm:ss)'
      });
    }

    // Convert về Date object (UTC internally, nhưng giữ nguyên giá trị thời gian)
    // Ví dụ: 10:00 Asia/Ho_Chi_Minh -> Date object tương ứng
    const targetDate = targetTime.toDate();
    
    console.log(`🕒 [TIME MACHINE] Parsed datetime: ${datetime}`);
    console.log(`🕒 [TIME MACHINE] Target time (Asia/Ho_Chi_Minh): ${targetTime.format('YYYY-MM-DD HH:mm:ss')}`);
    console.log(`🕒 [TIME MACHINE] Target Date object: ${targetDate.toISOString()}`);
    
    setVirtualTime(targetDate);

    const userIdentifier = req.user.email || req.user.username || req.user.userId || 'Unknown';
    console.log(`⏰ [TIME MACHINE] Manager ${userIdentifier} set time to: ${targetTime.format('YYYY-MM-DD HH:mm:ss')}`);

    res.status(200).json({
      success: true,
      message: 'Thời gian ảo đã được thiết lập',
      data: {
        active: true,
        virtualTime: targetTime.toISOString(),
        realTime: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Time Machine Set Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Reset to Real Time
 * POST /api/timemachine/reset
 */
exports.resetToRealTime = async (req, res) => {
  try {
    // SECURITY: Middleware đã check role rồi
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Chưa xác thực'
      });
    }

    resetTime();

    const userIdentifier = req.user.email || req.user.username || req.user.userId || 'Unknown';
    console.log(`⏰ [TIME MACHINE] Manager ${userIdentifier} reset to real time`);

    res.status(200).json({
      success: true,
      message: 'Đã reset về thời gian thật',
      data: {
        active: false,
        currentTime: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Time Machine Reset Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Fast Forward (Tua nhanh thời gian)
 * POST /api/timemachine/fastforward
 * Body: { 
 *   amount: 1, 
 *   unit: 'hours' // 'minutes', 'hours', 'days', 'weeks', 'months'
 * }
 */
exports.fastForward = async (req, res) => {
  try {
    // SECURITY: Middleware đã check role rồi
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Chưa xác thực'
      });
    }

    const { amount = 1, unit = 'hours' } = req.body;

    if (!['minutes', 'hours', 'days', 'weeks', 'months'].includes(unit)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid unit. Use: minutes, hours, days, weeks, months'
      });
    }

    const currentTime = getSystemTime();
    const newTime = moment(currentTime).add(amount, unit).toDate();

    setVirtualTime(newTime);

    const userIdentifier = req.user.email || req.user.username || req.user.userId || 'Unknown';
    console.log(`⏰ [TIME MACHINE] Manager ${userIdentifier} fast forward ${amount} ${unit}`);

    res.status(200).json({
      success: true,
      message: `Đã tua nhanh ${amount} ${unit}`,
      data: {
        active: true,
        oldTime: currentTime.toISOString(),
        newTime: newTime.toISOString(),
        amount,
        unit
      }
    });
  } catch (error) {
    console.error('Time Machine Fast Forward Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Jump to Specific Scenario (Nhảy đến kịch bản test cụ thể)
 * POST /api/timemachine/scenario
 * Body: { scenario: 'on-time' | 'late-15min' | 'late-2h' | 'overtime' | 'early-leave' }
 */
exports.jumpToScenario = async (req, res) => {
  try {
    // SECURITY: Middleware đã check role rồi
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Chưa xác thực'
      });
    }

    const { scenario } = req.body;
    const scenarios = {
      'on-time': { hour: 7, minute: 50, description: 'Đúng giờ (7h50)' },
      'grace-period': { hour: 8, minute: 2, description: 'Trong grace period (8h02)' },
      'late-15min': { hour: 8, minute: 20, description: 'Muộn 15 phút (8h20)' },
      'late-1h': { hour: 9, minute: 0, description: 'Muộn 1 giờ (9h00)' },
      'late-2h': { hour: 10, minute: 5, description: 'Muộn >= 2h (10h05)' },
      'checkout-ontime': { hour: 17, minute: 0, description: 'Checkout đúng giờ (17h00)' },
      'checkout-early': { hour: 16, minute: 0, description: 'Về sớm (16h00)' },
      'checkout-no-ot': { hour: 18, minute: 30, description: 'Checkout 18h30 (không OT)' },
      'checkout-ot-1h': { hour: 20, minute: 0, description: 'Checkout 20h (OT 1h)' },
      'checkout-ot-3h': { hour: 22, minute: 0, description: 'Checkout 22h (OT 3h)' }
    };

    if (!scenarios[scenario]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scenario',
        availableScenarios: Object.keys(scenarios)
      });
    }

    const config = scenarios[scenario];
    // Set thời gian cho ngày hôm nay với giờ cụ thể (timezone Asia/Ho_Chi_Minh)
    const now = moment.tz('Asia/Ho_Chi_Minh')
      .hour(config.hour)
      .minute(config.minute)
      .second(0)
      .millisecond(0);
    
    console.log(`🕒 [TIME MACHINE] Scenario: ${scenario} -> ${now.format('YYYY-MM-DD HH:mm:ss')} (Asia/Ho_Chi_Minh)`);
    
    setVirtualTime(now.toDate());

    const userIdentifier = req.user.email || req.user.username || req.user.userId || 'Unknown';
    console.log(`⏰ [TIME MACHINE] Manager ${userIdentifier} jumped to scenario: ${scenario}`);

    res.status(200).json({
      success: true,
      message: `Đã nhảy đến kịch bản: ${config.description}`,
      data: {
        scenario,
        description: config.description,
        virtualTime: now.toISOString()
      }
    });
  } catch (error) {
    console.error('Time Machine Scenario Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Module exports are already defined above using exports.xxx

