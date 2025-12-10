const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
const moment = require('moment-timezone');
const { getIO } = require('../socket/socketServer');
const User = require('../models/User');

// @desc    Apply for leave
// @route   POST /api/leave
// @access  Private (Employee & Admin)
exports.applyLeave = async (req, res) => {
  try {
    const { leaveType, type, startDate, endDate, reason, attachments } = req.body;
    // Support both leaveType and type for backward compatibility
    const finalLeaveType = leaveType || type || 'annual';
    
    console.log('Apply leave request:', { leaveType, startDate, endDate, reason });
    console.log('User:', req.user.username, 'Role:', req.user.role);
    console.log('Employee:', req.user.employee);
    
    // Admin/Manager cannot apply for leave - they can only review
    if (req.user.role === 'admin' || req.user.role === 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Quản lý không thể xin nghỉ phép. Vui lòng sử dụng chức năng duyệt đơn nghỉ phép.'
      });
    }
    
    // Validate required fields
    if (!finalLeaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin: loại nghỉ, ngày bắt đầu, ngày kết thúc, lý do'
      });
    }
    
    // Check if user has employee reference
    if (!req.user.employee) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản của bạn chưa được liên kết với nhân viên. Vui lòng liên hệ admin.'
      });
    }
    
    // Validate dates
    const start = moment.tz(startDate, 'Asia/Ho_Chi_Minh').startOf('day');
    const end = moment.tz(endDate, 'Asia/Ho_Chi_Minh').endOf('day');
    
    if (end.isBefore(start)) {
      return res.status(400).json({
        success: false,
        message: 'Ngày kết thúc phải sau ngày bắt đầu'
      });
    }
    
    // Calculate total days (inclusive)
    const totalDays = end.diff(start, 'days') + 1;
    
    console.log('Calculated totalDays:', totalDays, 'from', start.format('YYYY-MM-DD'), 'to', end.format('YYYY-MM-DD'));
    
    // Get employee ID from authenticated user - handle both populated object and ID
    const employeeId = req.user.employee?._id || req.user.employee;
    
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản của bạn chưa được liên kết với nhân viên. Vui lòng liên hệ admin.'
      });
    }
    
    // Create leave request
    const leave = new Leave({
      employee: employeeId,
      leaveType: finalLeaveType,
      type: finalLeaveType, // Also set type field for compatibility
      startDate: start.toDate(),
      endDate: end.toDate(),
      totalDays: totalDays,
      reason,
      attachments: attachments || [],
      status: 'pending',
      appliedAt: new Date()
    });
    
    try {
      await leave.save();
    } catch (saveError) {
      console.error('Error saving leave:', saveError);
      // Check if it's a validation error
      if (saveError.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu không hợp lệ',
          error: Object.values(saveError.errors).map(e => e.message).join(', ')
        });
      }
      throw saveError; // Re-throw if it's not a validation error
    }
    
    // Populate employee data for response
    try {
      await leave.populate('employee', 'name employeeId position email');
    } catch (populateError) {
      console.error('Error populating leave:', populateError);
      // Continue anyway - employee data might not be critical for response
    }
    
    // ✅ Emit socket event để thông báo cho admin/manager
    try {
      const io = getIO();
      if (io) {
        // Tìm tất cả admin/manager users
        const admins = await User.find({ role: { $in: ['admin', 'manager'] } }).select('_id');
        admins.forEach(admin => {
          io.to(`user_${admin._id}`).emit('new_leave_request', {
            type: 'leave',
            request: leave,
            employee: leave.employee,
            message: `Nhân viên ${leave.employee?.name || 'N/A'} đã gửi đơn nghỉ phép cần duyệt`
          });
        });
        console.log(`📢 [Socket] Emitted new_leave_request to ${admins.length} admin(s)`);
      }
    } catch (socketError) {
      console.error('Error emitting socket event for leave request:', socketError);
    }
    
    res.status(201).json({
      success: true,
      message: 'Đơn xin nghỉ đã được gửi thành công',
      data: leave
    });
  } catch (error) {
    console.error('Apply leave error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi đơn xin nghỉ',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Get all leave requests (Admin) or user's own leaves (Employee)
// @route   GET /api/leave
// @access  Private
exports.getAllLeaves = async (req, res) => {
  try {
    const { status, startDate, endDate, employeeId } = req.query;
    
    console.log('getAllLeaves - Query params:', { status, startDate, endDate, employeeId });
    console.log('getAllLeaves - User:', req.user?.username, 'Role:', req.user?.role);
    
    let query = {};
    
    // If employee role, only show their own leaves
    if (req.user.role === 'employee') {
      if (req.user.employee) {
        // Handle both populated employee object and employee ID
        const empId = req.user.employee._id || req.user.employee;
        if (empId) {
          query.employee = empId;
        } else {
          // Employee role but no employee linked
          return res.status(200).json({
            success: true,
            data: []
          });
        }
      } else {
        // Employee role but no employee linked
        return res.status(200).json({
          success: true,
          data: []
        });
      }
    } else if (employeeId) {
      // Admin can filter by specific employee
      query.employee = employeeId;
    }
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by date range
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }
    
    console.log('getAllLeaves - Final query:', JSON.stringify(query));
    
    const leaves = await Leave.find(query)
      .populate({
        path: 'employee',
        select: 'name employeeId position email',
        model: 'Employee'
      })
      .populate({
        path: 'reviewedBy',
        select: 'username',
        model: 'User'
      })
      .sort({ appliedAt: -1, createdAt: -1 }); // Sort by appliedAt, fallback to createdAt
    
    console.log('getAllLeaves - Found leaves:', leaves.length);
    
    res.status(200).json({
      success: true,
      data: leaves
    });
  } catch (error) {
    console.error('Get leaves error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách đơn nghỉ',
      error: error.message
    });
  }
};

// @desc    Get leave by ID
// @route   GET /api/leave/:id
// @access  Private
exports.getLeaveById = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id)
      .populate('employee', 'name employeeId position email phone')
      .populate('reviewedBy', 'username');
    
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn nghỉ'
      });
    }
    
    // Check if employee is accessing their own leave
    const userEmpId = req.user.employee?._id || req.user.employee;
    const leaveEmpId = leave.employee?._id || leave.employee;
    
    if (req.user.role === 'employee' && leaveEmpId && userEmpId && leaveEmpId.toString() !== userEmpId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem đơn nghỉ này'
      });
    }
    
    res.status(200).json({
      success: true,
      data: leave
    });
  } catch (error) {
    console.error('Get leave by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin đơn nghỉ',
      error: error.message
    });
  }
};

// @desc    Update leave request (only pending leaves can be updated by employee)
// @route   PUT /api/leave/:id
// @access  Private (Employee)
exports.updateLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn nghỉ'
      });
    }
    
    // Check if employee owns this leave
    const userEmpId = req.user.employee?._id || req.user.employee;
    const leaveEmpId = leave.employee?._id || leave.employee;
    
    if (leaveEmpId && userEmpId && leaveEmpId.toString() !== userEmpId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền chỉnh sửa đơn nghỉ này'
      });
    }
    
    // Only pending leaves can be updated
    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể chỉnh sửa đơn nghỉ đang chờ duyệt'
      });
    }
    
    const { leaveType, startDate, endDate, reason, attachments } = req.body;
    
    if (leaveType) leave.leaveType = leaveType;
    if (startDate) leave.startDate = new Date(startDate);
    if (endDate) leave.endDate = new Date(endDate);
    if (reason) leave.reason = reason;
    if (attachments) leave.attachments = attachments;
    
    await leave.save();
    await leave.populate('employee', 'name employeeId position email');
    
    res.status(200).json({
      success: true,
      message: 'Cập nhật đơn nghỉ thành công',
      data: leave
    });
  } catch (error) {
    console.error('Update leave error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật đơn nghỉ',
      error: error.message
    });
  }
};

// @desc    Cancel leave request
// @route   DELETE /api/leave/:id
// @access  Private (Employee)
exports.cancelLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn nghỉ'
      });
    }
    
    // Check if employee owns this leave
    if (leave.employee.toString() !== req.user.employee._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền hủy đơn nghỉ này'
      });
    }
    
    // Only pending or approved leaves can be cancelled
    if (!['pending', 'approved'].includes(leave.status)) {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể hủy đơn nghỉ đang chờ duyệt hoặc đã duyệt'
      });
    }
    
    leave.status = 'cancelled';
    await leave.save();
    
    res.status(200).json({
      success: true,
      message: 'Đã hủy đơn nghỉ thành công',
      data: leave
    });
  } catch (error) {
    console.error('Cancel leave error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi hủy đơn nghỉ',
      error: error.message
    });
  }
};

// @desc    Review leave request (Approve/Reject)
// @route   PUT /api/leave/:id/review
// @access  Private (Admin only)
exports.reviewLeave = async (req, res) => {
  try {
    const { status, reviewComment, reviewNote } = req.body; // Support both reviewComment and reviewNote
    
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái không hợp lệ. Chỉ chấp nhận "approved" hoặc "rejected"'
      });
    }
    
    // If rejecting, review comment is required
    if (status === 'rejected' && !reviewComment && !reviewNote) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập lý do từ chối'
      });
    }
    
    const leave = await Leave.findById(req.params.id);
    
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn nghỉ'
      });
    }
    
    // Only pending leaves can be reviewed
    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể duyệt đơn nghỉ đang chờ duyệt'
      });
    }
    
    // Store original status before update
    const originalStatus = leave.status;
    
    leave.status = status;
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();
    // Use reviewComment (preferred) or reviewNote (backward compatibility)
    const comment = reviewComment || reviewNote;
    if (comment) {
      leave.reviewComment = comment;
      // Also set reviewNote for backward compatibility
      leave.reviewNote = comment;
    }
    
    await leave.save();
    
    // If approved, update employee's used leave days (for annual and sick leave)
    // Note: Only annual and sick leave count towards the annual leave quota
    if (status === 'approved') {
      const leaveType = leave.leaveType || leave.type;
      const shouldCountLeave = leaveType === 'annual' || leaveType === 'sick';
      
      if (shouldCountLeave) {
        const employee = await Employee.findById(leave.employee);
        if (employee) {
          // Only update if status changed from pending to approved (not already approved)
          if (originalStatus === 'pending') {
            // Add totalDays to usedLeaveDays
            employee.usedLeaveDays = (employee.usedLeaveDays || 0) + leave.totalDays;
            await employee.save();
            console.log(`✅ Updated employee ${employee.name} (${employee.employeeId}) used leave days: +${leave.totalDays} days (${leaveType}) (Total: ${employee.usedLeaveDays}/${employee.annualLeaveDays})`);
          } else {
            console.log(`ℹ️ Leave status was ${originalStatus}, skipping usedLeaveDays update to prevent double counting`);
          }
        }
      } else {
        console.log(`ℹ️ Leave type ${leaveType} does not count towards annual leave quota`);
      }
    }
    
    await leave.populate('employee', 'name employeeId position email');
    await leave.populate('employee.user', '_id');
    await leave.populate('reviewedBy', 'username');
    
    // ✅ Emit socket event để thông báo cho nhân viên
    try {
      const io = getIO();
      if (io && leave.employee && leave.employee.user) {
        const employeeUserId = leave.employee.user._id || leave.employee.user;
        io.to(`user_${employeeUserId}`).emit('leave_request_reviewed', {
          type: 'leave',
          request: leave,
          status: status,
          message: status === 'approved' 
            ? `Đơn nghỉ phép của bạn đã được duyệt` 
            : `Đơn nghỉ phép của bạn đã bị từ chối`,
          reviewComment: leave.reviewComment
        });
        console.log(`📢 [Socket] Emitted leave_request_reviewed to employee ${employeeUserId}`);
      }
    } catch (socketError) {
      console.error('Error emitting socket event for leave review:', socketError);
    }
    
    res.status(200).json({
      success: true,
      message: status === 'approved' ? 'Đã duyệt đơn nghỉ' : 'Đã từ chối đơn nghỉ',
      data: leave
    });
  } catch (error) {
    console.error('Review leave error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi duyệt đơn nghỉ',
      error: error.message
    });
  }
};

// @desc    Get leave statistics for an employee
// @route   GET /api/leave/stats/:employeeId
// @access  Private
exports.getLeaveStats = async (req, res) => {
  try {
    // Get employeeId from params (if provided) or from authenticated user
    const userEmpId = req.user.employee?._id || req.user.employee;
    const employeeId = req.params.employeeId || userEmpId;
    const { year } = req.query;
    
    // Check permission
    if (req.user.role === 'employee' && employeeId && userEmpId && employeeId.toString() !== userEmpId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem thống kê này'
      });
    }
    
    const currentYear = year || new Date().getFullYear();
    const startOfYear = new Date(`${currentYear}-01-01`);
    const endOfYear = new Date(`${currentYear}-12-31`);
    
    const leaves = await Leave.find({
      employee: employeeId,
      startDate: { $gte: startOfYear, $lte: endOfYear },
      status: { $in: ['approved', 'pending'] }
    });
    
    const stats = {
      totalDays: 0,
      byType: {
        annual: 0,
        sick: 0,
        personal: 0,
        unpaid: 0,
        maternity: 0,
        other: 0
      },
      byStatus: {
        pending: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0
      }
    };
    
    leaves.forEach(leave => {
      if (leave.status === 'approved') {
        stats.totalDays += leave.totalDays;
        stats.byType[leave.leaveType] += leave.totalDays;
      }
      stats.byStatus[leave.status]++;
    });
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get leave stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê nghỉ phép',
      error: error.message
    });
  }
};





