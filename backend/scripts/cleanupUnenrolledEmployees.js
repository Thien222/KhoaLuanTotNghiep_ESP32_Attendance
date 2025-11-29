/**
 * Script xóa toàn bộ dữ liệu liên quan đến employees chưa enroll vân tay
 * TRỪ ADMIN002
 * 
 * Chạy: node backend/scripts/cleanupUnenrolledEmployees.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../config.env') });
const mongoose = require('mongoose');

// Import models
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Payroll = require('../models/Payroll');
const PayrollAdjustment = require('../models/PayrollAdjustment');
const User = require('../models/User');
const EmployeeShift = require('../models/EmployeeShift');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance_system';

async function cleanupUnenrolledEmployees() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Tìm tất cả employees chưa enroll (trừ ADMIN002)
    console.log('\n📋 Finding unenrolled employees (excluding ADMIN002)...');
    const unenrolledEmployees = await Employee.find({
      fingerprintEnrolled: false,
      employeeId: { $ne: 'ADMIN002' }
    });

    console.log(`Found ${unenrolledEmployees.length} unenrolled employees:`);
    unenrolledEmployees.forEach(emp => {
      console.log(`  - ${emp.name} (${emp.employeeId}) - Fingerprint ID: ${emp.fingerprintId || 'N/A'}`);
    });

    if (unenrolledEmployees.length === 0) {
      console.log('\n✅ No unenrolled employees found (excluding ADMIN002). Nothing to clean up.');
      await mongoose.disconnect();
      return;
    }

    // Confirm deletion
    console.log(`\n⚠️  WARNING: This will delete ${unenrolledEmployees.length} employees and ALL related data!`);
    console.log('   Related data includes:');
    console.log('   - Attendance records');
    console.log('   - Leave requests');
    console.log('   - Payroll records');
    console.log('   - Payroll adjustments');
    console.log('   - User accounts');
    console.log('   - Employee shifts');
    
    // Get employee IDs
    const employeeIds = unenrolledEmployees.map(emp => emp._id);
    const employeeIdsStr = employeeIds.map(id => id.toString());

    // 2. Count related data
    console.log('\n📊 Counting related data...');
    const attendanceCount = await Attendance.countDocuments({ employee: { $in: employeeIds } });
    const leaveCount = await Leave.countDocuments({ employee: { $in: employeeIds } });
    const payrollCount = await Payroll.countDocuments({ employee: { $in: employeeIds } });
    const payrollAdjustmentCount = await PayrollAdjustment.countDocuments({ employee: { $in: employeeIds } });
    const userCount = await User.countDocuments({ employee: { $in: employeeIds } });
    const employeeShiftCount = await EmployeeShift.countDocuments({ employee: { $in: employeeIds } });

    console.log(`   - Attendance records: ${attendanceCount}`);
    console.log(`   - Leave requests: ${leaveCount}`);
    console.log(`   - Payroll records: ${payrollCount}`);
    console.log(`   - Payroll adjustments: ${payrollAdjustmentCount}`);
    console.log(`   - User accounts: ${userCount}`);
    console.log(`   - Employee shifts: ${employeeShiftCount}`);

    const totalRecords = attendanceCount + leaveCount + payrollCount + payrollAdjustmentCount + userCount + employeeShiftCount + unenrolledEmployees.length;
    console.log(`\n   Total records to delete: ${totalRecords}`);

    // 3. Delete related data
    console.log('\n🗑️  Starting deletion...');

    // Delete Attendance records
    if (attendanceCount > 0) {
      const attendanceResult = await Attendance.deleteMany({ employee: { $in: employeeIds } });
      console.log(`   ✅ Deleted ${attendanceResult.deletedCount} attendance records`);
    }

    // Delete Leave requests
    if (leaveCount > 0) {
      const leaveResult = await Leave.deleteMany({ employee: { $in: employeeIds } });
      console.log(`   ✅ Deleted ${leaveResult.deletedCount} leave requests`);
    }

    // Delete Payroll records
    if (payrollCount > 0) {
      const payrollResult = await Payroll.deleteMany({ employee: { $in: employeeIds } });
      console.log(`   ✅ Deleted ${payrollResult.deletedCount} payroll records`);
    }

    // Delete Payroll adjustments
    if (payrollAdjustmentCount > 0) {
      const adjustmentResult = await PayrollAdjustment.deleteMany({ employee: { $in: employeeIds } });
      console.log(`   ✅ Deleted ${adjustmentResult.deletedCount} payroll adjustments`);
    }

    // Delete User accounts
    if (userCount > 0) {
      const userResult = await User.deleteMany({ employee: { $in: employeeIds } });
      console.log(`   ✅ Deleted ${userResult.deletedCount} user accounts`);
    }

    // Delete Employee shifts
    if (employeeShiftCount > 0) {
      const shiftResult = await EmployeeShift.deleteMany({ employee: { $in: employeeIds } });
      console.log(`   ✅ Deleted ${shiftResult.deletedCount} employee shifts`);
    }

    // Delete Employees
    const employeeResult = await Employee.deleteMany({ 
      _id: { $in: employeeIds }
    });
    console.log(`   ✅ Deleted ${employeeResult.deletedCount} employees`);

    // 4. Summary
    console.log('\n✅ Cleanup completed!');
    console.log(`   Total deleted:`);
    console.log(`   - Employees: ${employeeResult.deletedCount}`);
    console.log(`   - Attendance: ${attendanceCount}`);
    console.log(`   - Leave: ${leaveCount}`);
    console.log(`   - Payroll: ${payrollCount}`);
    console.log(`   - Payroll Adjustments: ${payrollAdjustmentCount}`);
    console.log(`   - Users: ${userCount}`);
    console.log(`   - Employee Shifts: ${employeeShiftCount}`);
    console.log(`   - Grand Total: ${totalRecords} records`);

    // 5. Verify ADMIN002 is still there
    const admin002 = await Employee.findOne({ employeeId: 'ADMIN002' });
    if (admin002) {
      console.log(`\n✅ ADMIN002 is still in database: ${admin002.name} (${admin002.employeeId})`);
    } else {
      console.log(`\n⚠️  WARNING: ADMIN002 not found in database!`);
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run cleanup
if (require.main === module) {
  cleanupUnenrolledEmployees()
    .then(() => {
      console.log('\n🎉 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupUnenrolledEmployees };


