// Load environment variables
require('../load-env');
require('dotenv').config({ path: '../.env' });

const mongoose = require('mongoose');
const User = require('../models/User');
const Employee = require('../models/Employee');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in environment variables!');
  console.error('Please set MONGODB_URI in your .env or config.env file');
  process.exit(1);
}

const seedAdmin = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected successfully');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('❌ Admin account already exists!');
      console.log('Username: admin');
      console.log('You can use the existing admin account.');
      process.exit(0);
    }

    // Create admin employee
    console.log('Creating admin employee...');
    const adminEmployee = new Employee({
      name: 'Administrator',
      employeeId: 'ADMIN001',
      fingerprintId: 999, // Special ID for admin
      fingerprintTemplate: 'admin_no_fingerprint',
      fingerprintEnrolled: false,
      email: 'admin@company.com',
      phone: '0123456789',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'Nam',
      cccd: '000000000000',
      address: 'Admin Office',
      position: 'Director',
      department: 'Management',
      contractType: 'Chính thức',
      startDate: new Date(),
      salary: {
        basic: 100000000, // 100M VND
        overtimeMultiplier: 2.0
      }
    });

    await adminEmployee.save();
    console.log('✅ Admin employee created successfully');

    // Create admin user account
    console.log('Creating admin user account...');
    const adminUser = new User({
      username: 'admin',
      password: 'admin123', // Will be hashed by pre-save hook
      employee: adminEmployee._id,
      role: 'admin',
      isActive: true
    });

    await adminUser.save();
    console.log('✅ Admin user account created successfully');

    console.log('\n========================================');
    console.log('🎉 ADMIN ACCOUNT CREATED SUCCESSFULLY!');
    console.log('========================================');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('Role: admin');
    console.log('========================================');
    console.log('⚠️  Please change the password after first login!');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();







