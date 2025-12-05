const Shift = require('../models/Shift');
const EmployeeShift = require('../models/EmployeeShift');
const Employee = require('../models/Employee');
const OvertimeRequest = require('../models/OvertimeRequest');
const moment = require('moment-timezone');

moment.tz.setDefault('Asia/Ho_Chi_Minh');

// Get all shifts
exports.getAllShifts = async (req, res) => {
  try {
    const shifts = await Shift.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json({
      success: true,
      data: shifts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching shifts',
      error: error.message
    });
  }
};

// Get shift by ID
exports.getShiftById = async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id);
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }
    res.status(200).json({
      success: true,
      data: shift
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching shift',
      error: error.message
    });
  }
};

// Create new shift
exports.createShift = async (req, res) => {
  try {
    const { name, startTime, endTime, gracePeriod, isHoliday, description } = req.body;

    // Validate time format
    if (!/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(startTime) || !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(endTime)) {
      return res.status(400).json({
        success: false,
        message: 'Time must be in HH:mm format'
      });
    }

    const shift = new Shift({
      name,
      startTime,
      endTime,
      gracePeriod: gracePeriod || 15,
      isHoliday: isHoliday || false,
      description
    });

    await shift.save();

    res.status(201).json({
      success: true,
      message: 'Shift created successfully',
      data: shift
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Shift name already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error creating shift',
      error: error.message
    });
  }
};

// Update shift
exports.updateShift = async (req, res) => {
  try {
    const { name, startTime, endTime, gracePeriod, isHoliday, description, isActive } = req.body;

    const shift = await Shift.findById(req.params.id);
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }

    if (startTime && !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(startTime)) {
      return res.status(400).json({
        success: false,
        message: 'Start time must be in HH:mm format'
      });
    }

    if (endTime && !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(endTime)) {
      return res.status(400).json({
        success: false,
        message: 'End time must be in HH:mm format'
      });
    }

    if (name) shift.name = name;
    if (startTime) shift.startTime = startTime;
    if (endTime) shift.endTime = endTime;
    if (gracePeriod !== undefined) shift.gracePeriod = gracePeriod;
    if (isHoliday !== undefined) shift.isHoliday = isHoliday;
    if (description !== undefined) shift.description = description;
    if (isActive !== undefined) shift.isActive = isActive;

    await shift.save();

    res.status(200).json({
      success: true,
      message: 'Shift updated successfully',
      data: shift
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Shift name already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error updating shift',
      error: error.message
    });
  }
};

// Delete shift
exports.deleteShift = async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id);
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }

    // Check if shift is assigned to any employees
    const assignedCount = await EmployeeShift.countDocuments({ shift: req.params.id, isActive: true });
    if (assignedCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete shift. It is assigned to ${assignedCount} employee(s)`
      });
    }

    await Shift.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Shift deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting shift',
      error: error.message
    });
  }
};

// Get employee's current shift
exports.getEmployeeShift = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { date } = req.query; // Optional: check shift for specific date

    const queryDate = date ? moment(date).toDate() : moment().toDate();

    const employeeShift = await EmployeeShift.findOne({
      employee: employeeId,
      startDate: { $lte: queryDate },
      $or: [
        { endDate: null },
        { endDate: { $gte: queryDate } }
      ],
      isActive: true
    }).populate('shift');

    if (!employeeShift || !employeeShift.shift) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No shift assigned'
      });
    }

    res.status(200).json({
      success: true,
      data: employeeShift
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching employee shift',
      error: error.message
    });
  }
};

// Assign shift to employees
exports.assignShift = async (req, res) => {
  try {
    const { employeeIds, shiftId, startDate } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Employee IDs array is required'
      });
    }

    if (!shiftId) {
      return res.status(400).json({
        success: false,
        message: 'Shift ID is required'
      });
    }

    // Verify shift exists
    const shift = await Shift.findById(shiftId);
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }

    // Determine if this is an OT shift
    // Check: 1) isOvertimeShift flag, 2) shift name contains "OT", 3) startTime >= 18:00
    const shiftName = (shift.name || '').toUpperCase();
    const [startHour] = (shift.startTime || '00:00').split(':').map(Number);
    const isOTShift = shiftName.includes('OT') || shiftName.includes('OVERTIME') || startHour >= 18;

    const assignedDate = startDate ? moment(startDate).toDate() : moment().toDate();
    const assignments = [];

    for (const employeeId of employeeIds) {
      // Verify employee exists
      const employee = await Employee.findById(employeeId);
      if (!employee) {
        continue; // Skip invalid employee IDs
      }

      // Deactivate previous active shifts
      await EmployeeShift.updateMany(
        { employee: employeeId, isActive: true },
        { isActive: false, endDate: assignedDate }
      );

      // Create new assignment with isOvertimeShift flag
      const employeeShift = new EmployeeShift({
        employee: employeeId,
        shift: shiftId,
        startDate: assignedDate,
        isOvertimeShift: isOTShift // Auto-detect OT shift
      });

      await employeeShift.save();
      assignments.push(employeeShift);
    }

    res.status(201).json({
      success: true,
      message: `Shift assigned to ${assignments.length} employee(s)`,
      data: assignments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error assigning shift',
      error: error.message
    });
  }
};

// Get employee shift assignments for a specific date
exports.getShiftAssignments = async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }
    
    const targetDate = moment(date).toDate();
    const startOfDay = moment(targetDate).startOf('day').toDate();
    const endOfDay = moment(targetDate).endOf('day').toDate();
    
    // Find all active employee shifts for the given date
    const employeeShifts = await EmployeeShift.find({
      startDate: { $lte: endOfDay },
      $or: [
        { endDate: null },
        { endDate: { $gte: startOfDay } }
      ],
      isActive: true
    })
    .populate('employee', 'name employeeId department email')
    .populate('shift', 'name startTime endTime description')
    .sort({ 'employee.name': 1 });
    
    res.status(200).json({
      success: true,
      data: employeeShifts,
      count: employeeShifts.length,
      date: moment(date).format('YYYY-MM-DD')
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching shift assignments',
      error: error.message
    });
  }
};

// Get all employee shift assignments
exports.getEmployeeShifts = async (req, res) => {
  try {
    const { employeeId, shiftId, activeOnly } = req.query;

    const query = {};
    if (employeeId) query.employee = employeeId;
    if (shiftId) query.shift = shiftId;
    if (activeOnly === 'true') query.isActive = true;

    const employeeShifts = await EmployeeShift.find(query)
      .populate('employee', 'name employeeId department')
      .populate('shift', 'name startTime endTime')
      .sort({ startDate: -1 });

    res.status(200).json({
      success: true,
      data: employeeShifts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching employee shifts',
      error: error.message
    });
  }
};

// Get my OT schedule (for mobile app) - Lấy TẤT CẢ các ngày OT (bao gồm quá khứ)
exports.getMyOTSchedule = async (req, res) => {
  try {
    const employeeId = req.user.employee;
    
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID not found'
      });
    }
    
    // Lấy tất cả active shifts (không filter theo isOvertimeShift để lấy được tất cả)
    const allShifts = await EmployeeShift.find({
      employee: employeeId,
      isActive: true
    })
    .populate('shift', 'name startTime endTime')
    .sort({ startDate: 1 });
    
    // Filter để chỉ lấy OT shifts (check isOvertimeShift hoặc shift name hoặc startTime)
    const filteredOTShifts = allShifts.filter(shift => {
      // Check flag isOvertimeShift
      if (shift.isOvertimeShift === true) {
        console.log(`✅ OT Shift (flag): ${shift.shift?.name}, startDate: ${moment(shift.startDate).format('YYYY-MM-DD')}`);
        return true;
      }
      // Check shift details
      if (shift.shift) {
        const shiftName = (shift.shift.name || '').toUpperCase();
        // Check tên ca chứa "OT"
        if (shiftName.includes('OT') || shiftName.includes('OVERTIME')) {
          console.log(`✅ OT Shift (name): ${shift.shift.name}, startDate: ${moment(shift.startDate).format('YYYY-MM-DD')}`);
          return true;
        }
        // Check giờ bắt đầu >= 18:00
        if (shift.shift.startTime) {
          const [startHour] = shift.shift.startTime.split(':').map(Number);
          if (startHour >= 18) {
            console.log(`✅ OT Shift (time): ${shift.shift.name} (${shift.shift.startTime}), startDate: ${moment(shift.startDate).format('YYYY-MM-DD')}`);
            return true;
          }
        }
      }
      return false;
    });
    
    // Lấy TẤT CẢ approved OT requests (không filter theo ngày)
    const otRequests = await OvertimeRequest.find({
      employee: employeeId,
      status: 'approved'
    }).sort({ date: 1 });
    
    // Combine both sources
    const schedule = [];
    const dateSet = new Set(); // Để tránh trùng lặp
    
    // Chỉ hiển thị startDate của mỗi ca được gán, KHÔNG tạo tất cả các ngày trong khoảng
    // Mỗi EmployeeShift record đại diện cho 1 ca được gán tại 1 ngày cụ thể (startDate)
    // Không tạo các ngày từ startDate đến endDate như trước
    filteredOTShifts.forEach(shift => {
      const startDate = moment(shift.startDate).startOf('day');
      const dateKey = startDate.format('YYYY-MM-DD');
      
      // Chỉ thêm startDate, không tạo các ngày khác trong khoảng
        if (!dateSet.has(dateKey)) {
          schedule.push({
          date: startDate.toDate(),
            shift: shift.shift,
            type: 'shift',
          isOvertimeShift: true,
          employeeShiftId: shift._id
          });
          dateSet.add(dateKey);
      }
    });
    
    // Add OT requests
    otRequests.forEach(request => {
      const dateKey = moment(request.date).format('YYYY-MM-DD');
      if (!dateSet.has(dateKey)) {
        schedule.push({
          date: request.date,
          shift: {
            name: 'OT Request',
            startTime: request.startTime,
            endTime: request.endTime
          },
          type: 'request',
          isOvertimeShift: true
        });
        dateSet.add(dateKey);
      }
    });
    
    // Sort by date
    schedule.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    console.log(`📅 [OT Schedule] Employee ${employeeId}: Found ${schedule.length} OT days`);
    schedule.forEach(s => {
      console.log(`   - ${moment(s.date).format('YYYY-MM-DD')}: ${s.shift?.name} (${s.type})`);
    });
    
    res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching OT schedule',
      error: error.message
    });
  }
};

// Delete employee shift assignment
exports.deleteEmployeeShift = async (req, res) => {
  try {
    const { id } = req.params;
    
    const employeeShift = await EmployeeShift.findById(id);
    if (!employeeShift) {
      return res.status(404).json({
        success: false,
        message: 'Lịch gán ca không tồn tại'
      });
    }
    
    // Xóa hoặc deactivate lịch gán ca
    await EmployeeShift.findByIdAndUpdate(id, {
      isActive: false,
      endDate: moment().toDate()
    });
    
    res.status(200).json({
      success: true,
      message: 'Đã xóa lịch gán ca thành công'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa lịch gán ca',
      error: error.message
    });
  }
};




