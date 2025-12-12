const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Employee = require('../models/Employee');

// Generate JWT Token
const generateToken = (userId) => {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: '24h'
  });
};

// Register new user
exports.register = async (req, res) => {
  try {
    const { email, password, role, employeeId } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email đã được sử dụng'
      });
    }

    // If role is employee, check if employee exists
    let employee = null;
    if (role === 'employee' && employeeId) {
      employee = await Employee.findById(employeeId);
      if (!employee) {
        return res.status(400).json({
          success: false,
          message: 'Nhân viên không tồn tại'
        });
      }
    }

    // Create new user
    const user = new User({
      email,
      password,
      role,
      employee: role === 'employee' ? employeeId : undefined
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      data: {
        user: user.toJSON(),
        token
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi đăng ký',
      error: error.message
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login attempt:', { email, hasPassword: !!password });

    // Find user by email or username
    const query = {
      $or: [
        { username: email }
      ]
    };

    // Only add email to query if email is provided and looks like email
    if (email && email.includes('@')) {
      query.$or.push({ email: email });
    }

    console.log('🔍 Query:', JSON.stringify(query));

    const user = await User.findOne(query).populate('employee');
    console.log('👤 User found:', user ? { id: user._id, username: user.username, email: user.email, role: user.role } : 'NOT FOUND');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email/Username hoặc mật khẩu không chính xác'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản đã bị khóa'
      });
    }

    // Compare password
    console.log('🔑 Comparing password...');
    const isPasswordValid = await user.comparePassword(password);
    console.log('🔑 Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email/Username hoặc mật khẩu không chính xác'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    console.log('✅ Login successful for:', user.username || user.email);

    // Get employee profile completion status if user is employee
    let profileCompleted = true;
    if (user.role === 'employee' && user.employee) {
      const Employee = require('../models/Employee');
      const employee = await Employee.findById(user.employee._id || user.employee);
      if (employee) {
        profileCompleted = employee.profileCompleted || false;
      }
    }

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        user: {
          ...user.toJSON(),
          name: user.username || user.email,
          email: user.email || `${user.username}@system.local`,
          profileCompleted: profileCompleted
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi đăng nhập',
      error: error.message
    });
  }
};

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    // req.user đã được populate từ authMiddleware, không cần query lại
    const user = req.user;

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Người dùng không tồn tại'
      });
    }

    res.json({
      success: true,
      data: {
        user: user.toJSON()
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thông tin',
      error: error.message
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
      });
    }

    // req.user đã được populate từ authMiddleware
    const user = req.user;

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Người dùng không tồn tại'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không chính xác'
      });
    }

    // Check if new password is same as current password
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải khác mật khẩu hiện tại'
      });
    }

    // Update password (pre-save hook sẽ tự động hash)
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Đổi mật khẩu thành công'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi đổi mật khẩu',
      error: error.message
    });
  }
};

// ============================================
// ACCOUNT MANAGEMENT (Admin only)
// ============================================

// Get all accounts
exports.getAllAccounts = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập chức năng này'
      });
    }

    const accounts = await User.find()
      .populate('employee', 'name employeeId department position')
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: accounts
    });

  } catch (error) {
    console.error('Get all accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách tài khoản',
      error: error.message
    });
  }
};

// Update account (role, status)
exports.updateAccount = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập chức năng này'
      });
    }

    const { id } = req.params;
    const { role, isActive } = req.body;

    const account = await User.findById(id);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Tài khoản không tồn tại'
      });
    }

    // Prevent admin from deactivating their own account
    if (id === req.user._id.toString() && isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'Bạn không thể khóa tài khoản của chính mình'
      });
    }

    // Update fields
    if (role !== undefined) account.role = role;
    if (isActive !== undefined) account.isActive = isActive;

    await account.save();

    res.json({
      success: true,
      message: 'Cập nhật tài khoản thành công',
      data: account.toJSON()
    });

  } catch (error) {
    console.error('Update account error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật tài khoản',
      error: error.message
    });
  }
};

// Reset account password (Admin)
exports.resetAccountPassword = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập chức năng này'
      });
    }

    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
      });
    }

    const account = await User.findById(id);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Tài khoản không tồn tại'
      });
    }

    // Update password (pre-save hook sẽ tự động hash)
    account.password = newPassword;
    await account.save();

    res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công'
    });

  } catch (error) {
    console.error('Reset account password error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi đặt lại mật khẩu',
      error: error.message
    });
  }
};