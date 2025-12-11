/**
 * Generate JSON files for MongoDB Atlas Import - April 2025
 * Run with: node scripts/generateApril2025JSON.js
 * Output: scripts/april2025_attendances.json, scripts/april2025_overtimerequests.json
 */

const fs = require('fs');
const path = require('path');

// ============ CONFIGURATION ============
const MONTH = 4;  // April
const YEAR = 2025;
const ADMIN_USER_ID = "6911d1b9a3ddc445be1dc9e8"; // admin2

// Employee data
const employees = [
    { _id: "6929338b453fdf3f0a89d42d", name: "Tror Trái", employeeId: "EMP001", fingerprintId: 6, hasOT: true, otDays: 3, isLate: false },
    { _id: "6927ecd7c497f42da3bd19f5", name: "KhamVT02", employeeId: "EMP002", fingerprintId: 2, hasOT: false, otDays: 0, isLate: true },
    { _id: "69297fb0fafac8476531bb6f", name: "Nguyễn Phương Danh", employeeId: "EMP003", fingerprintId: 11, hasOT: true, otDays: 2, isLate: false },
    { _id: "692b09faf579473676abb3c8", name: "Giữa Trái", employeeId: "EMP004", fingerprintId: 12, hasOT: false, otDays: 0, isLate: false },
    { _id: "69296afb18d1da61cd1f8451", name: "Ngô Phương Trỏ", employeeId: "EMP005", fingerprintId: 9, hasOT: true, otDays: 2, isLate: false },
    { _id: "692936f32baa41c5eda6f061", name: "Trỏ Phải", employeeId: "EMP006", fingerprintId: 7, hasOT: true, otDays: 3, isLate: false },
    { _id: "69296bc018d1da61cd1f8465", name: "Phương Giữa Phải", employeeId: "EMP007", fingerprintId: 10, hasOT: false, otDays: 0, isLate: true },
];

// Helper functions
function getWorkingDaysInMonth(year, month) {
    const days = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 0) { // Skip Sunday
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

function generateObjectId() {
    return Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

// Main generation
const workingDays = getWorkingDaysInMonth(YEAR, MONTH);
const attendances = [];
const otRequests = [];

console.log(`📅 Generating data for April ${YEAR}...`);
console.log(`   Working days: ${workingDays.length}`);

employees.forEach(emp => {
    console.log(`👤 Processing: ${emp.name}`);

    // Pick random OT days
    const otDays = emp.hasOT ? pickRandomDays(workingDays, emp.otDays) : [];
    const otDayStrings = otDays.map(d => d.toISOString().split('T')[0]);

    // Pick random late days
    const lateDays = emp.isLate ? pickRandomDays(workingDays, randomInt(2, 3)) : [];
    const lateDayStrings = lateDays.map(d => d.toISOString().split('T')[0]);

    // Create OT Requests
    otDays.forEach(otDate => {
        otRequests.push({
            _id: { "$oid": generateObjectId() },
            employee: { "$oid": emp._id },
            date: { "$date": otDate.toISOString() },
            startTime: "18:00",
            endTime: "20:00",
            reason: "Hoàn thành công việc dự án tháng 4",
            estimatedHours: 2,
            status: "approved",
            reviewedBy: { "$oid": ADMIN_USER_ID },
            reviewedAt: { "$date": new Date().toISOString() },
            reviewComment: "Đã duyệt - Auto generated",
            appliedAt: { "$date": new Date(otDate.getTime() - 86400000).toISOString() },
            createdAt: { "$date": new Date(otDate.getTime() - 86400000).toISOString() },
            updatedAt: { "$date": new Date().toISOString() }
        });
    });

    // Create Attendance
    workingDays.forEach(workDate => {
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

        attendances.push({
            _id: { "$oid": generateObjectId() },
            employee: { "$oid": emp._id },
            fingerprintId: emp.fingerprintId,
            date: { "$date": attendanceDate.toISOString() },
            checkIn: {
                time: { "$date": checkInTime.toISOString() },
                status: checkInStatus
            },
            checkOut: {
                time: { "$date": checkOutTime.toISOString() },
                status: checkOutStatus
            },
            workingHours: workingHours,
            status: "present",
            lateMinutes: lateMinutes,
            latePenalty: 0,
            overtimeHours: overtimeHours,
            overtimeRate: 1.5,
            isHoliday: false,
            holidayRate: 1,
            autoCheckout: false,
            incompleteCheckout: false,
            estimatedOTSalary: estimatedOTSalary,
            actualPenalty: actualPenalty,
            is_ot_approved: isOTDay,
            isManual: true,
            autoCompleted: false,
            earlyMinutes: 0,
            notes: isOTDay ? "OT đã duyệt" : (isLateDay ? `Đi trễ ${lateMinutes}p` : ""),
            createdAt: { "$date": checkInTime.toISOString() },
            updatedAt: { "$date": checkOutTime.toISOString() }
        });
    });
});

// Write JSON files
const scriptsDir = path.dirname(__filename);

fs.writeFileSync(
    path.join(scriptsDir, 'april2025_attendances.json'),
    JSON.stringify(attendances, null, 2)
);

fs.writeFileSync(
    path.join(scriptsDir, 'april2025_overtimerequests.json'),
    JSON.stringify(otRequests, null, 2)
);

console.log('\n' + '='.repeat(50));
console.log('📊 SUMMARY - APRIL 2025');
console.log('='.repeat(50));
console.log(`Total Attendances: ${attendances.length}`);
console.log(`Total OT Requests: ${otRequests.length}`);
console.log('='.repeat(50));
console.log('📁 Files created:');
console.log('   - scripts/april2025_attendances.json');
console.log('   - scripts/april2025_overtimerequests.json');
console.log('\n✅ Import these files into MongoDB Atlas!');
