require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Employee = require('../models/Employee');

// Use the same MongoDB URI as backend app.js
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in environment variables!');
  console.error('Please set MONGODB_URI in your .env or config.env file');
  process.exit(1);
}

const createAdmin2 = async () => {
  try {
    console.log('🔌 Đang kết nối đến MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Đã kết nối MongoDB\n');

    // Check if admin2 already exists
    const existingAdmin2 = await User.findOne({ 
      $or: [
        { username: 'admin2' },
        { email: 'admin2@company.com' }
      ]
    });

    if (existingAdmin2) {
      console.log('⚠️  Admin2 đã tồn tại!');
      console.log(`   Username: ${existingAdmin2.username || existingAdmin2.email}`);
      console.log('   Bạn có thể sử dụng tài khoản này hoặc xóa và tạo lại.\n');
      
      // Update password if exists
      existingAdmin2.password = 'admin123';
      await existingAdmin2.save();
      console.log('✅ Đã cập nhật password cho admin2: admin123\n');
      
      await mongoose.connection.close();
      process.exit(0);
    }

    // Create admin2 employee
    console.log('📝 Đang tạo employee cho admin2...');
    const admin2Employee = new Employee({
      name: 'Administrator 2',
      employeeId: 'ADMIN002',
      fingerprintId: 998, // Special ID for admin2
      fingerprintTemplate: 'admin2_no_fingerprint',
      fingerprintEnrolled: false,
      email: 'admin2@company.com',
      phone: '0123456789',
      position: 'Director',
      department: 'Management',
      contractType: 'official',
      salary: 100000000, // 100M VND
      profileCompleted: true,
      annualLeaveDays: 12,
      usedLeaveDays: 0
    });

    await admin2Employee.save();
    console.log('✅ Đã tạo employee cho admin2\n');

    // Create admin2 user account
    console.log('👤 Đang tạo user account cho admin2...');
    const admin2User = new User({
      username: 'admin2',
      email: 'admin2@company.com',
      password: 'admin123', // Will be hashed by pre-save hook
      role: 'manager', // Use manager role (highest privilege)
      employee: admin2Employee._id,
      isActive: true
    });

    await admin2User.save();
    console.log('✅ Đã tạo user account cho admin2\n');

    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║     🎉 ADMIN2 ACCOUNT CREATED SUCCESSFULLY!          ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log('');
    console.log('   📧 Email/Username: admin2');
    console.log('   🔑 Password: admin123');
    console.log('   👔 Role: manager (admin privileges)');
    console.log('   📊 Employee ID: ADMIN002');
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║  ⚠️  Vui lòng đổi mật khẩu sau lần đăng nhập đầu!    ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    await mongoose.connection.close();
    console.log('🔌 Đã đóng kết nối MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi tạo admin2:', error);
    
    if (error.code === 11000) {
      console.error('\n⚠️  Lỗi: Email hoặc username đã tồn tại!');
      console.error('   Vui lòng xóa user cũ trước hoặc sử dụng email khác.\n');
    }
    
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the script
createAdmin2();

