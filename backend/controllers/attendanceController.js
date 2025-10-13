const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');

// Add manual attendance record
exports.addAttendance = async (req, res) => {
  try {
    const { employeeId, fingerprintId, type, timestamp, fingerId, action } = req.body;
    
    console.log('=== ATTENDANCE REQUEST ===');
    console.log('Time:', new Date().toISOString());
    console.log('Request body:', req.body);
    console.log('EmployeeId:', employeeId);
    console.log('FingerId:', fingerId);
    console.log('Action:', action);
    console.log('Type:', type);
    console.log('IP:', req.ip || req.connection.remoteAddress);

    // Handle both manual (employeeId) and ESP32 (fingerId) requests
    let employee;
    if (employeeId) {
      // Manual attendance from frontend
      employee = await Employee.findById(employeeId);
    } else if (fingerId) {
      // ESP32 attendance by fingerprint ID
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

    const now = new Date(timestamp || new Date());
    // Use UTC date for consistency with existing records
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    // Check if attendance record exists for today
    let attendance = await Attendance.findOne({
      employee: employee._id,
      date: today
    });

    const WORK_START_HOUR = 9; // 9:00 AM
    const WORK_END_HOUR = 17;  // 5:00 PM
    
    // Use current hour for status calculation
    const currentHour = now.getHours();

    // Determine action type
    let actionType = type || action;
    console.log('Action type determined:', actionType);
    console.log('Existing attendance record:', attendance ? 'Found' : 'Not found');
    console.log('Check-in time:', attendance?.checkIn?.time || 'None');
    console.log('Check-out time:', attendance?.checkOut?.time || 'None');
    
    if (actionType === 'auto') {
      // ESP32 auto mode - determine based on existing records
      if (!attendance) {
        // No attendance record for today - create check-in
        actionType = 'checkin';
        console.log('Auto mode: Check-in needed - no attendance record for today');
      } else if (!attendance.checkIn || !attendance.checkIn.time) {
        // Has attendance record but no check-in - create check-in
        actionType = 'checkin';
        console.log('Auto mode: Check-in needed - has record but no check-in time');
      } else if (!attendance.checkOut || !attendance.checkOut.time) {
        // Has check-in but no check-out - create check-out
        actionType = 'checkout';
        console.log('Auto mode: Check-out needed - has check-in but no check-out');
      } else {
        // Already completed today - has both check-in and check-out
        console.log('Auto mode: Already completed today - has both check-in and check-out');
        return res.status(200).json({
          success: true,
          message: 'Already completed for today',
          what: 'done',
          status: 'completed',
          action: 'completed',
          data: attendance
        });
      }
    }

    if (actionType === 'checkin') {
      if (attendance && attendance.checkIn && attendance.checkIn.time) {
        console.log('Employee already checked in today - returning in-exists');
        return res.status(200).json({
          success: true,
          message: 'Already checked in for today',
          what: 'in-exists',
          status: 'already-checkin',
          action: 'checkin',
          data: attendance
        });
      }

      const checkInStatus = currentHour > WORK_START_HOUR ? 'late' : 'on-time';
      
      if (!attendance) {
        // Create new attendance record
        attendance = new Attendance({
          employee: employee._id,
          fingerprintId: fingerprintId || employee.fingerprintId,
          date: today,
          checkIn: {
            time: now,
            status: checkInStatus
          },
          status: 'present'
        });
      } else {
        // Update existing record
        attendance.checkIn = {
          time: now,
          status: checkInStatus
        };
        attendance.status = 'present';
      }

      await attendance.save();

      console.log('Check-in successful - returning what: in');
      return res.status(200).json({
        success: true,
        message: 'Check-in recorded successfully',
        data: attendance,
        what: 'in',
        status: 'checkin',
        action: 'checkin'
      });

    } else if (actionType === 'checkout') {
      if (!attendance || !attendance.checkIn || !attendance.checkIn.time) {
        console.log('Cannot check out - no check-in found');
        return res.status(400).json({
          success: false,
          message: 'Must check in before checking out',
          needInFirst: true
        });
      }

      if (attendance.checkOut && attendance.checkOut.time) {
        console.log('Already checked out today - returning done');
        return res.status(200).json({
          success: true,
          message: 'Already checked out for today',
          what: 'done',
          status: 'already-checkout',
          action: 'checkout',
          data: attendance
        });
      }

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

      console.log('Check-out successful - returning what: out');
      return res.status(200).json({
        success: true,
        message: 'Check-out recorded successfully',
        data: attendance,
        what: 'out',
        status: 'checkout',
        action: 'checkout'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid attendance type. Use "checkin" or "checkout"'
      });
    }

  } catch (error) {
    console.error('Error in addAttendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording attendance',
      error: error.message
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

    const now = new Date();
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
    const now = new Date();
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
    
    const query = {};
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendance = await Attendance.find(query)
      .populate('employee', 'name employeeId department')
      .sort({ date: -1, createdAt: -1 })
      .limit(parseInt(limit));

    console.log('getAllAttendance - Found records:', attendance.length);
    console.log('getAllAttendance - First record:', attendance[0]);
    console.log('getAllAttendance - First record employee:', attendance[0]?.employee);

    res.status(200).json({
      success: true,
      data: attendance,
      count: attendance.length
    });
  } catch (error) {
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
    const today = new Date();
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
