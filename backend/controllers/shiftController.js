const Shift = require('../models/Shift');
const EmployeeShift = require('../models/EmployeeShift');
const Employee = require('../models/Employee');
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

      // Create new assignment
      const employeeShift = new EmployeeShift({
        employee: employeeId,
        shift: shiftId,
        startDate: assignedDate
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




