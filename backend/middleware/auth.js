const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
exports.authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Không có token, truy cập bị từ chối'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId).populate('employee');
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ'
      });
    }

    req.user = {
      userId: user._id,
      role: user.role,
      email: user.email,
      employee: user.employee
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      message: 'Token không hợp lệ'
    });
  }
};

// Check if user has required role
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Chưa xác thực'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập'
      });
    }

    next();
  };
};

// Check if user is manager or accountant
exports.requireManagerOrAccountant = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Chưa xác thực'
    });
  }

  if (!['manager', 'accountant'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Chỉ quản lý và kế toán mới có quyền truy cập'
    });
  }

  next();
};

// Check if user is manager only
exports.requireManager = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Chưa xác thực'
    });
  }

  if (req.user.role !== 'manager') {
    return res.status(403).json({
      success: false,
      message: 'Chỉ quản lý mới có quyền truy cập'
    });
  }

  next();
};


