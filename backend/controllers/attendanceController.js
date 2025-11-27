const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Holiday = require('../models/Holiday');
const EmployeeShift = require('../models/EmployeeShift');
const attendanceHelper = require('../utils/attendanceHelper');
const { getSystemTime } = require('../utils/timeMachine');
const moment = require('moment-timezone');

moment.tz.setDefault('Asia/Ho_Chi_Minh');

// Helper function to get employee's shift for a specific date
const getEmployeeShiftForDate = async (employeeId, date) => {
  const queryDate = moment(date).toDate();
  const employeeShift = await EmployeeShift.findOne({
    employee: employeeId,
    startDate: { $lte: queryDate },
    $or: [
      { endDate: null },
      { endDate: { $gte: queryDate } }
    ],
    isActive: true
  }).populate('shift');

  return employeeShift?.shift || null;
};

// Helper function to determine status based on shift and time
const determineStatusFromShift = (customTime, shift, actionType) => {
  if (!shift) return null; // No shift assigned, use default logic

  const timeStr = moment(customTime).format('HH:mm');
  const [shiftStartHour, shiftStartMin] = shift.startTime.split(':').map(Number);
  const [shiftEndHour, shiftEndMin] = shift.endTime.split(':').map(Number);
  
  const shiftStartMinutes = shiftStartHour * 60 + shiftStartMin;
  const shiftEndMinutes = shiftEndHour * 60 + shiftEndMin;
  const [timeHour, timeMin] = timeStr.split(':').map(Number);
  const timeMinutes = timeHour * 60 + timeMin;
  
  const gracePeriod = shift.gracePeriod || 15;

  if (actionType === 'checkin') {
    if (timeMinutes <= shiftStartMinutes + gracePeriod) {
      return 'on-time';
    } else {
      return 'late';
    }
  } else if (actionType === 'checkout') {
    if (timeMinutes < shiftEndMinutes) {
      return 'early';
    } else if (timeMinutes > shiftEndMinutes) {
      return 'overtime';
    } else {
      return 'on-time';
    }
  }
  return null;
};

// Add manual attendance record
exports.addAttendance = async (req, res) => {
  try {
    const { employeeId, fingerprintId, type, fingerId, action } = req.body;
    
    console.log('=== ATTENDANCE REQUEST ===');
    console.log('Time:', getSystemTime().toISOString());
    console.log('Request body:', req.body);
    console.log('EmployeeId:', employeeId);
    console.log('FingerId:', fingerId);
    console.log('Action:', action);
    console.log('Type:', type);
    console.log('IP:', req.ip || req.connection.remoteAddress);

    // 1. Tìm Employee
    let employee;
    if (employeeId) {
      employee = await Employee.findById(employeeId);
    } else if (fingerId) {
      console.log('Looking for employee with fingerprintId:', fingerId);
      employee = await Employee.findOne({ fingerprintId: fingerId });
      
      if (!employee) {
        console.log('Employee not found with fingerprintId:', fingerId);
        return res.status(404).json({
          success: false,
          message: 'Employee not found with this fingerprint ID',
          fingerId: fingerId
        });
      }
      
      // SECURITY CHECK: Verify fingerprint enrollment
      if (!employee.fingerprintEnrolled) {
        console.log('SECURITY ALERT: Employee not enrolled but trying to check-in:', employee.name);
        return res.status(403).json({
          success: false,
          message: 'Employee fingerprint not enrolled - please enroll first',
          fingerId: fingerId,
          employeeId: employee.employeeId,
          securityAlert: true,
          what: 'enroll-required',
          action: 'enroll-first'
        });
      }
      
      console.log('Found employee:', employee.name, 'ID:', employee.employeeId, 'Enrolled:', employee.fingerprintEnrolled);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either employeeId or fingerId is required'
      });
    }

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // 2. Chống Spam (5 phút)
    const lastRecord = await Attendance.findOne({ employee: employee._id }).sort({ updatedAt: -1 });
    if (lastRecord) {
      const now = getSystemTime();
      const diffMinutes = moment(now).diff(moment(lastRecord.updatedAt), 'minutes');
      // Chỉ chặn nếu < 5 phút và cùng một ngày làm việc (tránh chặn nếu checkout hôm qua rồi checkin hôm nay)
      const isSameDay = moment(lastRecord.date).isSame(moment(now), 'day');
      
      if (diffMinutes < 5 && isSameDay) {
        console.log(`Spam prevention: blocked ${employee.name}`);
        // Trả về 200 để ESP32 không báo lỗi, nhưng kèm what='ignored'
        return res.status(200).json({ 
          success: true, 
          message: 'Thao tác quá nhanh', 
          what: 'ignored' 
        });
      }
    }

    // 3. Thời gian (Time Machine ready)
    const now = getSystemTime();
    const today = moment(now).startOf('day').toDate();
    const currentHour = now.getHours();
    
    // Lấy Settings
    const allSettings = await attendanceHelper.getAllSettings();
    const latePolicy = allSettings['late-policy'] || {};
    const otSettings = allSettings['overtime'] || {};
    const workSettings = allSettings['working-hours'] || { endTime: '17:00' };
    
    // Lương
    const baseSalary = employee.baseSalary || employee.salary || 0;
    const dailyRate = baseSalary > 0 ? (baseSalary / 26) : 0;
    const hourlyRate = dailyRate / 8;

    // Tìm bản ghi hôm nay
    let attendance = await Attendance.findOne({ employee: employee._id, date: today });
    
    // Logic Auto xác định Action
    let actionType = type || action;
    if (actionType === 'auto') {
      if (!attendance) {
        actionType = 'checkin';
        console.log('Auto mode: Check-in needed - no attendance record for today');
      } else if (!attendance.checkIn || !attendance.checkIn.time) {
        actionType = 'checkin';
        console.log('Auto mode: Check-in needed - has record but no check-in time');
      } else if (!attendance.checkOut || !attendance.checkOut.time) {
        actionType = 'checkout';
        console.log('Auto mode: Check-out needed - has check-in but no check-out');
      } else {
        console.log('Auto mode: Already completed today - has both check-in and check-out');
        return res.json({ 
          success: true, 
          message: 'Done for today', 
          what: 'done' 
        });
      }
    }

    // === XỬ LÝ CHECK-IN ===
    if (actionType === 'checkin') {
      // Logic xác định status Check-in
      const workStartTime = allSettings['working-hours']?.startTime || '08:00';
      const lateMinutes = attendanceHelper.calculateLateMinutes(now, workStartTime, latePolicy.graceMinutes || 15);
      let checkInStatus = lateMinutes > 0 ? 'late' : 'on-time';

      // Logic phạt "Nội quy thép"
      let actualPenalty = 0;
      let status = 'present';

      // 1. Phạt tiền đi muộn
      if (lateMinutes > 0) {
        actualPenalty += attendanceHelper.calculateLatePenalty(lateMinutes, latePolicy);
      }

      // 2. Phạt nửa công nếu muộn quá ngưỡng
      const halfDayThreshold = latePolicy.halfDayThreshold || 60;
      if (lateMinutes > halfDayThreshold) {
        status = 'half-day';
        checkInStatus = 'late'; // Vẫn là late nhưng nặng hơn
        // Cộng phạt nửa ngày lương (để hiển thị)
        actualPenalty += (dailyRate * 0.5); 
      }

      // Check if today is a holiday
      const holiday = await attendanceHelper.isHoliday(today);
      const isHoliday = !!holiday;
      const holidayRate = holiday ? holiday.workRate : 1.0;

      if (!attendance) {
        attendance = new Attendance({
          employee: employee._id,
          fingerprintId: fingerprintId || employee.fingerprintId,
          date: today,
          checkIn: { time: now, status: checkInStatus },
          status: status,
          lateMinutes,
          actualPenalty,   
          estimatedOTSalary: 0,
          isHoliday,
          holidayRate
        });
      } else {
        // Nếu đã có record (ví dụ do lỗi), update lại
        attendance.checkIn = { time: now, status: checkInStatus };
        attendance.status = status;
        attendance.actualPenalty = actualPenalty;
        attendance.lateMinutes = lateMinutes;
        attendance.isHoliday = isHoliday;
        attendance.holidayRate = holidayRate;
      }
      
      await attendance.save();

      console.log('Check-in successful - returning what: in');
      return res.status(200).json({ 
        success: true, 
        message: 'Check-in thành công', 
        data: attendance,
        what: 'in' 
      });
    } 
    
    // === XỬ LÝ CHECK-OUT ===
    else if (actionType === 'checkout') {
      // [QUAN TRỌNG] Kiểm tra bắt buộc Check-in
      if (!attendance || !attendance.checkIn || !attendance.checkIn.time) {
        console.error("Lỗi: Cố gắng Checkout khi chưa Checkin");
        return res.status(400).json({
          success: false,
          message: 'Bạn chưa Check-in nên không thể Check-out!',
          what: 'error',
          needInFirst: true
        });
      }

      // 1. Tính trạng thái ra về (Sớm/Đúng/OT)
      const endTimeParts = workSettings.endTime.split(':');
      const standardEndHour = parseInt(endTimeParts[0]);
      const standardEndMin = parseInt(endTimeParts[1]);
      
      let checkOutStatus = 'on-time';
      if (now.getHours() < standardEndHour) {
        checkOutStatus = 'early';
      } else if (now.getHours() > standardEndHour || (now.getHours() === standardEndHour && now.getMinutes() > standardEndMin + 30)) {
        checkOutStatus = 'overtime';
      }

      // 2. Tính giờ làm việc & OT
      const workingHours = attendanceHelper.calculateWorkingHours(attendance.checkIn.time, now);
      const overtimeHours = attendanceHelper.calculateOvertimeHours(attendance.checkIn.time, now, 8); // Giả sử chuẩn 8h
      
      // 3. Tính tiền OT
      let estimatedOTSalary = 0;
      let otRate = 1.0;
      
      if (overtimeHours > 0) {
        otRate = await attendanceHelper.getOvertimeRate(today, attendance.isHoliday || false, otSettings);
        estimatedOTSalary = Math.round(overtimeHours * hourlyRate * otRate);
      }

      // Cập nhật
      attendance.checkOut = { time: now, status: checkOutStatus };
      attendance.workingHours = workingHours;
      attendance.overtimeHours = Math.max(0, overtimeHours);
      attendance.overtimeRate = otRate;
      attendance.estimatedOTSalary = estimatedOTSalary;

      await attendance.save();

      console.log('Check-out successful - returning what: out');
      return res.status(200).json({ 
        success: true, 
        message: 'Check-out thành công', 
        data: attendance,
        what: 'out' 
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid attendance type. Use "checkin" or "checkout"'
      });
    }

  } catch (error) {
    console.error('Attendance Error:', error);
    // Trả về 500 để ESP32 biết là lỗi
    res.status(500).json({ 
      success: false, 
      message: error.message,
      error: error.stack 
    });
  }
};

// Handle fingerprint attendance
exports.handleAttendance = async (req, res) => {
  try {
    const { fingerprintId } = req.body;

    // Find employee by fingerprint ID
    const employee = await Employee.findOne({ fingerprintId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found with this fingerprint'
      });
    }

    const now = getSystemTime();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Check if attendance record exists for today
    let attendance = await Attendance.findOne({
      employee: employee._id,
      date: today
    });

    const WORK_START_HOUR = 9; // 9:00 AM
    const WORK_END_HOUR = 17;  // 5:00 PM

    if (!attendance) {
      // Create new attendance record (Check-in)
      const checkInStatus = currentHour > WORK_START_HOUR ? 'late' : 'on-time';
      
      attendance = new Attendance({
        employee: employee._id,
        fingerprintId,
        date: today,
        checkIn: {
          time: now,
          status: checkInStatus
        },
        status: 'present'
      });

      await attendance.save();

      return res.status(200).json({
        success: true,
        message: 'Check-in recorded successfully',
        data: attendance,
        what: "in"
      });
    } else if (!attendance.checkOut.time) {
      // Update existing attendance record (Check-out)
      const checkOutStatus = 
        currentHour < WORK_END_HOUR ? 'early' :
        currentHour > WORK_END_HOUR ? 'overtime' : 'on-time';

      // Calculate working hours
      const checkInTime = attendance.checkIn.time;
      const workingHours = (now - checkInTime) / (1000 * 60 * 60); // Convert to hours

      attendance.checkOut = {
        time: now,
        status: checkOutStatus
      };
      attendance.workingHours = workingHours;

      await attendance.save();

      return res.status(200).json({
        success: true,
        message: 'Check-out recorded successfully',
        data: attendance,
        what: "out"
      });
    } else {
      // Already checked out
      return res.status(200).json({
        success: true,
        message: 'Already checked out for today',
        data: attendance,
        what: "done"
      });
    }

  } catch (error) {
    console.error('Error in handleAttendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing attendance',
      error: error.message
    });
  }
};

// Get attendance records for an employee
exports.getEmployeeAttendance = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;

    const query = { employee: employeeId };
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendance = await Attendance.find(query)
      .populate('employee', 'name employeeId')
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance records',
      error: error.message
    });
  }
};

// Get today's attendance for all employees
exports.getTodayAttendance = async (req, res) => {
  try {
    // Use UTC date to match existing records
    const now = getSystemTime();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    console.log('Fetching today\'s attendance for date:', today);
    console.log('Current time:', now);

    const attendance = await Attendance.find({
      date: today
    }).populate('employee', 'name employeeId department');

    console.log('Found attendance records:', attendance.length);

    res.status(200).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error('Error fetching today\'s attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching today\'s attendance',
      error: error.message
    });
  }
};

// Get all attendance records
exports.getAllAttendance = async (req, res) => {
  try {
    const { startDate, endDate, limit = 100 } = req.query;
    
    console.log('getAllAttendance - Query params:', { startDate, endDate, limit });
    
    const query = {};
    
    if (startDate && endDate) {
      // Parse dates - Dates in DB are stored as UTC (e.g., "2025-11-10T00:00:00.000Z")
      // Frontend sends "YYYY-MM-DD" format, convert to UTC date range
      const start = moment.utc(startDate).startOf('day').toDate();
      const end = moment.utc(endDate).endOf('day').toDate();
      
      query.date = {
        $gte: start,
        $lte: end
      };
      
      console.log('getAllAttendance - Date range:', { 
        startDate, 
        endDate,
        startUTC: start.toISOString(), 
        endUTC: end.toISOString()
      });
    }

    const attendance = await Attendance.find(query)
      .populate({
        path: 'employee',
        select: 'name employeeId department',
        model: 'Employee'
      })
      .sort({ date: -1, createdAt: -1 })
      .limit(parseInt(limit));

    console.log('getAllAttendance - Found records:', attendance.length);
    if (attendance.length > 0) {
      console.log('getAllAttendance - First record:', {
        _id: attendance[0]._id,
        date: attendance[0].date,
        employee: attendance[0].employee?.name || 'NO EMPLOYEE',
        checkIn: attendance[0].checkIn?.time
      });
    }

    res.status(200).json({
      success: true,
      data: attendance,
      count: attendance.length
    });
  } catch (error) {
    console.error('getAllAttendance - Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance records',
      error: error.message
    });
  }
};

// Delete today's attendance records (for testing)
exports.deleteTodayAttendance = async (req, res) => {
  try {
    const today = getSystemTime();
    today.setHours(0, 0, 0, 0);

    const result = await Attendance.deleteMany({
      date: today
    });

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} attendance records for today`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting today\'s attendance',
      error: error.message
    });
  }
};

// Delete all attendance records (for testing)
exports.deleteAllAttendance = async (req, res) => {
  try {
    const result = await Attendance.deleteMany({});

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} attendance records`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting all attendance records',
      error: error.message
    });
  }
};