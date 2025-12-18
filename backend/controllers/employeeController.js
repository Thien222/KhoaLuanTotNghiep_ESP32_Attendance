const Employee = require('../models/Employee');
const User = require('../models/User');
const emailService = require('../services/emailService');

// Get next employee ID
const getNextEmployeeId = async () => {
  try {
    const lastEmployee = await Employee.findOne().sort({ employeeId: -1 });
    if (lastEmployee && lastEmployee.employeeId.startsWith('EMP')) {
      const lastId = parseInt(lastEmployee.employeeId.replace('EMP', ''));
      return `EMP${lastId + 1}`;
    }
    return 'EMP1';
  } catch (error) {
    console.error('Error getting next employee ID:', error);
    return `EMP${Date.now()}`;
  }
};

// Get next fingerprint ID
const getNextFingerprintId = async () => {
  try {
    const lastEmployee = await Employee.findOne().sort({ fingerprintId: -1 });
    if (lastEmployee && lastEmployee.fingerprintId) {
      return lastEmployee.fingerprintId + 1;
    }
    return 1;
  } catch (error) {
    console.error('Error getting next fingerprint ID:', error);
    return Math.floor(Math.random() * 1000) + 1;
  }
};

// Add new employee with fingerprint
exports.addEmployee = async (req, res) => {
  try {
    console.log('Received request body:', req.body);

    const { name, position, department, email, phone, contractType, salary: salaryRaw } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    // Generate auto IDs with retry logic
    let generatedEmployeeId, generatedFingerprintId, generatedEmail;
    let retryCount = 0;
    const maxRetries = 3;

    do {
      generatedEmployeeId = await getNextEmployeeId();
      generatedFingerprintId = await getNextFingerprintId();
      generatedEmail = email || `employee${Date.now()}${retryCount}@company.com`;

      console.log('Generated IDs (attempt', retryCount + 1, '):', {
        employeeId: generatedEmployeeId,
        fingerprintId: generatedFingerprintId,
        email: generatedEmail
      });

      try {
        // Parse salary to number
        let parsedSalary = 0;
        if (salaryRaw !== undefined && salaryRaw !== null && salaryRaw !== '') {
          parsedSalary = Number(salaryRaw);
          if (isNaN(parsedSalary)) {
            parsedSalary = 0;
          }
        }

        // Create new employee
        const employee = new Employee({
          name,
          employeeId: generatedEmployeeId,
          fingerprintId: generatedFingerprintId,
          fingerprintTemplate: 'not_enrolled',
          fingerprintEnrolled: false,
          position: position || 'Staff',
          department: department || 'General',
          email: generatedEmail,
          phone: phone || '0123456789',
          contractType: contractType || 'probation',
          salary: parsedSalary,
          baseSalary: parsedSalary, // Set baseSalary explicitly
          profileCompleted: false
        });

        console.log('Creating employee:', employee);
        await employee.save();
        console.log('Employee saved successfully');

        // Tự động tạo tài khoản User cho nhân viên
        const defaultPassword = `hrm${generatedFingerprintId}2025`; // Mật khẩu mặc định

        try {
          const newUser = new User({
            username: generatedEmployeeId, // Username = Mã nhân viên
            email: generatedEmail,
            password: defaultPassword,
            role: 'employee',
            employee: employee._id,
            isActive: true
          });

          await newUser.save();
          console.log('✅ User account created for employee:', generatedEmployeeId);

          // Gửi email thông báo với thông tin đăng nhập
          // Kiểm tra email hợp lệ (có @ và không phải email tự động @company.com)
          const isValidEmail = generatedEmail &&
            generatedEmail.includes('@') &&
            !generatedEmail.includes('@company.com') &&
            generatedEmail.includes('.');

          console.log('📧 Email check:', {
            generatedEmail,
            isValidEmail,
            originalEmail: email
          });

          if (isValidEmail) {
            try {
              console.log('📧 Attempting to send welcome email to:', generatedEmail);
              const emailResult = await emailService.sendWelcomeEmail(
                {
                  name: employee.name,
                  email: generatedEmail,
                  employeeId: generatedEmployeeId,
                  fingerprintId: generatedFingerprintId,
                  position: employee.position,
                  department: employee.department,
                  fingerprintEnrolled: false
                },
                {
                  username: generatedEmployeeId,
                  password: defaultPassword
                }
              );

              if (emailResult.success) {
                console.log('✅ Welcome email sent successfully to:', generatedEmail);
                console.log('📧 Email message ID:', emailResult.messageId);
              } else {
                console.warn('⚠️ Failed to send welcome email:', emailResult.error);
              }
            } catch (emailError) {
              console.error('❌ Error sending welcome email:', emailError);
              console.error('❌ Error details:', {
                message: emailError.message,
                stack: emailError.stack
              });
              // Không throw error, vẫn tiếp tục tạo nhân viên
            }
          } else {
            console.warn('⚠️ Skipping email send - invalid email:', generatedEmail);
          }
        } catch (userError) {
          console.error('⚠️ Error creating user account:', userError);
          // Không throw error, nhân viên vẫn được tạo thành công
        }

        res.status(201).json({
          success: true,
          data: employee,
          message: 'Employee added successfully',
          accountCreated: true
        });
        return;

      } catch (saveError) {
        if (saveError.code === 11000 && retryCount < maxRetries - 1) {
          console.log('Duplicate key error, retrying...', saveError.keyValue);
          retryCount++;
          continue;
        }
        throw saveError;
      }
    } while (retryCount < maxRetries);

  } catch (error) {
    console.error('Error in addEmployee:', error);

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(409).json({
        success: false,
        message: `Employee with this ${field} already exists`,
        error: error.message
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error adding employee',
      error: error.message
    });
  }
};

// Get all employees
exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find()
      .select('-fingerprintTemplate')
      .sort({ employeeId: 1 })
      .lean();

    // Get users for each employee
    const User = require('../models/User');
    const employeesWithUsers = await Promise.all(
      employees.map(async (emp) => {
        const user = await User.findOne({ employee: emp._id })
          .select('username email role _id')
          .lean();
        return {
          ...emp,
          user: user || null
        };
      })
    );

    res.status(200).json({
      success: true,
      data: employeesWithUsers
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employees',
      error: error.message
    });
  }
};

// Get employee by ID
exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).select('-fingerprintTemplate');
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    res.status(200).json({
      success: true,
      data: employee
    });
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employee',
      error: error.message
    });
  }
};

// Update employee
exports.updateEmployee = async (req, res) => {
  try {
    // Parse salary if provided
    const updateData = { ...req.body };
    if (updateData.salary !== undefined && updateData.salary !== null && updateData.salary !== '') {
      const parsedSalary = Number(updateData.salary);
      if (!isNaN(parsedSalary) && parsedSalary >= 0) {
        updateData.salary = parsedSalary;
        updateData.baseSalary = parsedSalary; // Update baseSalary when salary changes
      } else {
        return res.status(400).json({
          success: false,
          message: 'Lương không hợp lệ. Vui lòng nhập số dương.'
        });
      }
    }

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    res.status(200).json({
      success: true,
      data: employee,
      message: 'Employee updated successfully'
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating employee',
      error: error.message
    });
  }
};

// Helper function to send enrollment email notification (can be called from multiple places)
async function sendEnrollmentEmailNotification(employee) {
  console.log('📧 ========== ENROLLMENT EMAIL PROCESS START ==========');
  console.log('📧 Employee email:', employee.email);
  console.log('📧 Employee ID:', employee.employeeId);
  console.log('📧 Fingerprint ID:', employee.fingerprintId);

  // Gửi email thông báo đăng ký vân tay thành công
  const isValidEmail = employee.email &&
    employee.email.includes('@') &&
    !employee.email.includes('@company.com') &&
    employee.email.includes('.');

  console.log('📧 Enrollment email check:', {
    email: employee.email,
    hasEmail: !!employee.email,
    hasAt: employee.email?.includes('@'),
    notCompanyEmail: !employee.email?.includes('@company.com'),
    hasDot: employee.email?.includes('.'),
    isValidEmail,
    employeeId: employee.employeeId,
    fingerprintId: employee.fingerprintId
  });

  if (isValidEmail) {
    try {
      // Tìm user account để lấy thông tin đăng nhập
      let user = await User.findOne({ employee: employee._id });

      console.log('📧 User account check:', {
        hasUser: !!user,
        username: user?.username,
        email: user?.email
      });

      if (user) {
        // Nếu có user account, reset password mới và gửi email cho nhân viên với username và password
        console.log('📧 User account exists, resetting password and sending enrollment email to employee');

        // Tạo password mới ngẫu nhiên (8 ký tự)
        const newPassword = Math.random().toString(36).slice(-8);

        // Reset password cho user
        user.password = newPassword;
        await user.save();
        console.log('✅ Password reset for user:', user.username);

        console.log('📧 Preparing enrollment email with:', {
          name: employee.name,
          email: employee.email,
          employeeId: employee.employeeId,
          fingerprintId: employee.fingerprintId,
          username: user.username,
          password: newPassword
        });

        // Gửi email enrollment với username và password mới
        const emailResult = await emailService.sendEnrollmentNotification({
          name: employee.name,
          email: employee.email,
          employeeId: employee.employeeId,
          fingerprintId: employee.fingerprintId,
          username: user.username,
          password: newPassword // Gửi password mới
        });

        if (emailResult.success) {
          console.log('✅ Enrollment notification sent successfully to:', employee.email);
          console.log('📧 Email message ID:', emailResult.messageId);
          console.log('📧 ========== ENROLLMENT EMAIL SENT SUCCESSFULLY ==========');
        } else {
          console.error('❌ Failed to send enrollment notification:', emailResult.error);
          console.error('📧 ========== ENROLLMENT EMAIL FAILED ==========');
        }
      } else {
        // Nếu không có user account, gửi email thông báo cho admin
        console.log('📧 User account NOT found, sending notification to admin');

        const adminEmail = process.env.EMAIL_USER || 'farenabc123@gmail.com';

        const adminNotificationResult = await emailService.sendAdminNotification({
          adminEmail: adminEmail,
          employeeName: employee.name,
          employeeEmail: employee.email,
          employeeId: employee.employeeId,
          fingerprintId: employee.fingerprintId,
          message: 'Nhân viên chưa có tài khoản đăng nhập. Vui lòng tạo tài khoản trước khi enroll vân tay.'
        });

        if (adminNotificationResult.success) {
          console.log('✅ Admin notification sent successfully to:', adminEmail);
          console.log('📧 Email message ID:', adminNotificationResult.messageId);
        } else {
          console.error('❌ Failed to send admin notification:', adminNotificationResult.error);
        }
      }
    } catch (emailError) {
      console.error('❌❌❌ ERROR SENDING ENROLLMENT EMAIL ❌❌❌');
      console.error('Error message:', emailError.message);
      console.error('Error code:', emailError.code);
      console.error('Error stack:', emailError.stack);
      console.error('Full error object:', JSON.stringify(emailError, Object.getOwnPropertyNames(emailError), 2));
      console.error('📧 ========== ENROLLMENT EMAIL ERROR ==========');
      // KHÔNG throw error - tiếp tục trả về success để không block enroll process
    }
  } else {
    console.warn('⚠️⚠️⚠️ SKIPPING EMAIL - INVALID EMAIL ⚠️⚠️⚠️');
    console.warn('Email:', employee.email);
    console.warn('Reason: Email validation failed');
    console.warn('📧 ========== ENROLLMENT EMAIL SKIPPED (INVALID EMAIL) ==========');
  }
}

// Export helper function for use in other files
exports.sendEnrollmentEmailNotification = sendEnrollmentEmailNotification;

// Enroll employee fingerprint (mark as enrolled)
exports.enrollFingerprint = async (req, res) => {
  try {
    console.log('========================================');
    console.log('🔵 ENROLL FINGERPRINT ENDPOINT CALLED');
    console.log('========================================');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request headers:', {
      'content-type': req.headers['content-type'],
      'authorization': req.headers['authorization'] ? 'Present' : 'Missing'
    });

    const { fingerprintId } = req.body;

    if (!fingerprintId) {
      console.error('❌ Missing fingerprintId in request body');
      return res.status(400).json({
        success: false,
        message: 'Fingerprint ID is required'
      });
    }

    console.log('🔵 Enrolling fingerprint for ID:', fingerprintId);

    const employee = await Employee.findOneAndUpdate(
      { fingerprintId: fingerprintId },
      {
        fingerprintEnrolled: true,
        fingerprintTemplate: 'enrolled'
      },
      { new: true, runValidators: true }
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found with this fingerprint ID',
        fingerprintId: fingerprintId
      });
    }

    console.log('✅ Employee enrolled successfully:', employee.name, 'ID:', employee.employeeId);

    // Send enrollment email notification
    await sendEnrollmentEmailNotification(employee);

    console.log('========================================');
    console.log('✅ ENROLL FINGERPRINT COMPLETED');
    console.log('========================================');

    res.status(200).json({
      success: true,
      data: employee,
      message: 'Fingerprint enrolled successfully',
      what: 'enrolled',
      action: 'enroll-success'
    });
  } catch (error) {
    console.error('Error enrolling fingerprint:', error);
    res.status(500).json({
      success: false,
      message: 'Error enrolling fingerprint',
      error: error.message
    });
  }
};

// Delete employee
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    console.log(`🗑️  Deleting employee: ${employee.name} (${employee.employeeId})`);

    // Xóa tất cả attendance records liên quan
    const Attendance = require('../models/Attendance');
    const deletedAttendances = await Attendance.deleteMany({
      employee: employee._id
    });
    if (deletedAttendances.deletedCount > 0) {
      console.log(`   ✅ Deleted ${deletedAttendances.deletedCount} attendance records`);
    }

    // Xóa user account liên kết (nếu có)
    const deletedUser = await User.findOneAndDelete({ employee: employee._id });
    if (deletedUser) {
      console.log(`   ✅ Deleted user account: ${deletedUser.username}`);
    } else {
      console.log(`   ℹ️  No user account found for this employee`);
    }

    // Xóa employee
    await Employee.findByIdAndDelete(req.params.id);

    console.log(`✅ Employee deleted successfully: ${employee.name}`);

    res.status(200).json({
      success: true,
      message: 'Employee deleted successfully',
      deletedUser: !!deletedUser,
      deletedAttendances: deletedAttendances.deletedCount
    });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting employee',
      error: error.message
    });
  }
};

// Complete employee profile (for new employees)
exports.completeProfile = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const {
      address,
      citizenId,
      socialInsuranceNumber,
      dateOfBirth,
      gender,
      bankAccount
    } = req.body;

    // Get employee ID - support both employeeId param and user.employee
    let finalEmployeeId = employeeId;
    if (req.user && req.user.employee) {
      // If user is accessing their own profile, use their employee ID
      finalEmployeeId = req.user.employee._id || req.user.employee;
    }

    const employee = await Employee.findById(finalEmployeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Update profile fields
    if (address) employee.address = address;
    if (citizenId) employee.citizenId = citizenId;
    if (socialInsuranceNumber) employee.socialInsuranceNumber = socialInsuranceNumber;
    if (dateOfBirth) employee.dateOfBirth = dateOfBirth;
    if (gender) employee.gender = gender;
    if (bankAccount) employee.bankAccount = bankAccount;

    // Kiểm tra đã enroll vân tay chưa
    if (!employee.fingerprintEnrolled) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng đăng ký vân tay trước khi hoàn thiện thông tin'
      });
    }

    // Validate các field bắt buộc
    const requiredFields = {
      address: 'Địa chỉ',
      citizenId: 'Số CMND/CCCD',
      dateOfBirth: 'Ngày sinh',
      gender: 'Giới tính',
      bankAccount: 'Thông tin tài khoản ngân hàng',
      socialInsuranceNumber: 'Số BHXH'
    };

    const missingFields = [];
    for (const [field, label] of Object.entries(requiredFields)) {
      if (field === 'bankAccount') {
        if (!bankAccount || !bankAccount.bankName || !bankAccount.accountNumber || !bankAccount.accountName) {
          missingFields.push(label);
        }
      } else if (!req.body[field] && !employee[field]) {
        missingFields.push(label);
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Vui lòng điền đầy đủ thông tin: ${missingFields.join(', ')}`
      });
    }

    // Mark profile as completed
    employee.profileCompleted = true;
    employee.profileCompletedAt = new Date();

    // Save the employee
    await employee.save();

    res.status(200).json({
      success: true,
      message: 'Profile completed successfully',
      data: employee
    });
  } catch (error) {
    console.error('Error completing profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing profile',
      error: error.message
    });
  }
};

// Get employee leave balance
exports.getEmployeeLeaveBalance = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const remainingDays = employee.annualLeaveDays - employee.usedLeaveDays;

    res.status(200).json({
      success: true,
      data: {
        annualDays: employee.annualLeaveDays,
        usedDays: employee.usedLeaveDays,
        remainingDays: Math.max(0, remainingDays)
      }
    });
  } catch (error) {
    console.error('Error getting leave balance:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting leave balance',
      error: error.message
    });
  }
};

/**
 * Lấy thông tin profile của chính mình
 */
exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).populate('employee');

    if (!user || !user.employee) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin nhân viên'
      });
    }

    const employee = await Employee.findById(user.employee._id || user.employee).select('-fingerprintTemplate');

    res.json({
      success: true,
      data: {
        employee: employee,
        profileCompleted: employee.profileCompleted,
        fingerprintEnrolled: employee.fingerprintEnrolled
      }
    });
  } catch (error) {
    console.error('Get my profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin profile',
      error: error.message
    });
  }
};

/**
 * Nhân viên tự cập nhật thông tin cá nhân
 */
exports.updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).populate('employee');

    if (!user || !user.employee) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin nhân viên'
      });
    }

    const employeeId = user.employee._id || user.employee;

    console.log('📝 updateMyProfile - Request body:', req.body);

    // Chỉ cho phép cập nhật các field cá nhân
    const allowedFields = [
      'address',
      'citizenId',
      'dateOfBirth',
      'gender',
      'bankAccount',
      'socialInsuranceNumber',
      'phone',
      'profileCompleted', // FIX: Cho phép cập nhật profileCompleted
      'name',
      'email',
      'taxCode',
      'emergencyContact',
      'emergencyPhone',
      'idCardIssueDate',
      'idCardIssuePlace'
    ];

    const updateData = {};

    // Map các field từ mobile sang backend
    // Mobile: idCardNumber -> Backend: citizenId
    if (req.body.idCardNumber !== undefined) {
      updateData.citizenId = req.body.idCardNumber;
    }

    // Mobile: bankAccountNumber, bankName, bankBranch -> Backend: bankAccount {}
    if (req.body.bankAccountNumber || req.body.bankName || req.body.bankBranch) {
      updateData.bankAccount = {
        accountNumber: req.body.bankAccountNumber || '',
        bankName: req.body.bankName || '',
        accountName: req.body.bankBranch || req.body.name || '' // bankBranch as accountName
      };
    }

    // Copy các field đơn giản
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Nếu profileCompleted = true, set profileCompletedAt
    if (updateData.profileCompleted === true) {
      updateData.profileCompletedAt = new Date();
    }

    console.log('📝 updateMyProfile - Update data:', updateData);

    // Nếu có bankAccount từ request body trực tiếp, validate
    if (req.body.bankAccount) {
      const ba = req.body.bankAccount;
      // Không bắt buộc đầy đủ, chỉ cập nhật những gì có
      updateData.bankAccount = {
        bankName: ba.bankName || '',
        accountNumber: ba.accountNumber || '',
        accountName: ba.accountName || ''
      };
    }

    const employee = await Employee.findByIdAndUpdate(
      employeeId,
      updateData,
      { new: true, runValidators: true }
    ).select('-fingerprintTemplate');

    console.log('✅ Profile updated:', {
      employeeId: employee.employeeId,
      profileCompleted: employee.profileCompleted,
      citizenId: employee.citizenId,
      bankAccount: employee.bankAccount
    });

    res.json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      data: employee
    });
  } catch (error) {
    console.error('Update my profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật thông tin',
      error: error.message
    });
  }
};