const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET is not set in environment variables!');
  console.error('Please set JWT_SECRET in your .env or config.env file');
  throw new Error('JWT_SECRET is required');
}

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    console.log('🔐 Auth middleware - Request:', {
      path: req.path,
      method: req.method,
      hasAuthHeader: !!req.headers.authorization,
      tokenLength: token ? token.length : 0
    });

    if (!token) {
      console.log('❌ No token found in request');
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập. Vui lòng đăng nhập để truy cập.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Token verified:', { userId: decoded.userId, id: decoded.id });

    // Check if user still exists - support both decoded.userId (from authController) and decoded.id
    const userId = decoded.userId || decoded.id;
    const user = await User.findById(userId).populate('employee');
    
    console.log('🔐 Auth middleware - User:', user?.username, 'Employee:', user?.employee?.name || 'NULL');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Người dùng không tồn tại hoặc đã bị xóa.'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn đã bị vô hiệu hóa.'
      });
    }

    // Check if user changed password after token was issued
    try {
      if (user.changedPasswordAfter && user.changedPasswordAfter(decoded.iat)) {
        return res.status(401).json({
          success: false,
          message: 'Mật khẩu đã được thay đổi. Vui lòng đăng nhập lại.'
        });
      }
    } catch (pwdCheckError) {
      console.error('Password check error:', pwdCheckError);
      // Continue anyway - don't block user
    }

    // Grant access to protected route
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ. Vui lòng đăng nhập lại.'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token đã hết hạn. Vui lòng đăng nhập lại.'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Lỗi xác thực',
      error: error.message
    });
  }
};

// Restrict to specific roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // Log for debugging
    console.log('🔐 restrictTo check:', {
      userRole: req.user?.role,
      allowedRoles: roles,
      hasAccess: roles.includes(req.user?.role)
    });
    
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Bạn không có quyền truy cập chức năng này. Yêu cầu role: ${roles.join(' hoặc ')}. Role hiện tại: ${req.user?.role || 'không xác định'}`
      });
    }
    next();
  };
};





