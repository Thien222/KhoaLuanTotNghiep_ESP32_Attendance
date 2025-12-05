const OvertimeRequest = require('../models/OvertimeRequest');
const Employee = require('../models/Employee');
const Shift = require('../models/Shift');
const EmployeeShift = require('../models/EmployeeShift');
const Attendance = require('../models/Attendance');
const Settings = require('../models/Settings');
const attendanceHelper = require('../utils/attendanceHelper');
const moment = require('moment-timezone');

moment.tz.setDefault('Asia/Ho_Chi_Minh');

/**
 * Get OT timeframe from employee's shift and system settings
 * Returns { startTime, endTime, estimatedHours, shift }
 */
const getOTTimeframeFromShift = async (employeeId, date) => {
  try {
    console.log(`[getOTTimeframeFromShift] Starting for employeeId: ${employeeId}, date: ${date}`);
    
    // Verify employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      console.error(`[getOTTimeframeFromShift] Employee not found: ${employeeId}`);
      throw new Error('Không tìm thấy nhân viên');
    }
    
    console.log(`[getOTTimeframeFromShift] Employee found: ${employee.name}`);
    
    // Get employee's active shift assignment from EmployeeShift
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
    
    console.log(`[getOTTimeframeFromShift] EmployeeShift found:`, employeeShift);
    
    // Get system OT settings
    const otSettings = await Settings.findOne({ type: 'ot-rate' });
    const overtimeSettings = await Settings.findOne({ type: 'overtime' });
    const workingHoursSettings = await Settings.findOne({ type: 'working-hours' });
    
    console.log(`[getOTTimeframeFromShift] OT Settings:`, otSettings?.config);
    console.log(`[getOTTimeframeFromShift] Overtime Settings:`, overtimeSettings?.config);
    console.log(`[getOTTimeframeFromShift] Working Hours Settings:`, workingHoursSettings?.config);
    
    // OT start time from ot-rate settings (user configured)
    const systemOTStart = otSettings?.config?.startTime || '18:00';
    // OT end time from overtime.maxTime or default to 24:00
    const systemOTEnd = overtimeSettings?.config?.maxTime || otSettings?.config?.endTime || '24:00';
    
    let otStartTime, otEndTime, shift, shiftName;
    
    // Check if employee has an active shift assignment
    if (employeeShift && employeeShift.shift && typeof employeeShift.shift === 'object') {
      // Use employee's assigned shift
      shift = employeeShift.shift;
      shiftName = shift.name || 'Ca mặc định';
      // OT start time always from OT settings, not from shift end time
      otStartTime = systemOTStart;
      otEndTime = systemOTEnd;
      console.log(`[getOTTimeframeFromShift] Using employee shift: ${shiftName}, OT: ${otStartTime} - ${otEndTime}`);
    } else {
      // Use system OT settings
      shiftName = 'Ca mặc định';
      otStartTime = systemOTStart;
      otEndTime = systemOTEnd;
      console.log(`[getOTTimeframeFromShift] Using OT settings: ${otStartTime} - ${otEndTime}`);
    }
    
    // Validate time format
    if (!otStartTime || !otEndTime) {
      console.error(`[getOTTimeframeFromShift] Invalid times: startTime=${otStartTime}, endTime=${otEndTime}`);
      throw new Error('Không thể xác định khung giờ OT. Vui lòng kiểm tra cài đặt hệ thống.');
    }
    
    // Validate time format (HH:mm)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(otStartTime) || !timeRegex.test(otEndTime)) {
      console.error(`[getOTTimeframeFromShift] Invalid time format: startTime=${otStartTime}, endTime=${otEndTime}`);
      throw new Error(`Định dạng thời gian không hợp lệ: ${otStartTime} hoặc ${otEndTime}`);
    }
    
    // Calculate estimated OT hours
    const [startHour, startMin] = otStartTime.split(':').map(Number);
    const [endHour, endMin] = otEndTime.split(':').map(Number);
    
    if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
      console.error(`[getOTTimeframeFromShift] NaN in time calculation: startHour=${startHour}, startMin=${startMin}, endHour=${endHour}, endMin=${endMin}`);
      throw new Error('Định dạng thời gian không hợp lệ');
    }
    
    let estimatedHours = (endHour + endMin / 60) - (startHour + startMin / 60);
    if (estimatedHours < 0) {
      estimatedHours += 24; // Handle overnight OT
    }
    
    const result = {
      startTime: otStartTime,
      endTime: otEndTime,
      estimatedHours: Math.round(estimatedHours * 10) / 10,
      shift: shift?._id || null,
      shiftName: shiftName || 'Ca mặc định'
    };
    
    console.log(`[getOTTimeframeFromShift] Result:`, result);
    return result;
  } catch (error) {
    console.error('[getOTTimeframeFromShift] Error:', error);
    console.error('[getOTTimeframeFromShift] Stack:', error.stack);
    throw error;
  }
};

/**
 * Create OT Request (Employee)
 * POST /api/overtime/request
 * NEW LOGIC: User only selects date, system determines OT timeframe from shift
 */
exports.createOTRequest = async (req, res) => {
  try {
    console.log('[createOTRequest] Request received:', req.body);
    const { date, reason } = req.body;
    
    // Validate required fields (startTime/endTime no longer required)
    if (!date || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin: ngày và lý do'
      });
    }
    
    // Get employee from user
    const employee = req.user.employee;
    if (!employee) {
      console.error('[createOTRequest] No employee found in req.user');
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy thông tin nhân viên'
      });
    }
    
    const employeeId = employee._id || employee;
    console.log('[createOTRequest] Employee ID:', employeeId);
    
    // Check if already has pending/approved request for this date
    const requestDate = moment(date).startOf('day').toDate();
    const existingRequest = await OvertimeRequest.findOne({
      employee: employeeId,
      date: requestDate,
      status: { $in: ['pending', 'approved'] }
    });
    
    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: `Bạn đã có đơn OT ${existingRequest.status === 'pending' ? 'đang chờ duyệt' : 'đã được duyệt'} cho ngày này`
      });
    }
    
    // AUTO: Get OT timeframe from employee's shift
    let otTimeframe;
    try {
      otTimeframe = await getOTTimeframeFromShift(employeeId, date);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Không thể xác định khung giờ OT. Vui lòng kiểm tra cài đặt hệ thống.'
      });
    }
    
    if (!otTimeframe || !otTimeframe.startTime || !otTimeframe.endTime) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xác định khung giờ OT. Vui lòng kiểm tra cài đặt hệ thống.'
      });
    }
    
    // Create new OT request with auto-calculated times
    const otRequest = new OvertimeRequest({
      employee: employeeId,
      date: requestDate,
      startTime: otTimeframe.startTime,
      endTime: otTimeframe.endTime,
      reason,
      estimatedHours: otTimeframe.estimatedHours || 0,
      shift: otTimeframe.shift || null,
      shiftName: otTimeframe.shiftName || 'Ca mặc định',
      status: 'pending'
    });
    
    await otRequest.save();
    
    // Populate employee info for response
    await otRequest.populate('employee', 'name employeeId department');
    
    const employeeName = otRequest.employee?.name || 'N/A';
    console.log(`📋 [OT Request] ${employeeName} submitted OT for ${moment(date).format('YYYY-MM-DD')}`);
    console.log(`   Shift: ${otTimeframe.shiftName}, OT: ${otTimeframe.startTime} - ${otTimeframe.endTime} (~${otTimeframe.estimatedHours}h)`);
    
    res.status(201).json({
      success: true,
      message: `Đã gửi đơn đăng ký OT (${otTimeframe.shiftName}: ${otTimeframe.startTime} - ${otTimeframe.endTime})`,
      data: otRequest
    });
  } catch (error) {
    console.error('Error creating OT request:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi đơn OT',
      error: error.message
    });
  }
};

/**
 * Preview OT timeframe for a date (without creating request)
 * GET /api/overtime/preview/:date
 */
exports.previewOTTimeframe = async (req, res) => {
  try {
    console.log('[previewOTTimeframe] Request received:', req.params);
    const { date } = req.params;
    const employee = req.user.employee;
    
    if (!employee) {
      console.error('[previewOTTimeframe] No employee found in req.user');
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy thông tin nhân viên'
      });
    }
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ngày'
      });
    }
    
    const employeeId = employee._id || employee;
    console.log('[previewOTTimeframe] Employee ID:', employeeId);
    
    let otTimeframe;
    
    try {
      otTimeframe = await getOTTimeframeFromShift(employeeId, date);
    } catch (error) {
      console.error('[previewOTTimeframe] Error in getOTTimeframeFromShift:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Không thể xác định khung giờ OT. Vui lòng kiểm tra cài đặt hệ thống.'
      });
    }
    
    if (!otTimeframe || !otTimeframe.startTime || !otTimeframe.endTime) {
      console.error('[previewOTTimeframe] Invalid otTimeframe:', otTimeframe);
      return res.status(400).json({
        success: false,
        message: 'Không thể xác định khung giờ OT. Vui lòng kiểm tra cài đặt hệ thống.'
      });
    }
    
    const response = {
      success: true,
      data: {
        date: moment(date).format('YYYY-MM-DD'),
        shiftName: otTimeframe.shiftName || 'Ca mặc định',
        startTime: otTimeframe.startTime,
        endTime: otTimeframe.endTime,
        estimatedHours: otTimeframe.estimatedHours || 0
      }
    };
    
    console.log('[previewOTTimeframe] Success:', response);
    res.status(200).json(response);
  } catch (error) {
    console.error('[previewOTTimeframe] Unexpected error:', error);
    console.error('[previewOTTimeframe] Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xem trước khung giờ OT',
      error: error.message
    });
  }
};

/**
 * Get My OT Requests (Employee)
 * GET /api/overtime/my-requests
 */
exports.getMyOTRequests = async (req, res) => {
  try {
    const employee = req.user.employee;
    if (!employee) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy thông tin nhân viên'
      });
    }
    
    const employeeId = employee._id || employee;
    
    const requests = await OvertimeRequest.find({ employee: employeeId })
      .populate('employee', 'name employeeId')
      .populate('reviewedBy', 'username email')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Error fetching OT requests:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải danh sách đơn OT',
      error: error.message
    });
  }
};

/**
 * Cancel OT Request (Employee - only pending requests)
 * DELETE /api/overtime/request/:id
 */
exports.cancelOTRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = req.user.employee;
    
    if (!employee) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy thông tin nhân viên'
      });
    }
    
    const employeeId = employee._id || employee;
    
    const request = await OvertimeRequest.findOne({
      _id: id,
      employee: employeeId,
      status: 'pending'
    });
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn OT hoặc đơn đã được xử lý'
      });
    }
    
    await OvertimeRequest.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: 'Đã hủy đơn OT'
    });
  } catch (error) {
    console.error('Error canceling OT request:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi hủy đơn OT',
      error: error.message
    });
  }
};

/**
 * Get Pending OT Requests (Admin)
 * GET /api/overtime/pending
 */
exports.getPendingOTRequests = async (req, res) => {
  try {
    const requests = await OvertimeRequest.find({ status: 'pending' })
      .populate('employee', 'name employeeId department position')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: requests,
      count: requests.length
    });
  } catch (error) {
    console.error('Error fetching pending OT requests:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải danh sách đơn OT chờ duyệt',
      error: error.message
    });
  }
};

/**
 * Get All OT Requests (Admin)
 * GET /api/overtime/all
 */
exports.getAllOTRequests = async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (startDate && endDate) {
      query.date = {
        $gte: moment(startDate).startOf('day').toDate(),
        $lte: moment(endDate).endOf('day').toDate()
      };
    }
    
    const requests = await OvertimeRequest.find(query)
      .populate('employee', 'name employeeId department position')
      .populate('reviewedBy', 'username email')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: requests,
      count: requests.length
    });
  } catch (error) {
    console.error('Error fetching OT requests:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải danh sách đơn OT',
      error: error.message
    });
  }
};

/**
 * Approve OT Request (Admin)
 * PUT /api/overtime/approve/:id
 */
exports.approveOTRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    
    const request = await OvertimeRequest.findById(id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn OT'
      });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Đơn OT này đã được ${request.status === 'approved' ? 'duyệt' : 'từ chối'}`
      });
    }
    
    request.status = 'approved';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    request.reviewComment = comment || '';
    
    await request.save();
    await request.populate('employee', 'name employeeId department');
    
    console.log(`✅ [OT Approved] ${request.employee.name} - ${moment(request.date).format('YYYY-MM-DD')}`);
    
    res.status(200).json({
      success: true,
      message: 'Đã duyệt đơn OT',
      data: request
    });
  } catch (error) {
    console.error('Error approving OT request:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi duyệt đơn OT',
      error: error.message
    });
  }
};

/**
 * Reject OT Request (Admin)
 * PUT /api/overtime/reject/:id
 */
exports.rejectOTRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    
    const request = await OvertimeRequest.findById(id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn OT'
      });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Đơn OT này đã được ${request.status === 'approved' ? 'duyệt' : 'từ chối'}`
      });
    }
    
    request.status = 'rejected';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    request.reviewComment = comment || '';
    
    await request.save();
    await request.populate('employee', 'name employeeId department');
    
    console.log(`❌ [OT Rejected] ${request.employee.name} - ${moment(request.date).format('YYYY-MM-DD')}`);
    
    res.status(200).json({
      success: true,
      message: 'Đã từ chối đơn OT',
      data: request
    });
  } catch (error) {
    console.error('Error rejecting OT request:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi từ chối đơn OT',
      error: error.message
    });
  }
};

/**
 * Check if employee has approved OT for a specific date
 * GET /api/overtime/check/:employeeId/:date
 */
exports.checkOTApproval = async (req, res) => {
  try {
    const { employeeId, date } = req.params;
    
    const requestDate = moment(date).startOf('day').toDate();
    const endDate = moment(date).endOf('day').toDate();
    
    const approvedOT = await OvertimeRequest.findOne({
      employee: employeeId,
      date: { $gte: requestDate, $lte: endDate },
      status: 'approved'
    }).populate('employee', 'name employeeId');
    
    res.status(200).json({
      success: true,
      hasApprovedOT: !!approvedOT,
      data: approvedOT
    });
  } catch (error) {
    console.error('Error checking OT approval:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra OT',
      error: error.message
    });
  }
};

// Bulk assign OT to all active employees (Manager only)
// Tự động tạo attendance records với OT đã được duyệt - nhân viên không cần gửi đơn
exports.bulkAssignOT = async (req, res) => {
  try {
    const { date, startTime, endTime, reason } = req.body;
    
    if (!date || !startTime || !endTime || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: date, startTime, endTime, reason'
      });
    }
    
    // Get all active employees
    const employees = await Employee.find({ status: 'active' });
    
    if (employees.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không có nhân viên nào đang hoạt động'
      });
    }
    
    const requestDate = moment(date).toDate();
    const attendanceDate = moment(date).startOf('day').toDate();
    const startTimeMoment = moment(`${date} ${startTime}`, 'YYYY-MM-DD HH:mm');
    const endTimeMoment = moment(`${date} ${endTime}`, 'YYYY-MM-DD HH:mm');
    const hours = endTimeMoment.diff(startTimeMoment, 'hours', true);
    
    // Load settings for OT calculation
    const [otSettings, overtimeSettings, holidaySettings] = await Promise.all([
      Settings.findOne({ type: 'ot-rate' }),
      Settings.findOne({ type: 'overtime' }),
      Settings.findOne({ type: 'holiday' })
    ]);
    
    const allSettings = {
      'ot-rate': otSettings,
      'overtime': overtimeSettings,
      'holiday': holidaySettings
    };
    
    // Get working hours settings
    const workingHoursSettings = await Settings.findOne({ type: 'working-hours' });
    const workStartTime = workingHoursSettings?.config?.startTime || '08:00';
    const workEndTime = workingHoursSettings?.config?.endTime || '17:00';
    
    // Parse check-in and check-out times (giờ làm việc bình thường)
    const checkInTime = moment(`${date} ${workStartTime}`, 'YYYY-MM-DD HH:mm');
    const checkOutTime = moment(`${date} ${endTime}`, 'YYYY-MM-DD HH:mm'); // Check-out = endTime của OT
    
    let successCount = 0;
    let attendanceCount = 0;
    const errors = [];
    
    // Create OT requests and attendance records for all employees
    for (const employee of employees) {
      try {
        // Check if OT request already exists for this date
        const existingRequest = await OvertimeRequest.findOne({
          employee: employee._id,
          date: requestDate
        });
        
        if (existingRequest) {
          errors.push({ employeeName: employee.name, message: 'Đã có đơn OT cho ngày này' });
          continue;
        }
        
        // 1. Create OT request with auto-approved status
        const otRequest = new OvertimeRequest({
          employee: employee._id,
          date: requestDate,
          startTime,
          endTime,
          hours,
          reason: `[Gán hàng loạt] ${reason}`,
          status: 'approved', // Auto-approved
          reviewedBy: req.user._id,
          reviewedAt: new Date()
        });
        
        await otRequest.save();
        
        // 2. Create or update attendance record with OT approved
        let attendance = await Attendance.findOne({
          employee: employee._id,
          date: attendanceDate
        });
        
        // Calculate OT hours (from startTime to endTime - giờ OT được gán)
        const otStartMoment = startTimeMoment; // Giờ bắt đầu OT (từ form)
        const otEndMoment = endTimeMoment;     // Giờ kết thúc OT (từ form)
        const workEndMoment = moment(`${date} ${workEndTime}`, 'YYYY-MM-DD HH:mm');
        
        let overtimeHours = 0;
        if (otEndMoment.isAfter(otStartMoment)) {
          overtimeHours = otEndMoment.diff(otStartMoment, 'hours', true);
          // Round OT: >= 30 mins round up, < 30 mins keep
          const minutes = (overtimeHours % 1) * 60;
          if (minutes >= 30) {
            overtimeHours = Math.ceil(overtimeHours);
          } else {
            overtimeHours = Math.floor(overtimeHours);
          }
        }
        
        // Calculate working hours (from checkIn to workEnd - giờ làm việc bình thường)
        const workingHours = workEndMoment.diff(checkInTime, 'hours', true);
        
        // Calculate OT salary
        let estimatedOTSalary = 0;
        if (overtimeHours > 0) {
          const isHoliday = await attendanceHelper.isHoliday(attendanceDate);
          const otSettingsForCalc = {
            ratePerHour: otSettings?.config?.ratePerHour || overtimeSettings?.config?.otRate || 100000,
            weekdayRate: overtimeSettings?.config?.weekdayRate || 1.5,
            weekendRate: overtimeSettings?.config?.weekendRate || 2.0,
            holidayRate: overtimeSettings?.config?.holidayRate || 3.0,
            ...otSettings?.config,
            ...overtimeSettings?.config
          };
          
          estimatedOTSalary = await attendanceHelper.calculateOTSalary(
            overtimeHours,
            otSettingsForCalc,
            attendanceDate,
            isHoliday
          );
        }
        
        if (attendance) {
          // Update existing attendance
          attendance.checkIn = {
            time: checkInTime.toDate(),
            status: 'on-time'
          };
          attendance.checkOut = {
            time: checkOutTime.toDate(),
            status: overtimeHours > 0 ? 'overtime' : 'on-time'
          };
          attendance.status = 'present';
          attendance.workingHours = workingHours;
          attendance.overtimeHours = overtimeHours;
          attendance.estimatedOTSalary = estimatedOTSalary;
          attendance.is_ot_approved = true; // OT đã được duyệt tự động
          attendance.isManual = true;
          await attendance.save();
        } else {
          // Create new attendance record
          attendance = new Attendance({
            employee: employee._id,
            fingerprintId: employee.fingerprintId || 0,
            date: attendanceDate,
            checkIn: {
              time: checkInTime.toDate(),
              status: 'on-time'
            },
            checkOut: {
              time: checkOutTime.toDate(),
              status: overtimeHours > 0 ? 'overtime' : 'on-time'
            },
            status: 'present',
            workingHours: workingHours,
            overtimeHours: overtimeHours,
            estimatedOTSalary: estimatedOTSalary,
            is_ot_approved: true, // OT đã được duyệt tự động
            isManual: true,
            lateMinutes: 0,
            actualPenalty: 0
          });
          await attendance.save();
        }
        
        successCount++;
        attendanceCount++;
      } catch (error) {
        console.error(`Error processing employee ${employee.name}:`, error);
        errors.push({ employeeName: employee.name, message: error.message });
      }
    }
    
    console.log(`✅ [BULK OT ASSIGN] Created ${successCount} OT requests and ${attendanceCount} attendance records for ${date} ${startTime}-${endTime}`);
    
    res.status(200).json({
      success: true,
      message: `Đã gán OT cho ${successCount} nhân viên và tạo ${attendanceCount} bản ghi chấm công`,
      count: successCount,
      attendanceCount: attendanceCount,
      total: employees.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error bulk assigning OT:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi gán OT hàng loạt',
      error: error.message
    });
  }
};

