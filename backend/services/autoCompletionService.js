/**
 * AUTO-COMPLETION SERVICE
 * 
 * Handles automatic attendance completion at 17:00 for employees
 * Based on new attendance rules:
 * 1. Regular employees (no OT): Auto-complete at 17:00 with 1 full work day
 * 2. OT employees: Auto-complete at OT shift end time with OT calculation
 */

const moment = require('moment-timezone');
const Attendance = require('../models/Attendance');
const EmployeeShift = require('../models/EmployeeShift');
const OvertimeRequest = require('../models/OvertimeRequest');
const Employee = require('../models/Employee');
const attendanceHelper = require('../utils/attendanceHelper');
const { getSystemTime } = require('../utils/timeMachine');

moment.tz.setDefault('Asia/Ho_Chi_Minh');

/**
 * Main auto-completion function
 * Called by cron job at 17:00 daily
 */
async function runAutoCompletion() {
  try {
    console.log('========================================');
    console.log('🤖 AUTO-COMPLETION SERVICE STARTED');
    console.log('Time:', moment().format('YYYY-MM-DD HH:mm:ss'));
    console.log('========================================');
    
    const now = getSystemTime();
    const today = moment(now).tz('Asia/Ho_Chi_Minh').startOf('day').toDate();
    
    // Get all settings
    const allSettings = await attendanceHelper.getAllSettings();
    const workSettings = allSettings['working-hours'] || { endTime: '17:00' };
    const endTime = workSettings.endTime || '17:00';
    
    // Find all incomplete attendance records (has check-in but no check-out)
    const incompleteAttendances = await Attendance.find({
      date: today,
      'checkIn.time': { $exists: true, $ne: null },
      $or: [
        { 'checkOut.time': { $exists: false } },
        { 'checkOut.time': null }
      ]
    }).populate('employee');
    
    console.log(`📋 Found ${incompleteAttendances.length} incomplete attendance records`);
    
    let regularCompleted = 0;
    let otCompleted = 0;
    let skipped = 0;
    
    for (const attendance of incompleteAttendances) {
      if (!attendance.employee) {
        console.log(`⚠️ Skipping attendance ${attendance._id}: No employee found`);
        skipped++;
        continue;
      }
      
      const employee = attendance.employee;
      
      // Check if employee has OT shift for today
      const hasOTShift = await checkHasOvertimeShift(employee._id, today);
      
      if (hasOTShift) {
        // OT EMPLOYEE: Get OT shift end time and auto-complete
        const otEndTime = await getOvertimeShiftEndTime(employee._id, today);
        
        if (otEndTime) {
          await autoCompleteWithOT(attendance, employee, otEndTime, allSettings);
          otCompleted++;
          console.log(`✅ [OT] Auto-completed: ${employee.name} at ${otEndTime}`);
        } else {
          console.log(`⚠️ [OT] Could not determine OT end time for ${employee.name}, skipping`);
          skipped++;
        }
      } else {
        // REGULAR EMPLOYEE: Auto-complete at 17:00 with 1 full work day
        await autoCompleteRegular(attendance, employee, endTime, allSettings);
        regularCompleted++;
        console.log(`✅ [REGULAR] Auto-completed: ${employee.name} at ${endTime}`);
      }
    }
    
    console.log('========================================');
    console.log('🤖 AUTO-COMPLETION SERVICE COMPLETED');
    console.log(`✅ Regular employees: ${regularCompleted}`);
    console.log(`✅ OT employees: ${otCompleted}`);
    console.log(`⚠️ Skipped: ${skipped}`);
    console.log('========================================');
    
    return {
      success: true,
      regularCompleted,
      otCompleted,
      skipped,
      total: incompleteAttendances.length
    };
    
  } catch (error) {
    console.error('❌ Auto-completion service error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Auto-complete for regular employee (no OT)
 */
async function autoCompleteRegular(attendance, employee, endTime, allSettings) {
  try {
    const checkInTime = attendance.checkIn.time;
    const checkInDate = moment(checkInTime).tz('Asia/Ho_Chi_Minh');
    
    // Parse end time (e.g., "17:00")
    const [endHour, endMin] = endTime.split(':').map(Number);
    const checkOutTime = checkInDate.clone()
      .hour(endHour)
      .minute(endMin)
      .second(0)
      .millisecond(0)
      .toDate();
    
    // Calculate working hours
    const workingHours = attendanceHelper.calculateWorkingHours(checkInTime, checkOutTime);
    
    // Update attendance record
    attendance.checkOut = {
      time: checkOutTime,
      status: 'on-time',
      auto: true
    };
    attendance.workingHours = workingHours;
    attendance.overtimeHours = 0;
    attendance.estimatedOTSalary = 0;
    attendance.autoCompleted = true;
    attendance.autoCompletionType = 'regular';
    
    // Ensure work day is counted (status should be 'present' if not already marked absent)
    if (attendance.status !== 'absent') {
      attendance.status = 'present';
    }
    
    await attendance.save();
    
    return attendance;
  } catch (error) {
    console.error(`❌ Error auto-completing regular employee ${employee.name}:`, error);
    throw error;
  }
}

/**
 * Auto-complete for OT employee
 */
async function autoCompleteWithOT(attendance, employee, otEndTime, allSettings) {
  try {
    const checkInTime = attendance.checkIn.time;
    const checkInDate = moment(checkInTime).tz('Asia/Ho_Chi_Minh');
    
    // Parse OT end time (e.g., "22:00")
    const [endHour, endMin] = otEndTime.split(':').map(Number);
    let checkOutTime = checkInDate.clone()
      .hour(endHour)
      .minute(endMin)
      .second(0)
      .millisecond(0);
    
    // If OT end time is before check-in time, it's next day
    if (checkOutTime.isBefore(checkInDate)) {
      checkOutTime.add(1, 'day');
    }
    
    const checkOutDate = checkOutTime.toDate();
    
    // Calculate working hours
    const workingHours = attendanceHelper.calculateWorkingHours(checkInTime, checkOutDate);
    
    // Calculate OT hours
    const otTimes = attendanceHelper.getOTTimes(allSettings);
    const workSettings = allSettings['working-hours'] || {};
    const workEndTime = workSettings.endTime || '17:00';
    const [workEndHour, workEndMin] = workEndTime.split(':').map(Number);
    
    const workDayEnd = checkInDate.clone()
      .hour(workEndHour)
      .minute(workEndMin)
      .second(0);
    
    // OT is time worked after work end time
    // Lưu ý: 17:00-18:00 là thời gian nghỉ, OT chỉ tính từ sau 18:00
    let overtimeHours = 0;
    const otStartTime = checkInDate.clone().hour(18).minute(0).second(0);
    if (checkOutTime.isAfter(otStartTime)) {
      // Tính OT từ sau 18:00 với số lẻ chính xác
      overtimeHours = checkOutTime.diff(otStartTime, 'hours', true);
    }
    
    // Giờ OT hiển thị: giữ số lẻ chính xác (2 chữ số thập phân)
    const roundedOvertimeHours = Math.round(overtimeHours * 100) / 100;
    
    // Calculate OT salary (hàm calculateOTSalary sẽ tự động làm tròn theo quy tắc: >= 30 phút → +0.5h, < 30 phút → làm tròn xuống)
    let estimatedOTSalary = 0;
    if (roundedOvertimeHours > 0) {
      const holiday = await attendanceHelper.isHoliday(attendance.date);
      const isHoliday = !!holiday;
      
      // Get OT settings
      const otSettings = allSettings['overtime'] || {};
      const otRateSettings = allSettings['ot-rate'] || {};
      
      const mergedOTSettings = {
        ratePerHour: otRateSettings.ratePerHour || otSettings.otRate || 100000,
        ...otSettings
      };
      
      estimatedOTSalary = await attendanceHelper.calculateOTSalary(
        roundedOvertimeHours,
        mergedOTSettings,
        attendance.date,
        isHoliday
      );
    }
    
    // Update attendance record
    attendance.checkOut = {
      time: checkOutDate,
      status: roundedOvertimeHours > 0 ? 'overtime' : 'on-time',
      auto: true
    };
    attendance.workingHours = workingHours;
    attendance.overtimeHours = roundedOvertimeHours;
    attendance.estimatedOTSalary = estimatedOTSalary;
    attendance.is_ot_approved = true;
    attendance.autoCompleted = true;
    attendance.autoCompletionType = 'overtime';
    
    // Ensure work day is counted
    if (attendance.status !== 'absent') {
      attendance.status = 'present';
    }
    
    await attendance.save();
    
    return attendance;
  } catch (error) {
    console.error(`❌ Error auto-completing OT employee ${employee.name}:`, error);
    throw error;
  }
}

/**
 * Check if employee has overtime shift for date
 * Kiểm tra theo thứ tự:
 * 1. OvertimeRequest với status 'approved'
 * 2. EmployeeShift với isOvertimeShift: true
 * 3. EmployeeShift với shift name chứa "OT" (case-insensitive)
 * 4. EmployeeShift với shift startTime >= 18:00 (giờ OT thường bắt đầu)
 */
async function checkHasOvertimeShift(employeeId, date) {
  try {
    const startOfDay = moment(date).startOf('day').toDate();
    const endOfDay = moment(date).endOf('day').toDate();
    
    // 1. Check approved OT request
    const approvedOTRequest = await OvertimeRequest.findOne({
      employee: employeeId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: 'approved'
    });
    
    if (approvedOTRequest) {
      return true;
    }
    
    // 2. Check OT shift assignment - với populate để kiểm tra shift name và time
    const employeeShift = await EmployeeShift.findOne({
      employee: employeeId,
      startDate: { $lte: endOfDay },
      $or: [
        { endDate: null },
        { endDate: { $gte: startOfDay } }
      ],
      isActive: true
    }).populate('shift');
    
    if (employeeShift && employeeShift.shift) {
      const shift = employeeShift.shift;
      
      // Check isOvertimeShift flag
      if (employeeShift.isOvertimeShift === true) {
        return true;
      }
      
      // Check shift name contains "OT" (case-insensitive)
      const shiftName = (shift.name || '').toUpperCase();
      if (shiftName.includes('OT') || shiftName.includes('OVERTIME')) {
        return true;
      }
      
      // Check shift startTime >= 18:00 (OT thường bắt đầu từ 18:00)
      if (shift.startTime) {
        const [startHour] = shift.startTime.split(':').map(Number);
        if (startHour >= 18) {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking OT shift:', error);
    return false;
  }
}

/**
 * Get overtime shift end time
 */
async function getOvertimeShiftEndTime(employeeId, date) {
  try {
    const startOfDay = moment(date).startOf('day').toDate();
    const endOfDay = moment(date).endOf('day').toDate();
    
    // Check approved OT request first
    const approvedOTRequest = await OvertimeRequest.findOne({
      employee: employeeId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: 'approved'
    });
    
    if (approvedOTRequest && approvedOTRequest.endTime) {
      return approvedOTRequest.endTime;
    }
    
    // Check OT shift assignment
    const overtimeShift = await EmployeeShift.findOne({
      employee: employeeId,
      startDate: { $lte: endOfDay },
      $or: [
        { endDate: null },
        { endDate: { $gte: startOfDay } }
      ],
      isActive: true,
      isOvertimeShift: true
    }).populate('shift');
    
    if (overtimeShift && overtimeShift.shift && overtimeShift.shift.endTime) {
      return overtimeShift.shift.endTime;
    }
    
    // Fallback: use default OT end time from settings (e.g., 22:00)
    const allSettings = await attendanceHelper.getAllSettings();
    const otTimes = attendanceHelper.getOTTimes(allSettings);
    return otTimes.otEnd || '22:00';
    
  } catch (error) {
    console.error('Error getting OT shift end time:', error);
    return null;
  }
}

/**
 * Run at specific time (for testing)
 */
async function runAtTime(timeString) {
  console.log(`🕐 Scheduled auto-completion to run at ${timeString}`);
  // This can be enhanced with node-cron for actual scheduling
  return runAutoCompletion();
}

module.exports = {
  runAutoCompletion,
  runAtTime,
  autoCompleteRegular,
  autoCompleteWithOT,
  checkHasOvertimeShift,
  getOvertimeShiftEndTime
};


