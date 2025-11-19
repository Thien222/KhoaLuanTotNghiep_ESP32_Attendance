const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Payroll = require('../models/Payroll');
const moment = require('moment-timezone');

moment.tz.setDefault('Asia/Ho_Chi_Minh');

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const today = moment().startOf('day').toDate();
    const endOfToday = moment().endOf('day').toDate();
    const startOfMonth = moment().startOf('month').toDate();
    const endOfMonth = moment().endOf('month').toDate();
    const currentMonth = moment().format('YYYY-MM');
    
    // Get total employees
    const totalEmployees = await Employee.countDocuments({ status: 'active' });
    
    // Get today's attendance count
    const todayAttendance = await Attendance.countDocuments({
      date: { $gte: today, $lte: endOfToday },
      'checkIn.time': { $exists: true }
    });
    
    // Calculate attendance percentage
    const attendancePercentage = totalEmployees > 0 
      ? Math.round((todayAttendance / totalEmployees) * 100)
      : 0;
    
    // Get total salary for current month
    // Parse currentMonth (format: YYYY-MM) to month and year numbers
    const [year, monthNum] = currentMonth.split('-').map(Number);
    const payrolls = await Payroll.find({ 
      $or: [
        { year: year, monthNum: monthNum }, // New format
        { month: currentMonth } // Backward compatibility
      ]
    });
    const totalSalary = payrolls.reduce((sum, p) => sum + (p.totalSalary || 0), 0);
    
    // Get pending leave requests
    const pendingLeaveRequests = await Leave.countDocuments({ status: 'pending' });
    
    // Get recent activities (last 10 attendance records)
    const recentActivities = await Attendance.find({
      $or: [
        { 'checkIn.time': { $exists: true } },
        { 'checkOut.time': { $exists: true } }
      ]
    })
    .populate({
      path: 'employee',
      select: 'name',
      model: 'Employee'
    })
    .sort({ updatedAt: -1 })
    .limit(10)
    .lean();
    
    // Format recent activities
    const formattedActivities = recentActivities.map(activity => {
      const checkInTime = activity.checkIn?.time 
        ? moment(activity.checkIn.time).format('HH:mm')
        : null;
      const checkOutTime = activity.checkOut?.time 
        ? moment(activity.checkOut.time).format('HH:mm')
        : null;
      
      let message = '';
      if (checkOutTime) {
        message = `${activity.employee?.name || 'Unknown'} đã chấm công ra lúc ${checkOutTime}`;
      } else if (checkInTime) {
        message = `${activity.employee?.name || 'Unknown'} đã chấm công vào lúc ${checkInTime}`;
      }
      
      return {
        message,
        time: activity.updatedAt
      };
    });
    
    // Get week statistics
    const startOfWeek = moment().startOf('week').toDate();
    const endOfWeek = moment().endOf('week').toDate();
    
    const weekAttendance = await Attendance.find({
      date: { $gte: startOfWeek, $lte: endOfWeek }
    });
    
    // Calculate working days this week (Monday to Friday)
    const currentDay = moment().day();
    const workingDaysThisWeek = currentDay === 0 || currentDay === 6 
      ? 5 // If weekend, count full week
      : currentDay; // Count up to today
    
    // Count on-time attendance this week
    const onTimeCount = weekAttendance.filter(a => 
      a.checkIn && a.checkIn.status === 'on-time'
    ).length;
    
    const onTimePercentage = weekAttendance.length > 0
      ? Math.round((onTimeCount / weekAttendance.length) * 100)
      : 0;
    
    // Pending leave requests this week
    const weekLeaveRequests = await Leave.countDocuments({
      status: 'pending',
      createdAt: { $gte: startOfWeek, $lte: endOfWeek }
    });
    
    res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        todayAttendance: {
          count: todayAttendance,
          percentage: attendancePercentage
        },
        totalSalary: Math.round(totalSalary),
        pendingLeaveRequests,
        recentActivities: formattedActivities,
        weekStats: {
          workingDays: workingDaysThisWeek,
          totalWorkingDays: 5,
          onTimePercentage,
          leaveRequests: weekLeaveRequests
        }
      }
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting dashboard statistics',
      error: error.message
    });
  }
};

// Get monthly statistics
exports.getMonthlyStats = async (req, res) => {
  try {
    const { month } = req.query; // Format: YYYY-MM
    const targetMonth = month || moment().format('YYYY-MM');
    
    const [year, monthNum] = targetMonth.split('-');
    const startOfMonth = moment(`${year}-${monthNum}-01`).startOf('month').toDate();
    const endOfMonth = moment(`${year}-${monthNum}-01`).endOf('month').toDate();
    
    // Get attendance for the month
    const attendanceRecords = await Attendance.find({
      date: { $gte: startOfMonth, $lte: endOfMonth }
    }).populate({
      path: 'employee',
      select: 'name',
      model: 'Employee'
    });
    
    // Calculate statistics
    const totalDays = attendanceRecords.length;
    const lateDays = attendanceRecords.filter(a => 
      a.checkIn && a.checkIn.status === 'late'
    ).length;
    const absentEmployees = new Set();
    
    // Get all active employees
    const allEmployees = await Employee.find({ status: 'active' });
    const workingDays = moment(endOfMonth).date(); // Total days in month
    
    // Find absent employees
    const attendanceByEmployee = {};
    attendanceRecords.forEach(record => {
      const empId = record.employee._id.toString();
      if (!attendanceByEmployee[empId]) {
        attendanceByEmployee[empId] = 0;
      }
      attendanceByEmployee[empId]++;
    });
    
    allEmployees.forEach(emp => {
      const empId = emp._id.toString();
      const daysPresent = attendanceByEmployee[empId] || 0;
      if (daysPresent < workingDays) {
        absentEmployees.add(empId);
      }
    });
    
    res.status(200).json({
      success: true,
      data: {
        month: targetMonth,
        totalAttendance: totalDays,
        lateDays,
        latePercentage: totalDays > 0 ? Math.round((lateDays / totalDays) * 100) : 0,
        absentEmployeeCount: absentEmployees.size,
        averageWorkingDays: allEmployees.length > 0 
          ? Math.round(totalDays / allEmployees.length * 10) / 10
          : 0
      }
    });
  } catch (error) {
    console.error('Error getting monthly stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting monthly statistics',
      error: error.message
    });
  }
};


