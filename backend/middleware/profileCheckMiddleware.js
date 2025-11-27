const Employee = require('../models/Employee');

/**
 * Middleware to check if employee profile is completed
 * Redirects to profile completion page if profile is incomplete
 */
exports.checkProfileCompleted = async (req, res, next) => {
  try {
    // Only check for employee role
    if (!req.user || req.user.role !== 'employee') {
      return next();
    }

    // Get employee info
    const employeeId = req.user.employee?._id || req.user.employee;
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy thông tin nhân viên'
      });
    }

    // Fetch employee with all fields
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Nhân viên không tồn tại'
      });
    }

    // Check if profile is already marked as completed
    if (employee.profileCompleted) {
      return next();
    }

    // Check required fields
    const requiredFields = {
      address: employee.address,
      citizenId: employee.citizenId,
      dateOfBirth: employee.dateOfBirth,
      gender: employee.gender,
      bankAccount: employee.bankAccount,
      socialInsuranceNumber: employee.socialInsuranceNumber
    };

    // Validate bank account structure
    const bankAccountValid = requiredFields.bankAccount && 
      requiredFields.bankAccount.bankName && 
      requiredFields.bankAccount.accountNumber && 
      requiredFields.bankAccount.accountName;

    // Check if all required fields are filled
    const missingFields = [];
    if (!requiredFields.address || requiredFields.address.trim() === '') {
      missingFields.push('Địa chỉ');
    }
    if (!requiredFields.citizenId || requiredFields.citizenId.trim() === '') {
      missingFields.push('Số CMND/CCCD');
    }
    if (!requiredFields.dateOfBirth) {
      missingFields.push('Ngày sinh');
    }
    if (!requiredFields.gender) {
      missingFields.push('Giới tính');
    }
    if (!bankAccountValid) {
      missingFields.push('Thông tin tài khoản ngân hàng');
    }
    if (!requiredFields.socialInsuranceNumber || requiredFields.socialInsuranceNumber.trim() === '') {
      missingFields.push('Số BHXH');
    }

    // If any field is missing, profile is incomplete
    if (missingFields.length > 0) {
      return res.status(403).json({
        success: false,
        message: 'Bạn cần hoàn thiện thông tin cá nhân trước khi sử dụng tính năng này',
        profileIncomplete: true,
        missingFields: missingFields,
        redirectTo: '/complete-profile'
      });
    }

    // All fields are present, allow access
    next();
  } catch (error) {
    console.error('Profile check middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra thông tin hồ sơ',
      error: error.message
    });
  }
};


