// ============================================================
// MONGODB SCRIPT - Generate Full Month Attendance for May 2025
// Copy and paste this into MongoDB Atlas Shell
// ============================================================

// Switch to your database
// use("your_database_name");

// ============ CONFIGURATION ============
const MONTH = 5;  // May
const YEAR = 2025;
const ADMIN_USER_ID = ObjectId("6911d1b9a3ddc445be1dc9e8"); // admin2

// Employee data with configuration
const employees = [
    { _id: ObjectId("6929338b453fdf3f0a89d42d"), name: "Tror Trái", employeeId: "EMP001", fingerprintId: 6, hasOT: true, otDays: 3, isLateEmployee: false },
    { _id: ObjectId("6927ecd7c497f42da3bd19f5"), name: "KhamVT02", employeeId: "EMP002", fingerprintId: 2, hasOT: false, otDays: 0, isLateEmployee: true },  // Đi trễ
    { _id: ObjectId("69297fb0fafac8476531bb6f"), name: "Nguyễn Phương Danh", employeeId: "EMP003", fingerprintId: 11, hasOT: true, otDays: 2, isLateEmployee: false },
    { _id: ObjectId("692b09faf579473676abb3c8"), name: "Giữa Trái", employeeId: "EMP004", fingerprintId: 12, hasOT: false, otDays: 0, isLateEmployee: false },
    { _id: ObjectId("69296afb18d1da61cd1f8451"), name: "Ngô Phương Trỏ", employeeId: "EMP005", fingerprintId: 9, hasOT: true, otDays: 2, isLateEmployee: false },
    { _id: ObjectId("692936f32baa41c5eda6f061"), name: "Trỏ Phải", employeeId: "EMP006", fingerprintId: 7, hasOT: true, otDays: 3, isLateEmployee: false },
    { _id: ObjectId("69296bc018d1da61cd1f8465"), name: "Phương Giữa Phải", employeeId: "EMP007", fingerprintId: 10, hasOT: false, otDays: 0, isLateEmployee: true },  // Đi trễ
];

// ============ HELPER FUNCTIONS ============
function getWorkingDaysInMonth(year, month) {
    const days = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();

        // Skip Sunday (0) only, Saturday (6) is working day
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

// ============ STEP 1: DELETE OLD DATA ============
print("🗑️ Deleting old data for May 2025...");

const startDate = new Date(YEAR, MONTH - 1, 1);
const endDate = new Date(YEAR, MONTH, 0, 23, 59, 59);

// Delete old attendance records
const deleteAttendanceResult = db.attendances.deleteMany({
    date: { $gte: startDate, $lte: endDate }
});
print(`   Deleted ${deleteAttendanceResult.deletedCount} attendance records`);

// Delete old OT requests
const deleteOTResult = db.overtimerequests.deleteMany({
    date: { $gte: startDate, $lte: endDate }
});
print(`   Deleted ${deleteOTResult.deletedCount} OT requests`);

// ============ STEP 2: GENERATE DATA ============
const workingDays = getWorkingDaysInMonth(YEAR, MONTH);
print(`\n📅 Found ${workingDays.length} working days in May 2025`);

let totalAttendances = 0;
let totalOTRequests = 0;

employees.forEach(emp => {
    print(`\n👤 Processing: ${emp.name} (${emp.employeeId})`);

    // Pick random OT days for this employee
    const otDays = emp.hasOT ? pickRandomDays(workingDays, emp.otDays) : [];
    const otDayStrings = otDays.map(d => d.toISOString().split('T')[0]);

    // Pick random late days for late employees (2-3 days)
    const lateDays = emp.isLateEmployee ? pickRandomDays(workingDays, randomInt(2, 3)) : [];
    const lateDayStrings = lateDays.map(d => d.toISOString().split('T')[0]);

    // Create OT Requests (approved)
    otDays.forEach(otDate => {
        const otRequest = {
            employee: emp._id,
            date: otDate,
            startTime: "18:00",
            endTime: "20:00",
            reason: "Hoàn thành công việc dự án tháng 5",
            estimatedHours: 2,
            status: "approved",
            reviewedBy: ADMIN_USER_ID,
            reviewedAt: new Date(),
            reviewComment: "Đã duyệt - Auto generated",
            appliedAt: new Date(otDate.getTime() - 86400000), // Applied 1 day before
            createdAt: new Date(otDate.getTime() - 86400000),
            updatedAt: new Date()
        };

        db.overtimerequests.insertOne(otRequest);
        totalOTRequests++;
    });

    // Create Attendance for each working day
    workingDays.forEach(workDate => {
        const dateStr = workDate.toISOString().split('T')[0];
        const isOTDay = otDayStrings.includes(dateStr);
        const isLateDay = lateDayStrings.includes(dateStr);

        // Calculate times
        let checkInHour = 8;
        let checkInMinute = 0;
        let lateMinutes = 0;
        let checkInStatus = "on-time";
        let actualPenalty = 0;

        if (isLateDay) {
            // Random late: 15-45 minutes
            lateMinutes = randomInt(15, 45);
            checkInMinute = lateMinutes;
            checkInStatus = "late";
            // Penalty: 20k per 15 minutes
            actualPenalty = Math.ceil(lateMinutes / 15) * 20000;
        }

        // Check-out time: 17:00 normal, 20:00 if OT
        const checkOutHour = isOTDay ? 20 : 17;
        const checkOutMinute = 0;
        const checkOutStatus = isOTDay ? "overtime" : "on-time";

        // Working hours
        const workingHours = isOTDay ? 11 : 8;
        const overtimeHours = isOTDay ? 2 : 0;
        const otRate = 100000; // 100k per hour
        const estimatedOTSalary = isOTDay ? overtimeHours * otRate : 0;

        // Create date objects in UTC (for Vietnam timezone, subtract 7 hours)
        const checkInTime = new Date(Date.UTC(YEAR, MONTH - 1, workDate.getDate(), checkInHour - 7, checkInMinute, 0));
        const checkOutTime = new Date(Date.UTC(YEAR, MONTH - 1, workDate.getDate(), checkOutHour - 7, checkOutMinute, 0));
        const attendanceDate = new Date(Date.UTC(YEAR, MONTH - 1, workDate.getDate(), 17, 0, 0)); // 00:00 Vietnam = 17:00 UTC previous day

        const attendance = {
            employee: emp._id,
            fingerprintId: emp.fingerprintId,
            date: attendanceDate,
            checkIn: {
                time: checkInTime,
                status: checkInStatus
            },
            checkOut: {
                time: checkOutTime,
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
            notes: isOTDay ? "OT đã duyệt" : (isLateDay ? `Đi trễ ${lateMinutes} phút` : ""),
            createdAt: checkInTime,
            updatedAt: checkOutTime
        };

        db.attendances.insertOne(attendance);
        totalAttendances++;
    });

    print(`   ✅ Created ${workingDays.length} attendance records`);
    if (emp.hasOT) print(`   ✅ Created ${emp.otDays} approved OT requests`);
    if (emp.isLateEmployee) print(`   ⚠️ Has ${lateDays.length} late days`);
});

// ============ SUMMARY ============
print("\n" + "=".repeat(50));
print("📊 SUMMARY");
print("=".repeat(50));
print(`Total Employees: ${employees.length}`);
print(`Total Attendance Records: ${totalAttendances}`);
print(`Total OT Requests (approved): ${totalOTRequests}`);
print(`Month: May ${YEAR}`);
print(`Working Days: ${workingDays.length}`);
print("=".repeat(50));
print("✅ DONE! Data generation completed.");
