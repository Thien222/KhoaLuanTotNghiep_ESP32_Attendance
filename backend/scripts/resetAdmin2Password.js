require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in environment variables!');
  console.error('Please set MONGODB_URI in your .env or config.env file');
  process.exit(1);
}

const resetAdmin2Password = async () => {
  try {
    console.log('🔌 Đang kết nối đến MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Đã kết nối MongoDB\n');

    // Find admin2 user
    const admin2 = await User.findOne({ 
      $or: [
        { username: 'admin2' },
        { email: 'admin2@company.com' }
      ]
    });

    if (!admin2) {
      console.log('❌ Không tìm thấy admin2!');
      console.log('   Vui lòng chạy: node scripts/createAdmin2.js\n');
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log('📋 Tìm thấy admin2:');
    console.log(`   Username: ${admin2.username}`);
    console.log(`   Email: ${admin2.email}`);
    console.log(`   Role: ${admin2.role}`);
    console.log(`   Active: ${admin2.isActive}\n`);

    // Hash password manually
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // Update password directly (bypass pre-save hook)
    await User.findByIdAndUpdate(admin2._id, {
      password: hashedPassword
    });

    console.log('✅ Đã reset password cho admin2!\n');

    // Verify password
    const updatedUser = await User.findById(admin2._id);
    const isValid = await bcrypt.compare('admin123', updatedUser.password);
    
    if (isValid) {
      console.log('✅ Password đã được hash và verify thành công!\n');
    } else {
      console.log('❌ Password verification failed!\n');
    }

    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║     ✅ ADMIN2 PASSWORD RESET SUCCESSFULLY!           ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log('');
    console.log('   📧 Email/Username: admin2');
    console.log('   🔑 Password: admin123');
    console.log('');
    console.log('   Bây giờ bạn có thể đăng nhập!\n');

    await mongoose.connection.close();
    console.log('🔌 Đã đóng kết nối MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi reset password:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the script
resetAdmin2Password();

