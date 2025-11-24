const mongoose = require('mongoose');
const Settings = require('../models/Settings');
require('dotenv').config();

const defaultSettings = [
  {
    type: 'working-hours',
    value: {
      startTime: '08:00',
      endTime: '17:00',
      breakStart: '12:00',
      breakEnd: '13:00'
    }
  },
  {
    type: 'overtime',
    value: {
      maxTime: '23:30',
      minDuration: 1,
      roundingRule: 'hour',
      weekdayRate: 1.5,
      weekendRate: 2.0,
      holidayRate: 3.0
    }
  },
  {
    type: 'late-policy',
    value: {
      graceMinutes: 15,
      penaltyAfterGrace: 50000,
      halfDayThreshold: 60,
      penaltyPerMinute: 0
    }
  },
  {
    type: 'early-checkin',
    value: {
      enabled: true,
      allowedTime: '06:00'
    }
  },
  {
    type: 'salary-structure',
    value: {
      positions: {
        'Nhân viên': 1.0,
        'Nhân viên Senior': 1.3,
        'Trưởng nhóm': 1.5,
        'Trưởng phòng': 2.0,
        'Giám đốc': 3.0
      },
      contractModifiers: {
        'intern': 1.0,
        'probation': 0.85,
        'official': 1.0
      }
    }
  },
  {
    type: 'leave-policy',
    value: {
      annualDays: 12,
      carryOverDays: 3,
      resetMonth: 1
    }
  },
  {
    type: 'auto-checkout',
    value: {
      enabled: true,
      defaultTime: '17:00',
      applyAfterHours: 2
    }
  }
];

async function seedSettings() {
  try {
    console.log('🔌 Đang kết nối đến MongoDB...');
    
    const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI is not set in environment variables!');
      console.error('Please set MONGODB_URI in your .env or config.env file');
      process.exit(1);
    }
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Đã kết nối MongoDB');
    console.log('🌱 Đang seed default settings...\n');

    let createdCount = 0;
    let updatedCount = 0;

    for (const setting of defaultSettings) {
      const existing = await Settings.findOne({ type: setting.type });
      
      if (existing) {
        await Settings.findOneAndUpdate(
          { type: setting.type },
          { value: setting.value },
          { new: true }
        );
        console.log(`🔄 Updated: ${setting.type}`);
        updatedCount++;
      } else {
        await Settings.create(setting);
        console.log(`✅ Created: ${setting.type}`);
        createdCount++;
      }
    }

    console.log(`\n✨ Hoàn thành!`);
    console.log(`   - Tạo mới: ${createdCount} settings`);
    console.log(`   - Cập nhật: ${updatedCount} settings`);
    console.log(`   - Tổng: ${createdCount + updatedCount} settings\n`);

    // Display current settings
    console.log('📋 Danh sách settings hiện tại:');
    const allSettings = await Settings.find();
    allSettings.forEach(s => {
      console.log(`   - ${s.type}: ${JSON.stringify(s.value).substring(0, 80)}...`);
    });

    await mongoose.connection.close();
    console.log('\n🔌 Đã đóng kết nối MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the seed
seedSettings();


