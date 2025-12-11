/**
 * Generate Full Month Attendance for May 2025
 * Run with: node scripts/generateMay2025AttendanceNode.js
 */

require('dotenv').config({ path: './config.env' });
require('dotenv').config({ path: './.env' });

const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const OvertimeRequest = require('../models/OvertimeRequest');
const Employee = require('../models/Employee');
const User = require('../models/User');

// ============ CONFIGURATION ============
const MONTH = 5;  // May
const YEAR = 2025;

// Helper functions
function getWorkingDaysInMonth(year, month) {
    const days = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        // Skip Sunday (0) only
        if (dayOfWeek !== 0) {
            days.push(date);
        }
    }
    return days;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandomDays(days, count) {
    const shuffled = [...days].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

async function main() {
    try {
        const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB\n');

        // Get employees (skip admin)
        const employees = await Employee.find({ employeeId: { $regex: /^EMP/ } })
            .sort({ employeeId: 1 })
            .limit(7);

        console.log(`👥 Found ${employees.length} employees\n`);

        // Get admin user for reviewing OT
        const adminUser = await User.findOne({ role: 'manager' });
        if (!adminUser) {
            throw new Error('No admin/manager user found!');
        }
        console.log(`👤 Admin user: ${adminUser.username}\n`);

        // Configuration for each employee
        const employeeConfigs = [
            { hasOT: true, otDays: 3, isLate: false },   // EMP001
            { hasOT: false, otDays: 0, isLate: true },   // EMP002 - Đi trễ
            { hasOT: true, otDays: 2, isLate: false },   // EMP003
            { hasOT: false, otDays: 0, isLate: false },  // EMP004
            { hasOT: true, otDays: 2, isLate: false },   // EMP005
            { hasOT: true, otDays: 3, isLate: false },   // EMP006
            { hasOT: false, otDays: 0, isLate: true },   // EMP007 - Đi trễ
        ];

        // Get working days
        const workingDays = getWorkingDaysInMonth(YEAR, MONTH);
        console.log(`📅 Working days in May 2025: ${workingDays.length}\n`);

        // Delete old data
        const startDate = new Date(YEAR, MONTH - 1, 1);
        const endDate = new Date(YEAR, MONTH, 0, 23, 59, 59);

        console.log('🗑️ Deleting old data...');
        const delAtt = await Attendance.deleteMany({ date: { $gte: startDate, $lte: endDate } });
        const delOT = await OvertimeRequest.deleteMany({ date: { $gte: startDate, $lte: endDate } });
        console.log(`   Deleted ${delAtt.deletedCount} attendance, ${delOT.deletedCount} OT requests\n`);

        // Generate data
        let totalAttendances = 0;
        let totalOTRequests = 0;

        for (let i = 0; i < employees.length; i++) {
            const emp = employees[i];
            const config = employeeConfigs[i] || { hasOT: false, otDays: 0, isLate: false };

            console.log(`👤 ${emp.name} (${emp.employeeId})`);

            // Pick random OT days
            const otDays = config.hasOT ? pickRandomDays(workingDays, config.otDays) : [];
            const otDayStrings = otDays.map(d => d.toISOString().split('T')[0]);

            // Pick random late days
            const lateDays = config.isLate ? pickRandomDays(workingDays, randomInt(2, 3)) : [];
            const lateDayStrings = lateDays.map(d => d.toISOString().split('T')[0]);

            // Create OT Requests
            for (const otDate of otDays) {
                await OvertimeRequest.create({
                    employee: emp._id,
                    date: otDate,
                    startTime: "18:00",
                    endTime: "20:00",
                    reason: "Hoàn thành công việc dự án tháng 5",
                    estimatedHours: 2,
                    status: "approved",
                    reviewedBy: adminUser._id,
                    reviewedAt: new Date(),
                    reviewComment: "Đã duyệt - Auto generated",
                    appliedAt: new Date(otDate.getTime() - 86400000)
                });
                totalOTRequests++;
            }

            // Create attendance for each working day
            for (const workDate of workingDays) {
                const dateStr = workDate.toISOString().split('T')[0];
                const isOTDay = otDayStrings.includes(dateStr);
                const isLateDay = lateDayStrings.includes(dateStr);

                let checkInHour = 8, checkInMinute = 0, lateMinutes = 0;
                let checkInStatus = "on-time", actualPenalty = 0;

                if (isLateDay) {
                    lateMinutes = randomInt(15, 45);
                    checkInMinute = lateMinutes;
                    checkInStatus = "late";
                    actualPenalty = Math.ceil(lateMinutes / 15) * 20000;
                }

                const checkOutHour = isOTDay ? 20 : 17;
                const checkOutStatus = isOTDay ? "overtime" : "on-time";
                const workingHours = isOTDay ? 11 : 8;
                const overtimeHours = isOTDay ? 2 : 0;
                const estimatedOTSalary = isOTDay ? overtimeHours * 100000 : 0;

                const checkInTime = new Date(YEAR, MONTH - 1, workDate.getDate(), checkInHour, checkInMinute, 0);
                const checkOutTime = new Date(YEAR, MONTH - 1, workDate.getDate(), checkOutHour, 0, 0);
                const attendanceDate = new Date(YEAR, MONTH - 1, workDate.getDate(), 0, 0, 0);

                await Attendance.create({
                    employee: emp._id,
                    fingerprintId: emp.fingerprintId,
                    date: attendanceDate,
                    checkIn: { time: checkInTime, status: checkInStatus },
                    checkOut: { time: checkOutTime, status: checkOutStatus },
                    workingHours,
                    status: "present",
                    lateMinutes,
                    latePenalty: 0,
                    overtimeHours,
                    overtimeRate: 1.5,
                    isHoliday: false,
                    holidayRate: 1,
                    autoCheckout: false,
                    incompleteCheckout: false,
                    estimatedOTSalary,
                    actualPenalty,
                    is_ot_approved: isOTDay,
                    isManual: true,
                    autoCompleted: false,
                    earlyMinutes: 0,
                    notes: isOTDay ? "OT đã duyệt" : (isLateDay ? `Đi trễ ${lateMinutes}p` : "")
                });
                totalAttendances++;
            }

            console.log(`   ✅ ${workingDays.length} attendance records`);
            if (config.hasOT) console.log(`   ✅ ${config.otDays} OT requests (approved)`);
            if (config.isLate) console.log(`   ⚠️ Has late days`);
        }

        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('📊 SUMMARY');
        console.log('='.repeat(50));
        console.log(`Total Employees: ${employees.length}`);
        console.log(`Total Attendance: ${totalAttendances}`);
        console.log(`Total OT Requests: ${totalOTRequests}`);
        console.log('='.repeat(50));
        console.log('✅ DONE!');

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

main();
