require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');
const Holiday = require('../models/Holiday');

// MongoDB URI - must be set in environment variables
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in environment variables!');
  console.error('Please set MONGODB_URI in your .env or config.env file');
  process.exit(1);
}

console.log('Connecting to MongoDB...');
console.log('URI:', MONGODB_URI.replace(/:[^:]*@/, ':****@')); // Hide password in log

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✓ MongoDB connected'))
.catch(err => {
  console.error('✗ MongoDB connection error:', err);
  process.exit(1);
});

// Vietnamese Holidays 2024-2025
const holidays = [
  // 2024
  {
    name: 'Tết Dương lịch',
    date: new Date('2024-01-01'),
    type: 'national',
    workRate: 2.0,
    description: 'Năm mới dương lịch'
  },
  {
    name: 'Tết Nguyên Đán (Mùng 1)',
    date: new Date('2024-02-10'),
    type: 'tet',
    workRate: 3.0,
    description: 'Tết Âm lịch - Mùng 1 Tết'
  },
  {
    name: 'Tết Nguyên Đán (Mùng 2)',
    date: new Date('2024-02-11'),
    type: 'tet',
    workRate: 3.0,
    description: 'Tết Âm lịch - Mùng 2 Tết'
  },
  {
    name: 'Tết Nguyên Đán (Mùng 3)',
    date: new Date('2024-02-12'),
    type: 'tet',
    workRate: 3.0,
    description: 'Tết Âm lịch - Mùng 3 Tết'
  },
  {
    name: 'Tết Nguyên Đán (Mùng 4)',
    date: new Date('2024-02-13'),
    type: 'tet',
    workRate: 3.0,
    description: 'Tết Âm lịch - Mùng 4 Tết'
  },
  {
    name: 'Tết Nguyên Đán (Mùng 5)',
    date: new Date('2024-02-14'),
    type: 'tet',
    workRate: 3.0,
    description: 'Tết Âm lịch - Mùng 5 Tết'
  },
  {
    name: 'Giỗ Tổ Hùng Vương',
    date: new Date('2024-04-18'),
    type: 'national',
    workRate: 2.0,
    description: 'Ngày Giỗ Tổ Hùng Vương'
  },
  {
    name: 'Ngày Thống nhất',
    date: new Date('2024-04-30'),
    type: 'national',
    workRate: 2.0,
    description: 'Ngày Giải phóng miền Nam, thống nhất đất nước'
  },
  {
    name: 'Quốc tế Lao động',
    date: new Date('2024-05-01'),
    type: 'national',
    workRate: 2.0,
    description: 'Ngày Quốc tế Lao động'
  },
  {
    name: 'Quốc khánh',
    date: new Date('2024-09-02'),
    type: 'national',
    workRate: 2.0,
    description: 'Ngày Quốc khánh nước Cộng hòa XHCN Việt Nam'
  },
  
  // 2025
  {
    name: 'Tết Dương lịch',
    date: new Date('2025-01-01'),
    type: 'national',
    workRate: 2.0,
    description: 'Năm mới dương lịch'
  },
  {
    name: 'Tết Nguyên Đán (Mùng 1)',
    date: new Date('2025-01-29'),
    type: 'tet',
    workRate: 3.0,
    description: 'Tết Âm lịch - Mùng 1 Tết'
  },
  {
    name: 'Tết Nguyên Đán (Mùng 2)',
    date: new Date('2025-01-30'),
    type: 'tet',
    workRate: 3.0,
    description: 'Tết Âm lịch - Mùng 2 Tết'
  },
  {
    name: 'Tết Nguyên Đán (Mùng 3)',
    date: new Date('2025-01-31'),
    type: 'tet',
    workRate: 3.0,
    description: 'Tết Âm lịch - Mùng 3 Tết'
  },
  {
    name: 'Tết Nguyên Đán (Mùng 4)',
    date: new Date('2025-02-01'),
    type: 'tet',
    workRate: 3.0,
    description: 'Tết Âm lịch - Mùng 4 Tết'
  },
  {
    name: 'Tết Nguyên Đán (Mùng 5)',
    date: new Date('2025-02-02'),
    type: 'tet',
    workRate: 3.0,
    description: 'Tết Âm lịch - Mùng 5 Tết'
  },
  {
    name: 'Giỗ Tổ Hùng Vương',
    date: new Date('2025-04-07'),
    type: 'national',
    workRate: 2.0,
    description: 'Ngày Giỗ Tổ Hùng Vương'
  },
  {
    name: 'Ngày Thống nhất',
    date: new Date('2025-04-30'),
    type: 'national',
    workRate: 2.0,
    description: 'Ngày Giải phóng miền Nam, thống nhất đất nước'
  },
  {
    name: 'Quốc tế Lao động',
    date: new Date('2025-05-01'),
    type: 'national',
    workRate: 2.0,
    description: 'Ngày Quốc tế Lao động'
  },
  {
    name: 'Quốc khánh',
    date: new Date('2025-09-02'),
    type: 'national',
    workRate: 2.0,
    description: 'Ngày Quốc khánh nước Cộng hòa XHCN Việt Nam'
  }
];

async function seedHolidays() {
  try {
    // Clear existing holidays
    await Holiday.deleteMany({});
    console.log('✓ Cleared existing holidays');
    
    // Insert new holidays
    await Holiday.insertMany(holidays);
    console.log(`✓ Seeded ${holidays.length} holidays successfully`);
    
    // Display seeded holidays
    const seededHolidays = await Holiday.find().sort({ date: 1 });
    console.log('\n📅 Seeded Holidays:');
    seededHolidays.forEach(h => {
      console.log(`  - ${h.name}: ${h.date.toLocaleDateString('vi-VN')} (x${h.workRate})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Error seeding holidays:', error);
    process.exit(1);
  }
}

seedHolidays();

