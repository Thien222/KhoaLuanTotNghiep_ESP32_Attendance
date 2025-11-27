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
    
    // --- NEW STATISTICS FOR DASHBOARD ---
    
    // 1. Department Distribution
    const departmentStats = await Employee.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$department', count: { $sum: 1 } } }
    ]);
    
    // 2. Attendance Trend (Last 7 days)
    const sevenDaysAgo = moment().subtract(6, 'days').startOf('day').toDate();
    const attendanceTrend = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: sevenDaysAgo, $lte: endOfToday },
          'checkIn.time': { $exists: true }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date", timezone: "+07:00" } },
          present: { $sum: 1 },
          late: { $sum: { $cond: [{ $eq: ["$checkIn.status", "late"] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 3. Today's On-time vs Late Breakdown
    const todayStatsRaw = await Attendance.aggregate([
       { $match: { date: { $gte: today, $lte: endOfToday } } },
       { $group: {
           _id: null,
           ontime: { $sum: { $cond: [{ $eq: ["$checkIn.status", "on-time"] }, 1, 0] } },
           late: { $sum: { $cond: [{ $eq: ["$checkIn.status", "late"] }, 1, 0] } }
       }}
    ]);
    const onTimeStats = todayStatsRaw.length > 0 ? todayStatsRaw[0] : { ontime: 0, late: 0 };

    // 4. Turnover Rate (Employees inactive this month)
    const leftEmployees = await Employee.countDocuments({
       status: 'inactive',
       updatedAt: { $gte: startOfMonth, $lte: endOfMonth }
    });
    const turnoverRate = totalEmployees > 0 ? ((leftEmployees / totalEmployees) * 100).toFixed(1) : 0;

    // --- END NEW STATISTICS ---

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
    
    // Get detailed leave statistics for current user (if employee)
    let leaveStats = null;
    if (req.user && req.user.role === 'employee' && req.user.employee) {
      const employeeId = req.user.employee._id || req.user.employee;
      const currentYear = moment().year();
      const startOfYear = moment(`${currentYear}-01-01`).startOf('day').toDate();
      const endOfYear = moment(`${currentYear}-12-31`).endOf('day').toDate();
      
      // Get all approved and pending leaves for this year
      const leaves = await Leave.find({
        employee: employeeId,
        startDate: { $lte: endOfYear },
        endDate: { $gte: startOfYear },
        status: { $in: ['approved', 'pending'] }
      });
      
      // Get employee to get quotas
      const employee = await Employee.findById(employeeId);
      
      // Calculate statistics by leave type
      const annualUsed = leaves
        .filter(l => (l.leaveType === 'annual' || l.type === 'annual') && l.status === 'approved')
        .reduce((sum, l) => sum + (l.totalDays || 0), 0);
      
      const sickUsed = leaves
        .filter(l => (l.leaveType === 'sick' || l.type === 'sick') && l.status === 'approved')
        .reduce((sum, l) => sum + (l.totalDays || 0), 0);
      
      // Convert sick days to hours (assuming 8 hours per day)
      const sickUsedHours = sickUsed * 8;
      
      // WFH (Work From Home) - we'll use 'other' type with a special flag or check reason
      // For now, let's check if there's a 'wfh' leave type or use 'other' with specific reason
      const wfhUsed = leaves
        .filter(l => {
          const type = l.leaveType || l.type;
          return (type === 'other' && l.reason && l.reason.toLowerCase().includes('wfh')) || 
                 (type === 'other' && l.reason && l.reason.toLowerCase().includes('làm việc tại nhà')) ||
                 (type === 'other' && l.reason && l.reason.toLowerCase().includes('work from home'));
        })
        .filter(l => l.status === 'approved')
        .reduce((sum, l) => sum + (l.totalDays || 0), 0);
      
      const maternityUsed = leaves
        .filter(l => (l.leaveType === 'maternity' || l.type === 'maternity') && l.status === 'approved')
        .reduce((sum, l) => sum + (l.totalDays || 0), 0);
      
      const unpaidUsed = leaves
        .filter(l => (l.leaveType === 'unpaid' || l.type === 'unpaid') && l.status === 'approved')
        .reduce((sum, l) => sum + (l.totalDays || 0), 0);
      
      // Get quotas from employee model (with defaults)
      const annualQuota = employee?.leaveQuotas?.annual?.total || employee?.annualLeaveDays || 12;
      const sickQuotaHours = employee?.leaveQuotas?.sick?.totalHours || 72;
      const wfhQuota = employee?.leaveQuotas?.wfh?.totalDays || 0; // 0 means unlimited
      const maternityQuota = employee?.leaveQuotas?.maternity?.totalDays || 180;
      
      leaveStats = {
        annual: {
          total: annualQuota,
          used: annualUsed,
          remaining: Math.max(0, annualQuota - annualUsed),
          percentage: annualQuota > 0 ? Math.round((annualUsed / annualQuota) * 100) : 0
        },
        sick: {
          totalHours: sickQuotaHours,
          usedHours: sickUsedHours,
          usedDays: sickUsed,
          remainingHours: Math.max(0, sickQuotaHours - sickUsedHours),
          percentage: sickQuotaHours > 0 ? Math.round((sickUsedHours / sickQuotaHours) * 100) : 0
        },
        wfh: {
          totalDays: wfhQuota,
          usedDays: wfhUsed,
          remainingDays: wfhQuota > 0 ? Math.max(0, wfhQuota - wfhUsed) : -1, // -1 means unlimited
          percentage: wfhQuota > 0 ? Math.round((wfhUsed / wfhQuota) * 100) : 0
        },
        maternity: {
          totalDays: maternityQuota,
          usedDays: maternityUsed,
          remainingDays: Math.max(0, maternityQuota - maternityUsed),
          percentage: maternityQuota > 0 ? Math.round((maternityUsed / maternityQuota) * 100) : 0
        },
        unpaid: {
          usedDays: unpaidUsed,
          totalDays: 0, // Usually unlimited
          remainingDays: -1 // -1 means unlimited
        }
      };
    }
    
    res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        todayAttendance: {
          count: todayAttendance,
          percentage: attendancePercentage,
          details: onTimeStats // Add breakdown
        },
        departmentStats, // Add department stats
        attendanceTrend, // Add trend stats
        turnoverRate, // Add turnover rate
        totalSalary: Math.round(totalSalary),
        pendingLeaveRequests,
        recentActivities: formattedActivities,
        weekStats: {
          workingDays: workingDaysThisWeek,
          totalWorkingDays: 5,
          onTimePercentage,
          leaveRequests: weekLeaveRequests
        },
        leaveStats // Add detailed leave statistics
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


