require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Employee = require('../models/Employee');

const createDemoUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hr_system');
    console.log('Connected to MongoDB');

    // Create demo employee first
    const demoEmployee = new Employee({
      name: 'Nguyễn Văn Demo',
      employeeId: 'EMP001',
      fingerprintId: 1,
      fingerprintEnrolled: true,
      position: 'Nhân viên',
      department: 'IT',
      email: 'employee@company.com',
      phone: '0123456789',
      status: 'active'
    });

    await demoEmployee.save();
    console.log('Demo employee created:', demoEmployee.name);

    // Create demo users
    const demoUsers = [
      {
        email: 'admin@company.com',
        password: '123456',
        role: 'manager',
        isActive: true
      },
      {
        email: 'accountant@company.com',
        password: '123456',
        role: 'accountant',
        isActive: true
      },
      {
        email: 'employee@company.com',
        password: '123456',
        role: 'employee',
        employee: demoEmployee._id,
        isActive: true
      }
    ];

    for (const userData of demoUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        const user = new User(userData);
        await user.save();
        console.log(`Demo user created: ${userData.email} (${userData.role})`);
      } else {
        console.log(`User already exists: ${userData.email}`);
      }
    }

    console.log('Demo users creation completed!');
    console.log('\n=== DEMO ACCOUNTS ===');
    console.log('Manager: admin@company.com / 123456');
    console.log('Accountant: accountant@company.com / 123456');
    console.log('Employee: employee@company.com / 123456');

  } catch (error) {
    console.error('Error creating demo users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

createDemoUsers();


