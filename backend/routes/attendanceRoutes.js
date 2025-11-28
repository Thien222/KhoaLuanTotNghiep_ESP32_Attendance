// const Attendance = require('../models/Attendance');
// const Employee = require('../models/Employee');
// const Holiday = require('../models/Holiday');
// const EmployeeShift = require('../models/EmployeeShift');
// const attendanceHelper = require('../utils/attendanceHelper');
// const { getSystemTime } = require('../utils/timeMachine');
// const moment = require('moment-timezone');

// moment.tz.setDefault('Asia/Ho_Chi_Minh');

// // Helper function to get employee's shift for a specific date
// const getEmployeeShiftForDate = async (employeeId, date) => {
//   const queryDate = moment(date).toDate();
//   const employeeShift = await EmployeeShift.findOne({
//     employee: employeeId,
//     startDate: { $lte: queryDate },
//     $or: [
//       { endDate: null },
//       { endDate: { $gte: queryDate } }
//     ],
//     isActive: true
//   }).populate('shift');

//   return employeeShift?.shift || null;
// };

// // Helper function to determine status based on shift and time
// const determineStatusFromShift = (customTime, shift, actionType) => {
//   if (!shift) return null; // No shift assigned, use default logic

//   const timeStr = moment(customTime).format('HH:mm');
//   const [shiftStartHour, shiftStartMin] = shift.startTime.split(':').map(Number);
//   const [shiftEndHour, shiftEndMin] = shift.endTime.split(':').map(Number);
  
//   const shiftStartMinutes = shiftStartHour * 60 + shiftStartMin;
//   const shiftEndMinutes = shiftEndHour * 60 + shiftEndMin;
//   const [timeHour, timeMin] = timeStr.split(':').map(Number);
//   const timeMinutes = timeHour * 60 + timeMin;
  
//   const gracePeriod = shift.gracePeriod || 15;

//   if (actionType === 'checkin') {
//     if (timeMinutes <= shiftStartMinutes + gracePeriod) {
//       return 'on-time';
//     } else {
//       return 'late';
//     }
//   } else if (actionType === 'checkout') {
//     if (timeMinutes < shiftEndMinutes) {
//       return 'early';
//     } else if (timeMinutes > shiftEndMinutes) {
//       return 'overtime';
//     } else {
//       return 'on-time';
//     }
//   }
//   return null;
// };

// // Add manual attendance record
// exports.addAttendance = async (req, res) => {
//   try {
//     const { employeeId, fingerprintId, type, fingerId, action } = req.body;
    
//     console.log('=== ATTENDANCE REQUEST ===');
//     console.log('Time:', getSystemTime().toISOString());
//     console.log('Request body:', req.body);
//     console.log('EmployeeId:', employeeId);
//     console.log('FingerId:', fingerId);
//     console.log('Action:', action);
//     console.log('Type:', type);
//     console.log('IP:', req.ip || req.connection.remoteAddress);

//     // 1. Tìm Employee
//     let employee;
//     if (employeeId) {
//       employee = await Employee.findById(employeeId);
//     } else if (fingerId) {
//       console.log('Looking for employee with fingerprintId:', fingerId);
//       employee = await Employee.findOne({ fingerprintId: fingerId });
      
//       if (!employee) {
//         console.log('Employee not found with fingerprintId:', fingerId);
//         return res.status(404).json({
//           success: false,
//           message: 'Employee not found with this fingerprint ID',
//           fingerId: fingerId
//         });
//       }
      
//       // SECURITY CHECK: Verify fingerprint enrollment
//       if (!employee.fingerprintEnrolled) {
//         console.log('SECURITY ALERT: Employee not enrolled but trying to check-in:', employee.name);
//         return res.status(403).json({
//           success: false,
//           message: 'Employee fingerprint not enrolled - please enroll first',
//           fingerId: fingerId,
//           employeeId: employee.employeeId,
//           securityAlert: true,
//           what: 'enroll-required',
//           action: 'enroll-first'
//         });
//       }
      
//       console.log('Found employee:', employee.name, 'ID:', employee.employeeId, 'Enrolled:', employee.fingerprintEnrolled);
//     } else {
//       return res.status(400).json({
//         success: false,
//         message: 'Either employeeId or fingerId is required'
//       });
//     }

//     if (!employee) {
//       return res.status(404).json({
//         success: false,
//         message: 'Employee not found'
//       });
//     }

//     // 2. Chống Spam (5 phút)
//     const lastRecord = await Attendance.findOne({ employee: employee._id }).sort({ updatedAt: -1 });
//     if (lastRecord) {
//       const now = getSystemTime();
//       const diffMinutes = moment(now).diff(moment(lastRecord.updatedAt), 'minutes');
//       // Chỉ chặn nếu < 5 phút và cùng một ngày làm việc (tránh chặn nếu checkout hôm qua rồi checkin hôm nay)
//       const isSameDay = moment(lastRecord.date).isSame(moment(now), 'day');
      
//       if (diffMinutes < 5 && isSameDay) {
//         console.log(`Spam prevention: blocked ${employee.name}`);
//         // Trả về 200 để ESP32 không báo lỗi, nhưng kèm what='ignored'
//         return res.status(200).json({ 
//           success: true, 
//           message: 'Thao tác quá nhanh', 
//           what: 'ignored' 
//         });
//       }
//     }

//     // 3. Thời gian (Time Machine ready)
//     const now = getSystemTime();
//     const today = moment(now).startOf('day').toDate();
//     const currentHour = now.getHours();
    
//     // Lấy Settings
//     const allSettings = await attendanceHelper.getAllSettings();
//     const latePolicy = allSettings['late-policy'] || {};
//     const otSettings = allSettings['overtime'] || {};
//     const workSettings = allSettings['working-hours'] || { endTime: '17:00' };
    
//     // Lương
//     const baseSalary = employee.baseSalary || employee.salary || 0;
//     const dailyRate = baseSalary > 0 ? (baseSalary / 26) : 0;
//     const hourlyRate = dailyRate / 8;

//     // Tìm bản ghi hôm nay
//     let attendance = await Attendance.findOne({ employee: employee._id, date: today });
    
//     // Logic Auto xác định Action
//     let actionType = type || action;
//     if (actionType === 'auto') {
//       if (!attendance) {
//         actionType = 'checkin';
//         console.log('Auto mode: Check-in needed - no attendance record for today');
//       } else if (!attendance.checkIn || !attendance.checkIn.time) {
//         actionType = 'checkin';
//         console.log('Auto mode: Check-in needed - has record but no check-in time');
//       } else if (!attendance.checkOut || !attendance.checkOut.time) {
//         actionType = 'checkout';
//         console.log('Auto mode: Check-out needed - has check-in but no check-out');
//       } else {
//         console.log('Auto mode: Already completed today - has both check-in and check-out');
//         return res.json({ 
//           success: true, 
//           message: 'Done for today', 
//           what: 'done' 
//         });
//       }
//     }

//     // === XỬ LÝ CHECK-IN ===
//     if (actionType === 'checkin') {
//       // Logic xác định status Check-in
//       const workStartTime = allSettings['working-hours']?.startTime || '08:00';
//       const lateMinutes = attendanceHelper.calculateLateMinutes(now, workStartTime, latePolicy.graceMinutes || 15);
//       let checkInStatus = lateMinutes > 0 ? 'late' : 'on-time';

//       // Logic phạt "Nội quy thép"
//       let actualPenalty = 0;
//       let status = 'present';

//       // 1. Phạt tiền đi muộn
//       if (lateMinutes > 0) {
//         actualPenalty += attendanceHelper.calculateLatePenalty(lateMinutes, latePolicy);
//       }

//       // 2. Phạt nửa công nếu muộn quá ngưỡng
//       const halfDayThreshold = latePolicy.halfDayThreshold || 60;
//       if (lateMinutes > halfDayThreshold) {
//         status = 'half-day';
//         checkInStatus = 'late'; // Vẫn là late nhưng nặng hơn
//         // Cộng phạt nửa ngày lương (để hiển thị)
//         actualPenalty += (dailyRate * 0.5); 
//       }

//       // Check if today is a holiday
//       const holiday = await attendanceHelper.isHoliday(today);
//       const isHoliday = !!holiday;
//       const holidayRate = holiday ? holiday.workRate : 1.0;

//       if (!attendance) {
//         attendance = new Attendance({
//           employee: employee._id,
//           fingerprintId: fingerprintId || employee.fingerprintId,
//           date: today,
//           checkIn: { time: now, status: checkInStatus },
//           status: status,
//           lateMinutes,
//           actualPenalty,   
//           estimatedOTSalary: 0,
//           isHoliday,
//           holidayRate
//         });
//       } else {
//         // Nếu đã có record (ví dụ do lỗi), update lại
//         attendance.checkIn = { time: now, status: checkInStatus };
//         attendance.status = status;
//         attendance.actualPenalty = actualPenalty;
//         attendance.lateMinutes = lateMinutes;
//         attendance.isHoliday = isHoliday;
//         attendance.holidayRate = holidayRate;
//       }
      
//       await attendance.save();

//       console.log('Check-in successful - returning what: in');
//       return res.status(200).json({ 
//         success: true, 
//         message: 'Check-in thành công', 
//         data: attendance,
//         what: 'in' 
//       });
//     } 
    
//     // === XỬ LÝ CHECK-OUT ===
//     else if (actionType === 'checkout') {
//       // [QUAN TRỌNG] Kiểm tra bắt buộc Check-in
//       if (!attendance || !attendance.checkIn || !attendance.checkIn.time) {
//         console.error("Lỗi: Cố gắng Checkout khi chưa Checkin");
//         return res.status(400).json({
//           success: false,
//           message: 'Bạn chưa Check-in nên không thể Check-out!',
//           what: 'error',
//           needInFirst: true
//         });
//       }

//       // 1. Tính trạng thái ra về (Sớm/Đúng/OT)
//       const endTimeParts = workSettings.endTime.split(':');
//       const standardEndHour = parseInt(endTimeParts[0]);
//       const standardEndMin = parseInt(endTimeParts[1]);
      
//       let checkOutStatus = 'on-time';
//       if (now.getHours() < standardEndHour) {
//         checkOutStatus = 'early';
//       } else if (now.getHours() > standardEndHour || (now.getHours() === standardEndHour && now.getMinutes() > standardEndMin + 30)) {
//         checkOutStatus = 'overtime';
//       }

//       // 2. Tính giờ làm việc & OT
//       const workingHours = attendanceHelper.calculateWorkingHours(attendance.checkIn.time, now);
//       const overtimeHours = attendanceHelper.calculateOvertimeHours(attendance.checkIn.time, now, 8); // Giả sử chuẩn 8h
      
//       // 3. Tính tiền OT
//       let estimatedOTSalary = 0;
//       let otRate = 1.0;
      
//       if (overtimeHours > 0) {
//         otRate = await attendanceHelper.getOvertimeRate(today, attendance.isHoliday || false, otSettings);
//         estimatedOTSalary = Math.round(overtimeHours * hourlyRate * otRate);
//       }

//       // Cập nhật
//       attendance.checkOut = { time: now, status: checkOutStatus };
//       attendance.workingHours = workingHours;
//       attendance.overtimeHours = Math.max(0, overtimeHours);
//       attendance.overtimeRate = otRate;
//       attendance.estimatedOTSalary = estimatedOTSalary;

//       await attendance.save();

//       console.log('Check-out successful - returning what: out');
//       return res.status(200).json({ 
//         success: true, 
//         message: 'Check-out thành công', 
//         data: attendance,
//         what: 'out' 
//       });
//     } else {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid attendance type. Use "checkin" or "checkout"'
//       });
//     }

//   } catch (error) {
//     console.error('Attendance Error:', error);
//     // Trả về 500 để ESP32 biết là lỗi
//     res.status(500).json({ 
//       success: false, 
//       message: error.message,
//       error: error.stack 
//     });
//   }
// };

// // Handle fingerprint attendance
// exports.handleAttendance = async (req, res) => {
//   try {
//     const { fingerprintId } = req.body;

//     // Find employee by fingerprint ID
//     const employee = await Employee.findOne({ fingerprintId });
//     if (!employee) {
//       return res.status(404).json({
//         success: false,
//         message: 'Employee not found with this fingerprint'
//       });
//     }

//     const now = getSystemTime();
//     const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

//     // Check if attendance record exists for today
//     let attendance = await Attendance.findOne({
//       employee: employee._id,
//       date: today
//     });

//     const WORK_START_HOUR = 9; // 9:00 AM
//     const WORK_END_HOUR = 17;  // 5:00 PM
//     const currentHour = now.getHours();

//     if (!attendance) {
//       // Create new attendance record (Check-in)
//       const checkInStatus = currentHour > WORK_START_HOUR ? 'late' : 'on-time';
      
//       attendance = new Attendance({
//         employee: employee._id,
//         fingerprintId,
//         date: today,
//         checkIn: {
//           time: now,
//           status: checkInStatus
//         },
//         status: 'present'
//       });

//       await attendance.save();

//       return res.status(200).json({
//         success: true,
//         message: 'Check-in recorded successfully',
//         data: attendance,
//         what: "in"
//       });
//     } else if (!attendance.checkOut.time) {
//       // Update existing attendance record (Check-out)
//       const checkOutStatus = 
//         currentHour < WORK_END_HOUR ? 'early' :
//         currentHour > WORK_END_HOUR ? 'overtime' : 'on-time';

//       // Calculate working hours
//       const checkInTime = attendance.checkIn.time;
//       const workingHours = (now - checkInTime) / (1000 * 60 * 60); // Convert to hours

//       attendance.checkOut = {
//         time: now,
//         status: checkOutStatus
//       };
//       attendance.workingHours = workingHours;

//       await attendance.save();

//       return res.status(200).json({
//         success: true,
//         message: 'Check-out recorded successfully',
//         data: attendance,
//         what: "out"
//       });
//     } else {
//       // Already checked out
//       return res.status(200).json({
//         success: true,
//         message: 'Already checked out for today',
//         data: attendance,
//         what: "done"
//       });
//     }

//   } catch (error) {
//     console.error('Error in handleAttendance:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error processing attendance',
//       error: error.message
//     });
//   }
// };

// // Get attendance records for an employee
// exports.getEmployeeAttendance = async (req, res) => {
//   try {
//     const { employeeId } = req.params;
//     const { startDate, endDate } = req.query;

//     const query = { employee: employeeId };
    
//     if (startDate && endDate) {
//       query.date = {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate)
//       };
//     }

//     const attendance = await Attendance.find(query)
//       .populate('employee', 'name employeeId')
//       .sort({ date: -1 });

//     res.status(200).json({
//       success: true,
//       data: attendance
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Error fetching attendance records',
//       error: error.message
//     });
//   }
// };

// // Get today's attendance for all employees
// exports.getTodayAttendance = async (req, res) => {
//   try {
//     // Use UTC date to match existing records
//     const now = getSystemTime();
//     const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

//     console.log('Fetching today\'s attendance for date:', today);
//     console.log('Current time:', now);

//     const attendance = await Attendance.find({
//       date: today
//     }).populate('employee', 'name employeeId department');

//     console.log('Found attendance records:', attendance.length);

//     res.status(200).json({
//       success: true,
//       data: attendance
//     });
//   } catch (error) {
//     console.error('Error fetching today\'s attendance:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error fetching today\'s attendance',
//       error: error.message
//     });
//   }
// };

// // Get all attendance records
// exports.getAllAttendance = async (req, res) => {
//   try {
//     const { startDate, endDate, limit = 100 } = req.query;
    
//     console.log('getAllAttendance - Query params:', { startDate, endDate, limit });
    
//     const query = {};
    
//     if (startDate && endDate) {
//       // Parse dates - Dates in DB are stored as UTC (e.g., "2025-11-10T00:00:00.000Z")
//       // Frontend sends "YYYY-MM-DD" format, convert to UTC date range
//       const start = moment.utc(startDate).startOf('day').toDate();
//       const end = moment.utc(endDate).endOf('day').toDate();
      
//       query.date = {
//         $gte: start,
//         $lte: end
//       };
      
//       console.log('getAllAttendance - Date range:', { 
//         startDate, 
//         endDate,
//         startUTC: start.toISOString(), 
//         endUTC: end.toISOString()
//       });
//     }

//     const attendance = await Attendance.find(query)
//       .populate({
//         path: 'employee',
//         select: 'name employeeId department',
//         model: 'Employee'
//       })
//       .sort({ date: -1, createdAt: -1 })
//       .limit(parseInt(limit));

//     console.log('getAllAttendance - Found records:', attendance.length);
//     if (attendance.length > 0) {
//       console.log('getAllAttendance - First record:', {
//         _id: attendance[0]._id,
//         date: attendance[0].date,
//         employee: attendance[0].employee?.name || 'NO EMPLOYEE',
//         checkIn: attendance[0].checkIn?.time
//       });
//     }

//     res.status(200).json({
//       success: true,
//       data: attendance,
//       count: attendance.length
//     });
//   } catch (error) {
//     console.error('getAllAttendance - Error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error fetching attendance records',
//       error: error.message
//     });
//   }
// };

// // Delete today's attendance records (for testing)
// exports.deleteTodayAttendance = async (req, res) => {
//   try {
//     const today = getSystemTime();
//     today.setHours(0, 0, 0, 0);

//     const result = await Attendance.deleteMany({
//       date: today
//     });

//     res.status(200).json({
//       success: true,
//       message: `Deleted ${result.deletedCount} attendance records for today`,
//       deletedCount: result.deletedCount
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Error deleting today\'s attendance',
//       error: error.message
//     });
//   }
// };

// // Delete all attendance records (for testing)
// exports.deleteAllAttendance = async (req, res) => {
//   try {
//     const result = await Attendance.deleteMany({});

//     res.status(200).json({
//       success: true,
//       message: `Deleted ${result.deletedCount} attendance records`,
//       deletedCount: result.deletedCount
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Error deleting all attendance records',
//       error: error.message
//     });
//   }
// };

// // Manual attendance endpoint - unified for preview and submit
// // Format: date = "YYYY-MM-DD", checkInTime = "HH:mm", checkOutTime = "HH:mm"
// exports.manualCheckIn = async (req, res) => {
//   try {
//     const { userId, date, checkInTime, checkOutTime, preview = false } = req.body;
    
//     console.log('=== MANUAL ATTENDANCE REQUEST ===');
//     console.log('Request body:', req.body);
//     console.log('Preview mode:', preview);
    
//     // Validation cơ bản
//     if (!userId) {
//       return res.status(400).json({
//         success: false,
//         message: 'userId is required'
//       });
//     }
    
//     if (!date || !checkInTime || !checkOutTime) {
//       return res.status(400).json({
//         success: false,
//         message: 'date, checkInTime, and checkOutTime are required'
//       });
//     }
    
//     // Find employee
//     const employee = await Employee.findById(userId);
//     if (!employee) {
//       return res.status(404).json({
//         success: false,
//         message: 'Employee not found'
//       });
//     }
    
//     // --- FIX LOGIC NGÀY GIỜ ---
//     // Sử dụng moment để parse chuỗi chuẩn xác hơn cách split thủ công
//     const checkInDateTime = moment(`${date} ${checkInTime}`, 'YYYY-MM-DD HH:mm').toDate();
//     let checkOutDateTime = moment(`${date} ${checkOutTime}`, 'YYYY-MM-DD HH:mm').toDate();
    
//     // LOGIC CA QUA ĐÊM (Overnight Shift):
//     // Nếu Giờ ra <= Giờ vào (ví dụ Vào 22:00, Ra 06:00), tự động hiểu là ra vào ngày hôm sau
//     if (checkOutDateTime <= checkInDateTime) {
//       console.log('Detected overnight shift (Check-out <= Check-in). Adding 1 day to Check-out.');
//       checkOutDateTime = moment(checkOutDateTime).add(1, 'days').toDate();
//     }
    
//     // Get settings
//     const allSettings = await attendanceHelper.getAllSettings();
//     const latePolicy = allSettings['late-policy'] || {};
//     const otSettings = allSettings['overtime'] || {};
//     const workSettings = allSettings['working-hours'] || { startTime: '08:00', endTime: '17:00' };
    
//     // Salary info
//     const baseSalary = employee.baseSalary || employee.salary || 0;
//     const dailyRate = baseSalary > 0 ? (baseSalary / 26) : 0;
//     const hourlyRate = dailyRate / 8;
    
//     // Calculate late minutes
//     const workStartTime = workSettings.startTime || '08:00';
//     const lateMinutes = attendanceHelper.calculateLateMinutes(checkInDateTime, workStartTime, latePolicy.graceMinutes || 15);
//     const checkInStatus = lateMinutes > 0 ? 'late' : 'on-time';
    
//     // Calculate penalty
//     let actualPenalty = 0;
//     let status = 'present';
    
//     if (lateMinutes > 0) {
//       actualPenalty += attendanceHelper.calculateLatePenalty(lateMinutes, latePolicy);
//     }
    
//     const halfDayThreshold = latePolicy.halfDayThreshold || 60;
//     if (lateMinutes > halfDayThreshold) {
//       status = 'half-day';
//       actualPenalty += (dailyRate * 0.5);
//     }
    
//     // Check holiday
//     const attendanceDate = moment(date, 'YYYY-MM-DD').startOf('day').toDate();
//     const holiday = await attendanceHelper.isHoliday(attendanceDate);
//     const isHoliday = !!holiday;
//     const holidayRate = holiday ? holiday.workRate : 1.0;
    
//     // Calculate check-out status
//     const endTimeParts = workSettings.endTime.split(':');
//     const standardEndHour = parseInt(endTimeParts[0]);
//     // Logic check early/overtime đơn giản hóa cho ca đêm:
//     // Nếu làm qua đêm thì thường không tính early theo giờ hành chính, nhưng ở đây tạm tính theo giờ thực tế
//     let checkOutStatus = 'on-time';
//     // Logic này có thể cần tùy chỉnh thêm nếu làm ca đêm
    
//     // === LOGIC TÍNH TOÁN MỚI: Tự động phân biệt giờ công chuẩn và OT ===
//     // Giờ làm việc chuẩn: từ startTime (08:00) đến endTime (17:00) = 8 giờ
//     // OT: từ endTime (17:00) đến checkOutTime, trừ 1 giờ nghỉ (17:00-18:00)
    
//     const [startHour, startMin] = workStartTime.split(':').map(Number);
//     const [endHour, endMin] = workSettings.endTime.split(':').map(Number);
    
//     const actualCheckIn = moment(checkInDateTime);
//     const actualCheckOut = moment(checkOutDateTime);
    
//     // Tạo thời gian chuẩn (ngày check-in)
//     const standardStartTime = actualCheckIn.clone().set({ hour: startHour, minute: startMin, second: 0, millisecond: 0 });
//     const standardEndTime = actualCheckIn.clone().set({ hour: endHour, minute: endMin, second: 0, millisecond: 0 });
//     const breakEndTime = standardEndTime.clone().add(1, 'hour'); // 18:00 (hết giờ nghỉ)
    
//     let standardWorkingHours = 0;
//     let overtimeHours = 0;
    
//     // Trường hợp 1: Check-in trong giờ làm việc chuẩn (08:00 - 17:00)
//     if (actualCheckIn.isSameOrAfter(standardStartTime) && actualCheckIn.isBefore(standardEndTime)) {
//       // Giờ làm việc chuẩn: từ checkIn đến endTime (hoặc checkOut nếu sớm hơn)
//       const effectiveEndTime = actualCheckOut.isBefore(standardEndTime) ? actualCheckOut : standardEndTime;
//       standardWorkingHours = Math.min(
//         effectiveEndTime.diff(actualCheckIn, 'hours', true),
//         8.0
//       );
      
//       // Tính OT nếu checkOut sau endTime
//       if (actualCheckOut.isAfter(standardEndTime)) {
//         // Nếu checkOut sau 18:00 (hết giờ nghỉ), tính OT từ 18:00
//         if (actualCheckOut.isAfter(breakEndTime)) {
//           overtimeHours = actualCheckOut.diff(breakEndTime, 'hours', true);
//         }
//         // Nếu checkOut từ 17:00-18:00 thì không có OT (đang nghỉ)
//       }
//     }
//     // Trường hợp 2: Check-in trước giờ làm việc (trước 08:00)
//     else if (actualCheckIn.isBefore(standardStartTime)) {
//       // Tính từ 08:00 đến endTime hoặc checkOut
//       const effectiveStartTime = standardStartTime;
//       const effectiveEndTime = actualCheckOut.isBefore(standardEndTime) ? actualCheckOut : standardEndTime;
//       standardWorkingHours = Math.min(
//         effectiveEndTime.diff(effectiveStartTime, 'hours', true),
//         8.0
//       );
      
//       // Tính OT nếu checkOut sau endTime
//       if (actualCheckOut.isAfter(standardEndTime)) {
//         if (actualCheckOut.isAfter(breakEndTime)) {
//           overtimeHours = actualCheckOut.diff(breakEndTime, 'hours', true);
//         }
//       }
//     }
//     // Trường hợp 3: Check-in sau endTime (ca đêm hoặc ca muộn)
//     else {
//       // Không có giờ chuẩn, chỉ tính OT (trừ 1h nghỉ nếu checkOut sau 18:00)
//       if (actualCheckOut.isAfter(breakEndTime)) {
//         // Tính từ 18:00 đến checkOut
//         overtimeHours = actualCheckOut.diff(breakEndTime, 'hours', true);
//       } else if (actualCheckOut.isAfter(standardEndTime)) {
//         // CheckOut từ 17:00-18:00, không tính OT (đang nghỉ)
//         overtimeHours = 0;
//       } else {
//         // CheckOut trước 17:00, không có giờ chuẩn và không có OT
//         overtimeHours = 0;
//       }
//     }
    
//     // Tổng giờ làm việc = giờ chuẩn + OT
//     const workingHours = Math.max(0, standardWorkingHours) + Math.max(0, overtimeHours);
    
//     // Làm tròn để tránh lỗi số thập phân
//     const roundedStandardHours = Math.round(standardWorkingHours * 100) / 100;
//     const roundedOvertimeHours = Math.round(overtimeHours * 100) / 100;
//     const roundedWorkingHours = Math.round(workingHours * 100) / 100;
    
//     console.log('📊 [MANUAL ATTENDANCE CALCULATION]', {
//       employee: employee.name,
//       checkIn: moment(checkInDateTime).format('YYYY-MM-DD HH:mm'),
//       checkOut: moment(checkOutDateTime).format('YYYY-MM-DD HH:mm'),
//       standardWorkingHours: roundedStandardHours,
//       overtimeHours: roundedOvertimeHours,
//       totalWorkingHours: roundedWorkingHours
//     });
    
//     let estimatedOTSalary = 0;
//     let otRate = 1.0;
//     if (roundedOvertimeHours > 0) {
//       otRate = await attendanceHelper.getOvertimeRate(attendanceDate, isHoliday, otSettings);
//       estimatedOTSalary = Math.round(roundedOvertimeHours * hourlyRate * otRate);
//     }
    
//     // Calculate daily work credit
//     let dailyWorkCredit = 1.0;
//     if (status === 'half-day') {
//       dailyWorkCredit = 0.5;
//     } else if (status === 'absent') {
//       dailyWorkCredit = 0;
//     }
    
//     // If preview mode, return calculation only
//     if (preview) {
//       return res.status(200).json({
//         success: true,
//         data: {
//           employee: {
//             name: employee.name,
//             employeeId: employee.employeeId
//           },
//           checkIn: {
//             time: checkInDateTime,
//             status: checkInStatus
//           },
//           checkOut: {
//             time: checkOutDateTime,
//             status: checkOutStatus
//           },
//           workingHours: roundedWorkingHours,
//           overtimeHours: Math.max(0, roundedOvertimeHours),
//           standardWorkingHours: roundedStandardHours,
//           overtimeRate: otRate,
//           lateMinutes,
//           actualPenalty: Math.round(actualPenalty),
//           estimatedOTSalary: Math.round(estimatedOTSalary),
//           status,
//           dailyWorkCredit,
//           isHoliday,
//           holidayRate
//         }
//       });
//     }
    
//     // Save to database
//     // Logic tìm record cũ: Tìm theo Employee và Date gốc (ngày bắt đầu ca)
//     const today = moment(attendanceDate).startOf('day').toDate();
//     let attendance = await Attendance.findOne({ employee: employee._id, date: today });
    
//     const attendanceData = {
//       employee: employee._id,
//       fingerprintId: employee.fingerprintId || 0,
//       date: today,
//       checkIn: { time: checkInDateTime, status: checkInStatus },
//       checkOut: { time: checkOutDateTime, status: checkOutStatus },
//       status: status,
//       lateMinutes,
//       actualPenalty,
//       workingHours: roundedWorkingHours,
//       overtimeHours: Math.max(0, roundedOvertimeHours),
//       overtimeRate: otRate,
//       estimatedOTSalary,
//       isHoliday,
//       holidayRate,
//       isManual: true
//     };
    
//     if (!attendance) {
//       attendance = new Attendance(attendanceData);
//     } else {
//       Object.assign(attendance, attendanceData);
//     }
    
//     await attendance.save();
    
//     console.log(`✅ [MANUAL ATTENDANCE] ${employee.name} - Check-in: ${moment(checkInDateTime).format('HH:mm')}, Check-out: ${moment(checkOutDateTime).format('HH:mm')}`);
    
//     return res.status(200).json({
//       success: true,
//       message: 'Chấm công thủ công thành công',
//       data: attendance,
//       what: 'manual-both'
//     });
//   } catch (error) {
//     console.error('Manual Attendance Error:', error);
//     res.status(500).json({
//       success: false,
//       message: error.message || 'Error processing manual attendance'
//     });
//   }
// };

// // Preview attendance (legacy - kept for backward compatibility)
// exports.previewAttendance = exports.manualCheckIn;


const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Holiday = require('../models/Holiday');
const EmployeeShift = require('../models/EmployeeShift');
const attendanceHelper = require('../utils/attendanceHelper');
const { getSystemTime } = require('../utils/timeMachine');
const moment = require('moment-timezone');

moment.tz.setDefault('Asia/Ho_Chi_Minh');

// (2 hàm này đang chưa dùng nhưng mình giữ lại cho sau này)
const getEmployeeShiftForDate = async (employeeId, date) => {
  const queryDate = moment(date).toDate();
  const employeeShift = await EmployeeShift.findOne({
    employee: employeeId,
    startDate: { $lte: queryDate },
    $or: [
      { endDate: null },
      { endDate: { $gte: queryDate } }
    ],
    isActive: true
  }).populate('shift');

  return employeeShift?.shift || null;
};

const determineStatusFromShift = (customTime, shift, actionType) => {
  if (!shift) return null;

  const timeStr = moment(customTime).format('HH:mm');
  const [shiftStartHour, shiftStartMin] = shift.startTime.split(':').map(Number);
  const [shiftEndHour, shiftEndMin] = shift.endTime.split(':').map(Number);

  const shiftStartMinutes = shiftStartHour * 60 + shiftStartMin;
  const shiftEndMinutes = shiftEndHour * 60 + shiftEndMin;
  const [timeHour, timeMin] = timeStr.split(':').map(Number);
  const timeMinutes = timeHour * 60 + timeMin;

  const gracePeriod = shift.gracePeriod || 15;

  if (actionType === 'checkin') {
    if (timeMinutes <= shiftStartMinutes + gracePeriod) {
      return 'on-time';
    } else {
      return 'late';
    }
  } else if (actionType === 'checkout') {
    if (timeMinutes < shiftEndMinutes) {
      return 'early';
    } else if (timeMinutes > shiftEndMinutes) {
      return 'overtime';
    } else {
      return 'on-time';
    }
  }
  return null;
};

// =========================
//  ESP32 / AUTO ATTENDANCE
// =========================

exports.addAttendance = async (req, res) => {
  try {
    const { employeeId, fingerprintId, type, fingerId, action } = req.body;

    console.log('=== ATTENDANCE REQUEST ===');
    console.log('Time:', getSystemTime().toISOString());
    console.log('Request body:', req.body);

    // 1. Tìm employee
    let employee;
    if (employeeId) {
      employee = await Employee.findById(employeeId);
    } else if (fingerId) {
      employee = await Employee.findOne({ fingerprintId: fingerId });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found with this fingerprint ID',
          fingerId
        });
      }

      if (!employee.fingerprintEnrolled) {
        return res.status(403).json({
          success: false,
          message: 'Employee fingerprint not enrolled - please enroll first',
          fingerId,
          employeeId: employee.employeeId,
          securityAlert: true,
          what: 'enroll-required',
          action: 'enroll-first'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either employeeId or fingerId is required'
      });
    }

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // 2. Chống spam 5 phút (trong cùng ngày làm việc)
    const lastRecord = await Attendance.findOne({ employee: employee._id }).sort({ updatedAt: -1 });
    if (lastRecord) {
      const now = getSystemTime();
      const diffMinutes = moment(now).diff(moment(lastRecord.updatedAt), 'minutes');
      const isSameDay = moment(lastRecord.date).isSame(moment(now), 'day');

      if (diffMinutes < 5 && isSameDay) {
        return res.status(200).json({
          success: true,
          message: 'Thao tác quá nhanh',
          what: 'ignored'
        });
      }
    }

    // 3. Thời gian
    const now = getSystemTime();
    const today = moment(now).startOf('day').toDate();

    // Settings
    const allSettings = await attendanceHelper.getAllSettings();
    const latePolicy = allSettings['late-policy'] || {};
    const otSettings = allSettings['overtime'] || {};
    const workSettings = allSettings['working-hours'] || { endTime: '17:00' };

    // Lương
    const baseSalary = employee.baseSalary || employee.salary || 0;
    const dailyRate = baseSalary > 0 ? (baseSalary / 26) : 0;
    const hourlyRate = dailyRate / 8;

    // Bản ghi hôm nay
    let attendance = await Attendance.findOne({ employee: employee._id, date: today });

    // Tự chọn checkin / checkout
    let actionType = type || action;
    if (actionType === 'auto') {
      if (!attendance) {
        actionType = 'checkin';
      } else if (!attendance.checkIn || !attendance.checkIn.time) {
        actionType = 'checkin';
      } else if (!attendance.checkOut || !attendance.checkOut.time) {
        actionType = 'checkout';
      } else {
        return res.json({
          success: true,
          message: 'Done for today',
          what: 'done'
        });
      }
    }

    // === CHECK-IN ===
    if (actionType === 'checkin') {
      const workStartTime = allSettings['working-hours']?.startTime || '08:00';
      const lateMinutes = attendanceHelper.calculateLateMinutes(
        now,
        workStartTime,
        latePolicy.graceMinutes || 15
      );
      let checkInStatus = lateMinutes > 0 ? 'late' : 'on-time';

      let actualPenalty = 0;
      let status = 'present';

      if (lateMinutes > 0) {
        actualPenalty += attendanceHelper.calculateLatePenalty(lateMinutes, latePolicy);
      }

      const halfDayThreshold = latePolicy.halfDayThreshold || 60;
      if (lateMinutes > halfDayThreshold) {
        status = 'half-day';
        checkInStatus = 'late';
        actualPenalty += (dailyRate * 0.5);
      }

      const holiday = await attendanceHelper.isHoliday(today);
      const isHoliday = !!holiday;
      const holidayRate = holiday ? holiday.workRate : 1.0;

      if (!attendance) {
        attendance = new Attendance({
          employee: employee._id,
          fingerprintId: fingerprintId || employee.fingerprintId,
          date: today,
          checkIn: { time: now, status: checkInStatus },
          status,
          lateMinutes,
          actualPenalty,
          estimatedOTSalary: 0,
          isHoliday,
          holidayRate
        });
      } else {
        attendance.checkIn = { time: now, status: checkInStatus };
        attendance.status = status;
        attendance.actualPenalty = actualPenalty;
        attendance.lateMinutes = lateMinutes;
        attendance.isHoliday = isHoliday;
        attendance.holidayRate = holidayRate;
      }

      await attendance.save();
      return res.status(200).json({
        success: true,
        message: 'Check-in thành công',
        data: attendance,
        what: 'in'
      });
    }

    // === CHECK-OUT ===
    if (actionType === 'checkout') {
      if (!attendance || !attendance.checkIn || !attendance.checkIn.time) {
        return res.status(400).json({
          success: false,
          message: 'Bạn chưa Check-in nên không thể Check-out!',
          what: 'error',
          needInFirst: true
        });
      }

      const endTimeParts = workSettings.endTime.split(':');
      const standardEndHour = parseInt(endTimeParts[0], 10);
      const standardEndMin = parseInt(endTimeParts[1], 10);

      let checkOutStatus = 'on-time';
      if (now.getHours() < standardEndHour) {
        checkOutStatus = 'early';
      } else if (
        now.getHours() > standardEndHour ||
        (now.getHours() === standardEndHour && now.getMinutes() > standardEndMin + 30)
      ) {
        checkOutStatus = 'overtime';
      }

      const workingHours = attendanceHelper.calculateWorkingHours(attendance.checkIn.time, now);
      const overtimeHours = attendanceHelper.calculateOvertimeHours(attendance.checkIn.time, now, 8);

      let estimatedOTSalary = 0;
      let otRate = 1.0;

      if (overtimeHours > 0) {
        otRate = await attendanceHelper.getOvertimeRate(today, attendance.isHoliday || false, otSettings);
        estimatedOTSalary = Math.round(overtimeHours * hourlyRate * otRate);
      }

      attendance.checkOut = { time: now, status: checkOutStatus };
      attendance.workingHours = workingHours;
      attendance.overtimeHours = Math.max(0, overtimeHours);
      attendance.overtimeRate = otRate;
      attendance.estimatedOTSalary = estimatedOTSalary;

      await attendance.save();

      return res.status(200).json({
        success: true,
        message: 'Check-out thành công',
        data: attendance,
        what: 'out'
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Invalid attendance type. Use "checkin" or "checkout"'
    });
  } catch (error) {
    console.error('Attendance Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.stack
    });
  }
};

// Simple fingerprint handler (cũ của bạn, giữ nguyên)
exports.handleAttendance = async (req, res) => {
  try {
    const { fingerprintId } = req.body;

    const employee = await Employee.findOne({ fingerprintId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found with this fingerprint'
      });
    }

    const now = getSystemTime();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let attendance = await Attendance.findOne({
      employee: employee._id,
      date: today
    });

    const WORK_START_HOUR = 9;
    const WORK_END_HOUR = 17;
    const currentHour = now.getHours();

    if (!attendance) {
      const checkInStatus = currentHour > WORK_START_HOUR ? 'late' : 'on-time';

      attendance = new Attendance({
        employee: employee._id,
        fingerprintId,
        date: today,
        checkIn: {
          time: now,
          status: checkInStatus
        },
        status: 'present'
      });

      await attendance.save();

      return res.status(200).json({
        success: true,
        message: 'Check-in recorded successfully',
        data: attendance,
        what: 'in'
      });
    } else if (!attendance.checkOut.time) {
      const checkOutStatus =
        currentHour < WORK_END_HOUR ? 'early' :
        currentHour > WORK_END_HOUR ? 'overtime' : 'on-time';

      const checkInTime = attendance.checkIn.time;
      const workingHours = (now - checkInTime) / (1000 * 60 * 60);

      attendance.checkOut = {
        time: now,
        status: checkOutStatus
      };
      attendance.workingHours = workingHours;

      await attendance.save();

      return res.status(200).json({
        success: true,
        message: 'Check-out recorded successfully',
        data: attendance,
        what: 'out'
      });
    } else {
      return res.status(200).json({
        success: true,
        message: 'Already checked out for today',
        data: attendance,
        what: 'done'
      });
    }
  } catch (error) {
    console.error('Error in handleAttendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing attendance',
      error: error.message
    });
  }
};

// =========================
//   QUERY APIs
// =========================

exports.getEmployeeAttendance = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;

    const query = { employee: employeeId };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendance = await Attendance.find(query)
      .populate('employee', 'name employeeId')
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance records',
      error: error.message
    });
  }
};

exports.getTodayAttendance = async (req, res) => {
  try {
    const now = getSystemTime();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const attendance = await Attendance.find({
      date: today
    }).populate('employee', 'name employeeId department');

    res.status(200).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error('Error fetching today\'s attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching today\'s attendance',
      error: error.message
    });
  }
};

exports.getAllAttendance = async (req, res) => {
  try {
    const { startDate, endDate, limit = 100 } = req.query;

    const query = {};

    if (startDate && endDate) {
      const start = moment.utc(startDate).startOf('day').toDate();
      const end = moment.utc(endDate).endOf('day').toDate();

      query.date = {
        $gte: start,
        $lte: end
      };
    }

    const attendance = await Attendance.find(query)
      .populate({
        path: 'employee',
        select: 'name employeeId department',
        model: 'Employee'
      })
      .sort({ date: -1, createdAt: -1 })
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: attendance,
      count: attendance.length
    });
  } catch (error) {
    console.error('getAllAttendance - Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance records',
      error: error.message
    });
  }
};

exports.deleteTodayAttendance = async (req, res) => {
  try {
    const today = getSystemTime();
    today.setHours(0, 0, 0, 0);

    const result = await Attendance.deleteMany({
      date: today
    });

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} attendance records for today`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting today\'s attendance',
      error: error.message
    });
  }
};

exports.deleteAllAttendance = async (req, res) => {
  try {
    const result = await Attendance.deleteMany({});

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} attendance records`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting all attendance records',
      error: error.message
    });
  }
};

// =========================
//  MANUAL CHECK-IN (PREVIEW + SAVE)
// =========================

// Format: date = "YYYY-MM-DD", checkInTime = "HH:mm", checkOutTime = "HH:mm"
// Manual attendance endpoint - unified for preview and submit
// Format: date = "YYYY-MM-DD", checkInTime = "HH:mm", checkOutTime = "HH:mm"

// Manual attendance endpoint - unified for preview and submit
// Format: date = "YYYY-MM-DD", checkInTime = "HH:mm", checkOutTime = "HH:mm"
exports.manualCheckIn = async (req, res) => {
  try {
    const { userId, date, checkInTime, checkOutTime, preview = false } = req.body;

    console.log('=== MANUAL ATTENDANCE REQUEST ===');
    console.log('Request body:', req.body);
    console.log('Preview mode:', preview);

    // 1. Validate cơ bản
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required',
      });
    }

    if (!date || !checkInTime || !checkOutTime) {
      return res.status(400).json({
        success: false,
        message: 'date, checkInTime, and checkOutTime are required',
      });
    }

    // 2. Lấy employee
    const employee = await Employee.findById(userId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    // 3. Parse ngày + giờ (dùng thuần HH:mm để khỏi lỗi 24h)
    const baseDate = moment(date, 'YYYY-MM-DD');
    if (!baseDate.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Ngày không hợp lệ',
      });
    }

    const [ciHour, ciMin] = checkInTime.split(':').map(Number);
    const [coHour, coMin] = checkOutTime.split(':').map(Number);

    let checkInMoment = baseDate.clone().hour(ciHour).minute(ciMin).second(0).millisecond(0);
    let checkOutMoment = baseDate.clone().hour(coHour).minute(coMin).second(0).millisecond(0);

    if (!checkInMoment.isValid() || !checkOutMoment.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Giờ vào/ra không hợp lệ',
      });
    }

    // HỖ TRỢ CA QUA ĐÊM:
    // nếu giờ ra <= giờ vào thì hiểu là ra ngày hôm sau
    if (
      coHour < ciHour ||
      (coHour === ciHour && coMin <= ciMin)
    ) {
      checkOutMoment = checkOutMoment.add(1, 'day');
    }

    const totalMinutes = checkOutMoment.diff(checkInMoment, 'minutes');

// Không cho ca <= 0 phút (giờ ra phải sau giờ vào, kể cả ca qua đêm)
if (totalMinutes <= 0) {
  return res.status(400).json({
    success: false,
    message: 'Giờ ra phải sau giờ vào (tổng thời gian làm phải > 0 phút)',
  });
}

// Không cho ca tay > 16 tiếng (tránh nhầm 00:00 → 00:00 thành 24h)
if (totalMinutes > 16 * 60) {
  return res.status(400).json({
    success: false,
    message: 'Ca làm thủ công không được dài quá 16 giờ. Vui lòng kiểm tra lại giờ vào/ra.',
  });
}

const totalHours = totalMinutes / 60;

    const checkInDateTime = checkInMoment.toDate();
    const checkOutDateTime = checkOutMoment.toDate();

    // 4. Settings + lương
    const allSettings = await attendanceHelper.getAllSettings();
    const latePolicy = allSettings['late-policy'] || {};
    const otSettings = allSettings['overtime'] || {};
    const workSettings = allSettings['working-hours'] || {
      startTime: '08:00',
      endTime: '17:00',
    };

    const baseSalary = employee.baseSalary || employee.salary || 0;
    const dailyRate = baseSalary > 0 ? baseSalary / 26 : 0;
    const hourlyRate = dailyRate / 8;

    // 5. Tính đi muộn so với giờ chuẩn (startTime)
    const workStartTime = workSettings.startTime || '08:00';
    const workEndTime = workSettings.endTime || '17:00';

    const lateMinutes = attendanceHelper.calculateLateMinutes(
      checkInDateTime,
      workStartTime,
      latePolicy.graceMinutes || 15
    );
    const checkInStatus = lateMinutes > 0 ? 'late' : 'on-time';

    let actualPenalty = 0;
    let status = 'present';

    if (lateMinutes > 0) {
      actualPenalty += attendanceHelper.calculateLatePenalty(
        lateMinutes,
        latePolicy
      );
    }

    const halfDayThreshold = latePolicy.halfDayThreshold || 60;
    if (lateMinutes > halfDayThreshold) {
      status = 'half-day';
      actualPenalty += dailyRate * 0.5;
    }

    // 6. Ngày chấm công + ngày lễ
    const attendanceDate = moment(date, 'YYYY-MM-DD').startOf('day').toDate();
    const holiday = await attendanceHelper.isHoliday(attendanceDate);
    const isHoliday = !!holiday;
    const holidayRate = holiday ? holiday.workRate : 1.0;

    // 7. TÍNH GIỜ CHUẨN & OT
    //   Khung giờ chuẩn: từ workStartTime đến workEndTime trong đúng ngày "date"
    const [wsHour, wsMin] = workStartTime.split(':').map(Number);
    const [weHour, weMin] = workEndTime.split(':').map(Number);

    const workDayStart = baseDate
      .clone()
      .hour(wsHour)
      .minute(wsMin)
      .second(0)
      .millisecond(0);
    const workDayEnd = baseDate
      .clone()
      .hour(weHour)
      .minute(weMin)
      .second(0)
      .millisecond(0);

    // overlap giữa [checkIn, checkOut] và [workDayStart, workDayEnd]
    const overlapStart = moment.max(checkInMoment, workDayStart);
    const overlapEnd = moment.min(checkOutMoment, workDayEnd);

    let standardHours = 0;
    if (overlapEnd.isAfter(overlapStart)) {
      standardHours = overlapEnd.diff(overlapStart, 'minutes') / 60;
    }

    // Chuẩn tối đa 8h / ngày
    if (standardHours > 8) standardHours = 8;

    let overtimeHours = Math.max(0, totalHours - standardHours);

    // 8. Trạng thái check-out
    let checkOutStatus = 'on-time';
    if (overtimeHours > 0) {
      checkOutStatus = 'overtime';
    } else if (checkOutMoment.isBefore(workDayEnd)) {
      checkOutStatus = 'early';
    }

    // 9. Làm tròn
    const roundedWorkingHours = Math.round(totalHours * 10) / 10;
    const roundedStandardHours = Math.round(standardHours * 10) / 10;
    const roundedOvertimeHours = Math.round(overtimeHours * 10) / 10;

    console.log('📊 [MANUAL ATTENDANCE CALC]', {
      employee: employee.name,
      checkIn: checkInMoment.format('YYYY-MM-DD HH:mm'),
      checkOut: checkOutMoment.format('YYYY-MM-DD HH:mm'),
      totalHours: roundedWorkingHours,
      standardHours: roundedStandardHours,
      overtimeHours: roundedOvertimeHours,
    });

    // 10. Tiền OT
    let otRate = 1.0;
    let estimatedOTSalary = 0;
    if (roundedOvertimeHours > 0) {
      otRate = await attendanceHelper.getOvertimeRate(
        attendanceDate,
        isHoliday,
        otSettings
      );
      estimatedOTSalary = Math.round(
        roundedOvertimeHours * hourlyRate * otRate
      );
    }

    // 11. Công quy đổi
    let dailyWorkCredit = 1.0;
    if (status === 'half-day') dailyWorkCredit = 0.5;
    if (status === 'absent') dailyWorkCredit = 0;

    // 12. Preview mode → chỉ trả kết quả
    if (preview) {
      return res.status(200).json({
        success: true,
        data: {
          employee: {
            name: employee.name,
            employeeId: employee.employeeId,
          },
          checkIn: {
            time: checkInDateTime,
            status: checkInStatus,
          },
          checkOut: {
            time: checkOutDateTime,
            status: checkOutStatus,
          },
          workingHours: roundedWorkingHours,
          overtimeHours: roundedOvertimeHours,
          standardWorkingHours: roundedStandardHours,
          overtimeRate: otRate,
          lateMinutes,
          actualPenalty: Math.round(actualPenalty),
          estimatedOTSalary: Math.round(estimatedOTSalary),
          status,
          dailyWorkCredit,
          isHoliday,
          holidayRate,
        },
      });
    }

    // 13. Lưu DB
    const today = moment(attendanceDate).startOf('day').toDate();
    let attendance = await Attendance.findOne({
      employee: employee._id,
      date: today,
    });

    const attendanceData = {
      employee: employee._id,
      fingerprintId: employee.fingerprintId || 0,
      date: today,
      checkIn: { time: checkInDateTime, status: checkInStatus },
      checkOut: { time: checkOutDateTime, status: checkOutStatus },
      status,
      lateMinutes,
      actualPenalty,
      workingHours: roundedWorkingHours,
      overtimeHours: roundedOvertimeHours,
      overtimeRate: otRate,
      estimatedOTSalary,
      isHoliday,
      holidayRate,
      isManual: true,
    };

    if (!attendance) {
      attendance = new Attendance(attendanceData);
    } else {
      Object.assign(attendance, attendanceData);
    }

    await attendance.save();

    console.log(
      `✅ [MANUAL ATTENDANCE SAVED] ${employee.name} ` +
        `${checkInMoment.format('DD/MM/YYYY HH:mm')} → ${checkOutMoment.format(
          'HH:mm'
        )}`
    );

    return res.status(200).json({
      success: true,
      message: 'Chấm công thủ công thành công',
      data: attendance,
      what: 'manual-both',
    });
  } catch (error) {
    console.error('Manual Attendance Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error processing manual attendance',
    });
  }
};

// Preview attendance (legacy - kept for backward compatibility)
exports.previewAttendance = exports.manualCheckIn;






