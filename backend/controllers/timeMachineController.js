/**
 * TIME MACHINE CONTROLLER
 * Cho phép admin set thời gian ảo để test hệ thống
 * ⚠️ CHỈ SỬ DỤNG TRONG MÔI TRƯỜNG TEST!
 * 
 * Now uses MongoDB for persistence - changes sync across all server instances
 */

const {
  getSystemTime,
  setVirtualTime,
  resetTime,
  isTimeMachineActive,
  getTimeStatus,
  refreshCache
} = require('../utils/timeMachine');
const attendanceHelper = require('../utils/attendanceHelper');
const moment = require('moment-timezone');

moment.tz.setDefault('Asia/Ho_Chi_Minh');

/**
 * Get Time Machine Status
 * GET /api/timemachine/status
 */
exports.getStatus = async (req, res) => {
  try {
    // Refresh cache để đảm bảo dữ liệu mới nhất
    await refreshCache();

    const status = await getTimeStatus();
    const realTime = new Date();

    res.status(200).json({
      success: true,
      data: {
        active: status.isActive,
        currentTime: status.currentTime,
        realTime: status.realTime,
        difference: status.isActive ? status.offsetMinutes * 60 : 0,
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

    const userIdentifier = req.user.email || req.user.username || req.user.userId || 'Unknown';

    // Set virtual time and persist to MongoDB
    await setVirtualTime(targetDate, userIdentifier);

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

    const userIdentifier = req.user.email || req.user.username || req.user.userId || 'Unknown';

    // Reset time and persist to MongoDB
    await resetTime();

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

    const currentTime = await getSystemTime();
    const newTime = moment(currentTime).add(amount, unit).toDate();

    const userIdentifier = req.user.email || req.user.username || req.user.userId || 'Unknown';

    // Set virtual time and persist to MongoDB
    await setVirtualTime(newTime, userIdentifier);

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

    // Lấy settings để tính toán các scenario động
    const allSettings = await attendanceHelper.getAllSettings();
    const workingHours = attendanceHelper.getWorkingHours(allSettings);
    const checkinGateTimes = attendanceHelper.getCheckinGateTimes(allSettings);
    const checkoutGateTimes = attendanceHelper.getCheckoutGateTimes(allSettings);
    const otTimes = attendanceHelper.getOTTimes(allSettings);

    // Parse các giờ từ settings
    const [workStartHour, workStartMin] = workingHours.startTime.split(':').map(Number);
    const [workEndHour, workEndMin] = workingHours.endTime.split(':').map(Number);
    const [checkinOpenHour, checkinOpenMin] = checkinGateTimes.gateOpen.split(':').map(Number);
    const [checkinCloseHour, checkinCloseMin] = checkinGateTimes.gateClose.split(':').map(Number);
    const [checkoutOpenHour, checkoutOpenMin] = checkoutGateTimes.gateOpen.split(':').map(Number);
    const [otStartHour, otStartMin] = otTimes.otStart.split(':').map(Number);
    const [otMinThresholdHour, otMinThresholdMin] = otTimes.otMinThreshold.split(':').map(Number);

    // Tính toán các scenario dựa trên settings
    // on-time: 10 phút trước giờ mở cổng check-in
    const onTimeMoment = moment().hour(checkinOpenHour).minute(checkinOpenMin).subtract(10, 'minutes');
    // grace-period: 2 phút sau giờ đóng cổng check-in
    const gracePeriodMoment = moment().hour(checkinCloseHour).minute(checkinCloseMin).add(2, 'minutes');
    // late-15min: 15 phút sau giờ đóng cổng check-in
    const late15MinMoment = moment().hour(checkinCloseHour).minute(checkinCloseMin).add(15, 'minutes');
    // late-1h: 1 giờ sau giờ đóng cổng check-in
    const late1hMoment = moment().hour(checkinCloseHour).minute(checkinCloseMin).add(1, 'hour');
    // late-2h: 2 giờ sau giờ đóng cổng check-in
    const late2hMoment = moment().hour(checkinCloseHour).minute(checkinCloseMin).add(2, 'hours');
    // checkout-ontime: giờ kết thúc làm việc
    const checkoutOnTimeMoment = moment().hour(workEndHour).minute(workEndMin);
    // checkout-early: 1 giờ trước giờ mở cổng check-out
    const checkoutEarlyMoment = moment().hour(checkoutOpenHour).minute(checkoutOpenMin).subtract(1, 'hour');
    // checkout-no-ot: 30 phút sau giờ bắt đầu OT (nhưng trước threshold)
    const checkoutNoOTMoment = moment().hour(otStartHour).minute(otStartMin).add(30, 'minutes');
    // checkout-ot-1h: 1 giờ sau threshold OT
    const checkoutOT1hMoment = moment().hour(otMinThresholdHour).minute(otMinThresholdMin).add(1, 'hour');
    // checkout-ot-3h: 3 giờ sau threshold OT
    const checkoutOT3hMoment = moment().hour(otMinThresholdHour).minute(otMinThresholdMin).add(3, 'hours');

    const { scenario } = req.body;
    const scenarios = {
      'on-time': {
        hour: onTimeMoment.hour(),
        minute: onTimeMoment.minute(),
        description: `Đúng giờ (${onTimeMoment.format('HH:mm')})`
      },
      'grace-period': {
        hour: gracePeriodMoment.hour(),
        minute: gracePeriodMoment.minute(),
        description: `Trong grace period (${gracePeriodMoment.format('HH:mm')})`
      },
      'late-15min': {
        hour: late15MinMoment.hour(),
        minute: late15MinMoment.minute(),
        description: `Muộn 15 phút (${late15MinMoment.format('HH:mm')})`
      },
      'late-1h': {
        hour: late1hMoment.hour(),
        minute: late1hMoment.minute(),
        description: `Muộn 1 giờ (${late1hMoment.format('HH:mm')})`
      },
      'late-2h': {
        hour: late2hMoment.hour(),
        minute: late2hMoment.minute(),
        description: `Muộn >= 2h (${late2hMoment.format('HH:mm')})`
      },
      'checkout-ontime': {
        hour: checkoutOnTimeMoment.hour(),
        minute: checkoutOnTimeMoment.minute(),
        description: `Checkout đúng giờ (${checkoutOnTimeMoment.format('HH:mm')})`
      },
      'checkout-early': {
        hour: checkoutEarlyMoment.hour(),
        minute: checkoutEarlyMoment.minute(),
        description: `Về sớm (${checkoutEarlyMoment.format('HH:mm')})`
      },
      'checkout-no-ot': {
        hour: checkoutNoOTMoment.hour(),
        minute: checkoutNoOTMoment.minute(),
        description: `Checkout ${checkoutNoOTMoment.format('HH:mm')} (không OT)`
      },
      'checkout-ot-1h': {
        hour: checkoutOT1hMoment.hour(),
        minute: checkoutOT1hMoment.minute(),
        description: `Checkout ${checkoutOT1hMoment.format('HH:mm')} (OT 1h)`
      },
      'checkout-ot-3h': {
        hour: checkoutOT3hMoment.hour(),
        minute: checkoutOT3hMoment.minute(),
        description: `Checkout ${checkoutOT3hMoment.format('HH:mm')} (OT 3h)`
      }
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

    const userIdentifier = req.user.email || req.user.username || req.user.userId || 'Unknown';

    // Set virtual time and persist to MongoDB
    await setVirtualTime(now.toDate(), userIdentifier);

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

