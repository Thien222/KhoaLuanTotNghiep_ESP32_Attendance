const OvertimeRequest = require('../models/OvertimeRequest');
const Employee = require('../models/Employee');
const moment = require('moment-timezone');

moment.tz.setDefault('Asia/Ho_Chi_Minh');

/**
 * Create OT Request (Employee)
 * POST /api/overtime/request
 */
exports.createOTRequest = async (req, res) => {
  try {
    const { date, startTime, endTime, reason } = req.body;
    
    // Validate required fields
    if (!date || !startTime || !endTime || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin: ngày, giờ bắt đầu, giờ kết thúc, lý do'
      });
    }
    
    // Get employee from user
    const employee = req.user.employee;
    if (!employee) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy thông tin nhân viên'
      });
    }
    
    const employeeId = employee._id || employee;
    
    // Parse times and calculate estimated hours
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let estimatedHours = (endHour + endMin / 60) - (startHour + startMin / 60);
    if (estimatedHours < 0) {
      estimatedHours += 24; // Handle overnight OT
    }
    
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
    
    // Create new OT request
    const otRequest = new OvertimeRequest({
      employee: employeeId,
      date: requestDate,
      startTime,
      endTime,
      reason,
      estimatedHours: Math.round(estimatedHours * 10) / 10,
      status: 'pending'
    });
    
    await otRequest.save();
    
    // Populate employee info for response
    await otRequest.populate('employee', 'name employeeId department');
    
    console.log(`📋 [OT Request] ${otRequest.employee.name} submitted OT request for ${moment(date).format('YYYY-MM-DD')}`);
    
    res.status(201).json({
      success: true,
      message: 'Đã gửi đơn đăng ký OT thành công',
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

