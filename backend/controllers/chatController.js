const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Payroll = require('../models/Payroll');
const { calculateMonthlySalary } = require('../utils/salaryCalculator'); // Added import
const { detectIntentAndEntities, toASCII, pickEmployeeName, pickEmployeeCode } = require('../services/nlu');
const { classifyIntent } = require('../services/llm');
const moment = require('moment-timezone');

moment.tz.setDefault('Asia/Ho_Chi_Minh');

// ===== Commons =====
function dayRange(dateISO) {
  const start = new Date(dateISO + 'T00:00:00.000Z');
  const end = new Date(dateISO + 'T23:59:59.999Z');
  return { start, end };
}
function monthRange(year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  return { start, end };
}
const fmtVND = (n = 0) => `${Math.round(n).toLocaleString('vi-VN')}₫`;

// ===== Helpers =====
async function resolveMe(user) {
  return (user.employee && await Employee.findById(user.employee)) ||
    await Employee.findOne({ user: user._id }) ||
    await Employee.findOne({ name: user.name }) ||
    await Employee.findOne();
}

function isPrivileged(user) {
  // Roles: employee | accountant | manager
  return user && user.role && user.role !== 'employee';
}

/** 
 * TÍNH LƯƠNG CHO CHATBOT
 * Ưu tiên dùng snapshot Payroll nếu đã lưu trong DB.
 * Nếu chưa có snapshot → gọi calculateMonthlySalary để tính đúng công thức mới.
 */
async function computeSalaryFor(emp, year, month, extraLeaveDays = 0) {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`; // "2025-08"

  // 1) Thử lấy snapshot payroll trong DB
  let snap = await Payroll.findOne({ employee: emp._id, month: monthStr }).lean();

  // 2) Nếu chưa có → tính on-the-fly bằng module calculateMonthlySalary (KHÔNG save DB)
  if (!snap) {
    try {
      snap = await calculateMonthlySalary(emp._id, year, month);
    } catch (e) {
      console.error("Error calculating salary on-the-fly", e);
      snap = null;
    }
  }

  // Fallback if still no snap (e.g. employee has no data)
  if (!snap) {
    // Basic fallback to avoid crash
    const baseSalaryFull = Number(emp.baseSalary || emp.salary || 0);
    return {
      mode: 'snapshot',
      baseSalaryFull,
      base: 0,
      netSalary: 0,
      dailyRate: 0,
      workingDays: 0,
      overtimeHours: 0,
      overtimePay: 0,
      holidayWorkPay: 0,
      weekendWorkPay: 0,
      latePenalty: 0,
      generalAllowance: 0,
      taxAmount: 0,
      leaveDays: 0,
      extraLeaveDays: 0,
      total: 0
    };
  }

  // 3) Map dữ liệu từ snapshot/module sang format dùng cho chatbot
  const baseSalaryFull = Number(
    snap.basicSalaryFull ?? snap.baseSalaryFull ?? emp.baseSalary ?? emp.salary ?? 0
  );

  // Lương theo ngày công (đã prorate theo ngày làm thực tế)
  const base = Number(snap.baseSalary ?? snap.base ?? 0);

  // Tổng phụ cấp: phụ cấp chung + thâm niên + chức vụ + otherAllowances
  const generalAllowance =
    Number(snap.generalAllowance ?? 0) +
    Number(snap.seniorityAllowance ?? 0) +
    Number(snap.positionAllowance ?? 0) +
    Number(snap.otherAllowances ?? 0);

  const overtimePay = Number(snap.overtimePay ?? 0);         // OT thường (đã có hệ số)
  const holidayWorkPay = Number(snap.holidayWorkPay ?? 0);   // Làm ngày lễ
  const weekendWorkPay = Number(snap.weekendWorkPay ?? 0);   // Chỉ hiển thị tham khảo, KHÔNG cộng net
  const latePenalty = Number(snap.latePenalty ?? 0);         // Tổng phạt
  const taxAmount = Number(snap.taxAmount ?? 0);             // Thuế

  const STANDARD_WORKING_DAYS = 26;
  const dailyRate = Number(
    snap.dailyRate ?? Math.round(baseSalaryFull / STANDARD_WORKING_DAYS)
  );

  const workingDays = Number(snap.actualWorkingDays ?? snap.workingDays ?? 0);
  const overtimeHours = Number(snap.overtimeHours ?? 0);

  // Tổng ngày nghỉ (absent + unpaid) đang có trong tháng
  const leaveDaysNow =
    Number(snap.absentDays ?? 0) +
    Number(snap.unpaidLeaveDays ?? 0);

  // Lương thực lãnh đã được tính toán đúng trong snap (do Payroll hoặc calculateMonthlySalary trả về)
  // Tuy nhiên, để đảm bảo consistency như yêu cầu trước đây, ta dùng prop netSalary của snap
  const storedNet = Number(snap.netSalary ?? snap.totalSalary ?? 0);

  // 4) Logic dự báo: nếu nghỉ thêm extraLeaveDays
  // Công thức đơn giản: LCB - (tổng ngày nghỉ × đơn giá/ngày), KHÔNG trừ thuế/phạt/OT
  const totalAbsentDays = leaveDaysNow + Number(extraLeaveDays || 0);
  const simpleSalaryIfLeave = Math.max(
    0,
    baseSalaryFull - totalAbsentDays * dailyRate
  );

  // 5) Net salary hiển thị
  // - Nếu extraLeaveDays > 0 → dùng lương tạm tính đơn giản
  // - Nếu = 0            → tin tưởng netSalary từ payroll
  const finalNet =
    extraLeaveDays > 0
      ? simpleSalaryIfLeave
      : storedNet;

  return {
    mode: 'snapshot',
    baseSalaryFull,          // LCB tháng do admin set
    base,                    // Lương theo ngày công (prorated)
    netSalary: finalNet,     // Lương thực lãnh dùng để hiển thị (thực tế hoặc dự báo)
    dailyRate,
    workingDays,
    overtimeHours,
    overtimePay,
    holidayWorkPay,
    weekendWorkPay,          // chỉ để tham khảo nếu muốn show chi tiết
    latePenalty,
    generalAllowance,
    taxAmount,
    leaveDays: leaveDaysNow, // nghỉ hiện tại trong tháng
    extraLeaveDays,
    total: finalNet          // alias để các chỗ khác dùng
  };
}

// ===== Handlers intent =====
async function handleMySalary(user, entities) {
  const now = new Date();
  const year = entities.year || now.getFullYear();
  const month = entities.month || now.getMonth() + 1;

  const me = await resolveMe(user);
  if (!me) return 'Không tìm thấy hồ sơ nhân viên của bạn.';

  const info = await computeSalaryFor(me, year, month, 0);
  if (info.mode === 'hourly') {
    return `Lương ${month}/${year} của bạn: ${fmtVND(info.total)} (giờ: ${info.hours.toFixed(2)}h × ${fmtVND(info.base)}/h).`;
  }
  if (info.mode === 'snapshot') {
    // Nếu là dự báo (What-if nghỉ thêm ngày) -> Hiển thị đơn giản
    if (info.extraLeaveDays > 0) {
      const deduct = info.dailyRate * info.extraLeaveDays;
      const remain = Math.max(0, info.baseSalaryFull - deduct);
      return `Lương tháng ${month}/${year} của bạn nếu nghỉ ${info.extraLeaveDays} ngày thì còn khoảng ${fmtVND(remain)} (LCB: ${fmtVND(info.baseSalaryFull)} - ${info.extraLeaveDays} × ${fmtVND(info.dailyRate)} = ${fmtVND(remain)}).`;
    }

    // Nếu xem lương bình thường -> Hiển thị chi tiết (đồng bộ với phiếu lương)
    const parts = [
      `Lương ${month}/${year} của bạn:`,
      `• Lương cơ bản: ${fmtVND(info.baseSalaryFull)}`,
      `• Lương ngày công (${info.workingDays} ngày): ${fmtVND(info.base)}`,
    ];
    if (info.generalAllowance > 0) parts.push(`• Phụ cấp: +${fmtVND(info.generalAllowance)}`);
    if (info.overtimePay > 0) parts.push(`• OT (${info.overtimeHours}h): +${fmtVND(info.overtimePay)}`);
    if (info.holidayWorkPay > 0) parts.push(`• Làm ngày lễ: +${fmtVND(info.holidayWorkPay)}`);
    if (info.latePenalty > 0) parts.push(`• Phạt: -${fmtVND(info.latePenalty)}`);
    if (info.taxAmount > 0) parts.push(`• Thuế: -${fmtVND(info.taxAmount)}`);

    parts.push(`→ Thực lãnh: ${fmtVND(info.netSalary)}`);
    return parts.join('\n');
  }
  return `Lương ${month}/${year} của bạn: ${fmtVND(info.total)} (cơ bản ${fmtVND(info.base)}, nghỉ ${info.totalLeave || 0} ngày, đơn giá/ngày ${fmtVND(info.dailyRate)}).`;
}

async function handleWhatIfLeave(user, entities) {
  const now = new Date();
  const year = entities.year || now.getFullYear();
  const month = entities.month || now.getMonth() + 1;
  const more = Math.max(0, Number(entities.days ?? 1)); // số ngày muốn nghỉ

  const me = await resolveMe(user);
  if (!me) return 'Không tìm thấy hồ sơ nhân viên của bạn.';

  // Lấy thông tin lương tháng (đúng theo phiếu lương)
  const info = await computeSalaryFor(me, year, month, 0); // extraLeaveDays không dùng để tính net nữa

  const baseSalaryFull = Number(info.baseSalaryFull || 0);
  // Lương 1 ngày: LCB / 26 (nếu dailyRate chưa có thì tự tính)
  const STANDARD_WORKING_DAYS = 26;
  const dailyRate = info.dailyRate || (baseSalaryFull / STANDARD_WORKING_DAYS) || 0;

  const deduction = dailyRate * more;                      // tiền trừ của X ngày nghỉ
  const remaining = Math.max(0, baseSalaryFull - deduction); // LCB - X ngày

  return `Lương tháng ${month}/${year} của bạn nếu nghỉ ${more} ngày thì còn khoảng ${fmtVND(remaining)} (LCB: ${fmtVND(baseSalaryFull)} - ${more} × ${fmtVND(dailyRate)} = ${fmtVND(remaining)}).`;
}

async function handleEmployeeSalary(user, entities, rawText) {
  const privileged = isPrivileged(user);
  let name = (entities.employeeName || '').trim();
  let code = (entities.employeeCode || '').trim();

  // Nếu không có trong entities, thử extract từ rawText
  if (!name && !code && rawText) {
    name = pickEmployeeName(rawText) || '';
    code = pickEmployeeCode(toASCII(rawText), rawText) || '';
  }

  // Nếu không phải admin/manager và không chỉ định nhân viên cụ thể → xem lương của mình
  if (!privileged && !name && !code) {
    return handleMySalary(user, entities);
  }

  // Kiểm tra quyền: nếu không phải admin/manager và hỏi về người khác → từ chối
  if (!privileged) {
    const me = await resolveMe(user);
    if (me) {
      const myName = toASCII(String(me.name || ''));
      const myCode = toASCII(String(me.employeeId || me.code || me.empCode || ''));
      const queryName = toASCII(name || '');
      const queryCode = toASCII(code || '');
      if ((name && queryName !== myName) || (code && queryCode !== myCode)) {
        return 'Bạn không có quyền xem lương của người khác. Chỉ quản lý/admin mới có thể xem lương của nhân viên khác.';
      }
    }
  }

  const now = new Date();
  const year = entities.year || now.getFullYear();
  const month = entities.month || now.getMonth() + 1;

  let emp = null;

  // Tìm theo mã nhân viên (ưu tiên)
  if (code) {
    emp = await Employee.findOne({
      $or: [
        { employeeId: code },
        { code },
        { empCode: code },
        { employeeId: code.toUpperCase() },
        { code: code.toUpperCase() },
        { empCode: code.toUpperCase() }
      ]
    });
  }

  // Tìm theo tên nhân viên (không phân biệt hoa thường, có dấu)
  if (!emp && name) {
    // Tìm chính xác trước
    emp = await Employee.findOne({ name }).collation({ locale: 'vi', strength: 1 });
    // Nếu không tìm thấy, thử tìm theo tên chứa (fuzzy match)
    if (!emp) {
      const nameRegex = new RegExp(name.replace(/\s+/g, '.*'), 'i');
      emp = await Employee.findOne({ name: nameRegex }).collation({ locale: 'vi', strength: 1 });
    }
  }

  // Fallback: nếu không tìm thấy và không phải admin thì lấy thông tin của mình
  if (!emp && !privileged) {
    emp = await resolveMe(user);
  }

  if (!emp) {
    const notFoundMsg = code
      ? `Không tìm thấy nhân viên với mã "${code}".`
      : name
        ? `Không tìm thấy nhân viên với tên "${name}".`
        : 'Không tìm thấy nhân viên.';
    return notFoundMsg + (privileged ? ' Vui lòng kiểm tra lại mã nhân viên hoặc tên.' : '');
  }

  const info = await computeSalaryFor(emp, year, month, 0);
  const empCodeDisplay = emp.employeeId || emp.code || emp.empCode || '';
  const codePart = empCodeDisplay ? ` (${empCodeDisplay})` : '';

  if (info.mode === 'hourly') {
    return `Lương ${month}/${year} của ${emp.name}${codePart}: ${fmtVND(info.total)} (giờ: ${info.hours.toFixed(2)}h × ${fmtVND(info.base)}/h).`;
  }
  if (info.mode === 'snapshot') {
    if (privileged) {
      // Admin/KT xem: Hiển thị chi tiết gọn
      return `Lương ${month}/${year} của ${emp.name}${codePart}: ${fmtVND(info.netSalary)} (CB: ${fmtVND(info.baseSalaryFull)}, Công: ${fmtVND(info.base)}, Phụ cấp: ${fmtVND(info.generalAllowance)}, OT: ${fmtVND(info.overtimePay)}, Lễ: ${fmtVND(info.holidayWorkPay)}, Phạt: -${fmtVND(info.latePenalty)}, Thuế: -${fmtVND(info.taxAmount)})`;
    }
    // Nhân viên xem (fallback): Hiển thị chi tiết đầy đủ
    const parts = [
      `Lương ${month}/${year} của ${emp.name}${codePart}:`,
      `• Lương cơ bản: ${fmtVND(info.baseSalaryFull)}`,
      `• Lương ngày công (${info.workingDays} ngày): ${fmtVND(info.base)}`,
    ];
    if (info.generalAllowance > 0) parts.push(`• Phụ cấp: +${fmtVND(info.generalAllowance)}`);
    if (info.overtimePay > 0) parts.push(`• OT (${info.overtimeHours}h): +${fmtVND(info.overtimePay)}`);
    if (info.holidayWorkPay > 0) parts.push(`• Làm ngày lễ: +${fmtVND(info.holidayWorkPay)}`);
    if (info.latePenalty > 0) parts.push(`• Phạt: -${fmtVND(info.latePenalty)}`);
    if (info.taxAmount > 0) parts.push(`• Thuế: -${fmtVND(info.taxAmount)}`);

    parts.push(`→ Thực lãnh: ${fmtVND(info.netSalary)}`);
    return parts.join('\n');
  }
  return `Lương ${month}/${year} của ${emp.name}${codePart}: ${fmtVND(info.total)} (cơ bản ${fmtVND(info.base)}, nghỉ ${info.totalLeave || 0} ngày, đơn giá/ngày ${fmtVND(info.dailyRate)}).`;
}

async function handleEmployeeInfo(user, entities) {
  const privileged = isPrivileged(user);
  const code = (entities.employeeCode || '').trim();

  if (!privileged) {
    const me = await resolveMe(user);
    if (!me) return 'Không tìm thấy hồ sơ nhân viên của bạn.';
    return [
      `${me.name} (${me.employeeId || me.code || '—'})`,
      me.position ? `• Chức danh: ${me.position}` : null,
      me.department ? `• Phòng ban: ${me.department}` : null,
      `• Lương cơ bản (hồ sơ): ${fmtVND(me.salary || 0)}`
    ].filter(Boolean).join('\n');
  }

  let emp = null;
  if (code) emp = await Employee.findOne({ $or: [{ employeeId: code }, { code }, { empCode: code }] });
  if (!emp) return `Không tìm thấy nhân viên với mã cung cấp.`;

  return [
    `${emp.name} (${emp.employeeId || emp.code || '—'})`,
    emp.position ? `• Chức danh: ${emp.position}` : null,
    emp.department ? `• Phòng ban: ${emp.department}` : null,
    `• Lương cơ bản (hồ sơ): ${fmtVND(emp.salary || 0)}`
  ].filter(Boolean).join('\n');
}

async function handleTotalPayroll(user, entities) {
  if (!isPrivileged(user)) return 'Chỉ kế toán/manager mới xem được tổng lương.';

  const now = new Date();
  const year = entities.year || now.getFullYear();
  const month = entities.month || now.getMonth() + 1;
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  // Lấy tổng lương từ database Payroll (netSalary hoặc totalSalary)
  const payrolls = await Payroll.find({ month: monthStr }).lean();

  if (!payrolls || payrolls.length === 0) {
    return `Chưa có dữ liệu lương tháng ${month}/${year}. Vui lòng tính lương trước.`;
  }

  // Tính tổng từ netSalary (thực lãnh) của tất cả nhân viên
  let total = 0;
  for (const p of payrolls) {
    const netSalary = Number(p.netSalary || p.totalSalary || 0);
    total += netSalary;
  }

  return `Tổng lương ${month}/${year} của toàn bộ nhân viên: ${fmtVND(total)}.`;
}

async function handleCheckedInOnDate(user, entities) {
  if (!isPrivileged(user)) return 'Bạn không có quyền xem danh sách điểm danh.';

  // Tính ngày theo timezone VN
  const now = moment().tz('Asia/Ho_Chi_Minh');
  const dateISO = entities.dateISO || now.format('YYYY-MM-DD');
  const targetDate = moment.tz(dateISO, 'YYYY-MM-DD', 'Asia/Ho_Chi_Minh');
  const start = targetDate.startOf('day').toDate();
  const end = targetDate.endOf('day').toDate();

  // Query attendance với timezone VN
  const attendedIds = await Attendance.distinct('employee', {
    date: { $gte: start, $lte: end },
    $or: [
      { 'checkIn.time': { $exists: true, $ne: null } },
      { status: 'present' }
    ]
  });
  const attended = await Employee.find({ _id: { $in: attendedIds } }, 'name employeeId').lean();
  if (!attended.length) return `Chưa có ai điểm danh ngày ${dateISO}.`;

  // Hiển thị danh sách với mã nhân viên
  const list = attended.map(x => {
    const code = x.employeeId || '';
    return code ? `${x.name} (${code})` : x.name;
  }).join(', ');

  return `Hôm nay ai đã điểm danh rồi:\n${list}\n\nTổng: ${attended.length} người.`;
}

async function handleUnattendedToday(user, entities) {
  if (!isPrivileged(user)) return 'Bạn không có quyền xem danh sách điểm danh.';

  // Tính ngày theo timezone VN
  const now = moment().tz('Asia/Ho_Chi_Minh');
  const dateISO = entities.dateISO || now.format('YYYY-MM-DD');
  const targetDate = moment.tz(dateISO, 'YYYY-MM-DD', 'Asia/Ho_Chi_Minh');
  const start = targetDate.startOf('day').toDate();
  const end = targetDate.endOf('day').toDate();

  const active = await Employee.find({ status: 'active' }, '_id name employeeId').lean();
  // Query attendance với timezone VN
  const attendedIds = await Attendance.distinct('employee', {
    date: { $gte: start, $lte: end },
    $or: [
      { 'checkIn.time': { $exists: true, $ne: null } },
      { status: 'present' }
    ]
  });
  const missing = active.filter(e => !attendedIds.find(id => String(id) === String(e._id)));
  if (!missing.length) return `Tất cả nhân viên đều đã điểm danh ngày ${dateISO}`;

  // Hiển thị danh sách với mã nhân viên
  const list = missing.map(x => {
    const code = x.employeeId || '';
    return code ? `${x.name} (${code})` : x.name;
  }).join(', ');

  return `Hôm nay ai chưa điểm danh:\n${list}\n\nTổng: ${missing.length} người.`;
}

async function handleMyAttendanceToday(user, entities) {
  const me = await resolveMe(user);
  if (!me) return 'Không tìm thấy hồ sơ nhân viên của bạn.';

  // Tính ngày hôm nay theo timezone VN
  const now = moment().tz('Asia/Ho_Chi_Minh');
  const today = now.clone();
  const dateISO = entities.dateISO || today.format('YYYY-MM-DD');

  // Query attendance với timezone VN
  const targetDate = moment.tz(dateISO, 'YYYY-MM-DD', 'Asia/Ho_Chi_Minh');
  const start = targetDate.startOf('day').toDate();
  const end = targetDate.endOf('day').toDate();

  // Kiểm tra attendance - có thể có checkIn hoặc status = 'present'
  const attendance = await Attendance.findOne({
    employee: me._id,
    date: { $gte: start, $lte: end }
  });

  if (attendance && (attendance.checkIn?.time || attendance.status === 'present')) {
    return `Bạn ĐÃ điểm danh ngày ${dateISO}.`;
  }
  return `Bạn CHƯA điểm danh ngày ${dateISO}.`;
}

async function handleMyAttendanceYesterday(user, entities) {
  const me = await resolveMe(user);
  if (!me) return 'Không tìm thấy hồ sơ nhân viên của bạn.';

  // Tính ngày hôm qua theo timezone VN (giống như attendanceController)
  const now = moment().tz('Asia/Ho_Chi_Minh');
  const yesterday = now.clone().subtract(1, 'day');
  const dateISO = yesterday.format('YYYY-MM-DD');

  // Query attendance với timezone VN (giống như getAllAttendance)
  const start = yesterday.startOf('day').toDate();
  const end = yesterday.endOf('day').toDate();

  // Kiểm tra attendance - có thể có checkIn hoặc status = 'present'
  const attendance = await Attendance.findOne({
    employee: me._id,
    date: { $gte: start, $lte: end }
  });

  if (attendance && (attendance.checkIn?.time || attendance.status === 'present')) {
    return `Hôm qua (${dateISO}) bạn ĐÃ điểm danh.`;
  }
  return `Hôm qua (${dateISO}) bạn CHƯA điểm danh.`;
}

async function handleEmployeeAttendanceByCode(user, entities, rawText) {
  const privileged = isPrivileged(user);
  if (!privileged) return 'Bạn không có quyền xem điểm danh của nhân viên khác. Chỉ quản lý/admin mới có thể xem.';

  let code = (entities.employeeCode || '').trim();

  // Nếu không có trong entities, thử extract từ rawText
  if (!code && rawText) {
    code = pickEmployeeCode(toASCII(rawText), rawText) || '';
  }

  if (!code) return 'Vui lòng cung cấp mã nhân viên (ví dụ: EMP004).';

  const emp = await Employee.findOne({
    $or: [
      { employeeId: code },
      { code },
      { empCode: code },
      { employeeId: code.toUpperCase() },
      { code: code.toUpperCase() },
      { empCode: code.toUpperCase() }
    ]
  });

  if (!emp) return `Không tìm thấy nhân viên với mã "${code}".`;

  // Tính ngày theo timezone VN
  const now = moment().tz('Asia/Ho_Chi_Minh');
  const dateISO = entities.dateISO || now.format('YYYY-MM-DD');
  const targetDate = moment.tz(dateISO, 'YYYY-MM-DD', 'Asia/Ho_Chi_Minh');
  const start = targetDate.startOf('day').toDate();
  const end = targetDate.endOf('day').toDate();

  // Query attendance với timezone VN
  const attendance = await Attendance.findOne({
    employee: emp._id,
    date: { $gte: start, $lte: end }
  });

  if (attendance && (attendance.checkIn?.time || attendance.status === 'present')) {
    return `Nhân viên ${emp.name} (${code}) ĐÃ điểm danh ngày ${dateISO}.`;
  }
  return `Nhân viên ${emp.name} (${code}) CHƯA điểm danh ngày ${dateISO}.`;
}

async function handleMyProfile(user) {
  const me = await resolveMe(user);
  if (!me) return 'Không tìm thấy hồ sơ nhân viên của bạn.';
  return [
    `${me.name} (${me.employeeId || me.code || '—'})`,
    me.position ? `• Chức danh: ${me.position}` : null,
    me.department ? `• Phòng ban: ${me.department}` : null,
    `• Lương cơ bản (hồ sơ): ${fmtVND(me.salary || 0)}`,
    (me.bankAccount?.bankName && me.bankAccount?.accountNumber) ? `• Tài khoản ngân hàng: ${me.bankAccount.bankName} – ${me.bankAccount.accountNumber}` : null
  ].filter(Boolean).join('\n');
}

async function handleMyLeaveBalance(user) {
  const me = await resolveMe(user);
  if (!me) return 'Không tìm thấy hồ sơ nhân viên của bạn.';
  const annual = Number(me.annualLeaveDays || 0);   // từ schema Employee
  const used = Number(me.usedLeaveDays || 0);   // từ schema Employee
  const remain = Math.max(0, annual - used);
  return `Bạn có ${annual} ngày phép/năm, đã dùng ${used}, còn lại ${remain}.`;
}

function handleLeaveApprover() {
  // Nếu bạn có bảng cấu hình settings riêng thì thay chuỗi này bằng dữ liệu thực
  return [
    'Quy trình duyệt đơn nghỉ:',
    '• Bước 1: Trưởng bộ phận/Quản lý trực tiếp duyệt.',
    '• Bước 2: Bộ phận Nhân sự/Kế toán kiểm tra và xác nhận.',
    '• Trạng thái nghỉ phép sẽ cập nhật trong hệ thống sau khi duyệt xong.'
  ].join('\n');
}
async function handleIsLateDeducted() {
  const Settings = require('../models/Settings');
  const latePolicy = await Settings.findOne({ type: 'late-policy' });
  const config = latePolicy?.config || {};

  const penaltyRate = config.penaltyRate || 20000; // 20k mặc định
  const penaltyInterval = config.penaltyInterval || 15; // 15 phút mặc định
  const lostWorkDayThreshold = config.lateThreshold2Hours || 120; // 2 tiếng mặc định

  return [
    'Đi trễ có bị trừ lương theo chính sách công ty:',
    `• Phạt đi trễ: ${fmtVND(penaltyRate)} mỗi ${penaltyInterval} phút`,
    `• Trễ >= ${lostWorkDayThreshold} phút (${lostWorkDayThreshold / 60} giờ): Mất 1 ngày công`,
    `• Phạt được tính: (Số phút trễ / ${penaltyInterval}) × ${fmtVND(penaltyRate)}`,
    '',
    'Ví dụ: Trễ 30 phút = (30/15) × 20.000 = 40.000₫'
  ].join('\n');
}

async function handleLatePenaltyRule() {
  const Settings = require('../models/Settings');
  const latePolicy = await Settings.findOne({ type: 'late-policy' });
  const config = latePolicy?.config || {};

  const penaltyRate = config.penaltyRate || 20000; // 20k mặc định
  const penaltyInterval = config.penaltyInterval || 15; // 15 phút mặc định
  const lostWorkDayThreshold = config.lateThreshold2Hours || 120; // 2 tiếng mặc định

  return [
    'Mức phạt đi muộn:',
    `• Mỗi ${penaltyInterval} phút trễ: ${fmtVND(penaltyRate)}`,
    `• Trễ >= ${lostWorkDayThreshold} phút (${lostWorkDayThreshold / 60} giờ): Mất 1 ngày công (bị trừ lương 1 ngày)`,
    '',
    'Công thức tính phạt:',
    `Phạt = (Số phút trễ / ${penaltyInterval}) × ${fmtVND(penaltyRate)}`,
    '',
    'Ví dụ:',
    `• Trễ 15 phút: (15/${penaltyInterval}) × ${fmtVND(penaltyRate)} = ${fmtVND(penaltyRate)}`,
    `• Trễ 30 phút: (30/${penaltyInterval}) × ${fmtVND(penaltyRate)} = ${fmtVND(penaltyRate * 2)}`,
    `• Trễ 45 phút: (45/${penaltyInterval}) × ${fmtVND(penaltyRate)} = ${fmtVND(penaltyRate * 3)}`,
    `• Trễ ${lostWorkDayThreshold} phút trở lên: Mất 1 ngày công`
  ].join('\n');
}
function handlePolicySummary() {
  return [
    'Tổng hợp chính sách nhân sự (mặc định):',
    '• Nghỉ phép năm: 12 ngày/năm (tích luỹ theo tháng).',
    '• OT: Bắt đầu từ lúc 18 giờ. Tính theo hệ số 150%/200%/300% tuỳ khung giờ.',
    '• Đi trễ/ về sớm: có thể bị phạt hoặc trừ lương theo quy định.',
    '• Chấm công: điểm danh khi vào/ra, nghỉ trưa không tính công.',
    '→ Bạn có thể hỏi: "nếu tôi nghỉ 2 ngày thì lương còn bao nhiêu?", "checkin ngày 2025-11-12 có những ai", "số ngày phép còn lại của tôi"...'
  ].join('\n');
}

function helpText() {
  return [
    'Mình hiểu các câu:',
    '• "Lương của tôi tháng này", "nếu tôi nghỉ 2 ngày thì lương còn bao nhiêu?"',
    '• "Lương EMP030 tháng 10", "thông tin của mã EMP015"',
    '• "Hôm nay ai đã/ chưa điểm danh?", "checkin ngày YYYY-MM-DD có những ai"',
    '• "Hôm qua tui đã check in chưa", "Nhân viên EMP003 đã check in chưa"',
    '• "Tổng lương tháng 9 của tất cả nhân viên?"',
    '• "Hồ sơ của tôi", "số ngày phép còn lại của tôi", "xin nghỉ cần duyệt của ai"',
    '• "mức phạt đi muộn", "đi trễ có bị trừ lương không", "tổng hợp chính sách nhân sự"'
  ].join('\n');
}

// ===== Controller =====
exports.postMessage = async (req, res) => {
  try {
    const text = String(req.body?.message || '').trim();
    if (!text) return res.status(400).json({ error: 'Thiếu message' });
    const user = req.user || { role: 'employee', name: 'User' };

    // 1) Thử LLM; 2) fallback regex
    let parsed = await classifyIntent({ text, user });
    if (!parsed) parsed = detectIntentAndEntities(text);

    const intent = String(parsed.intent || 'UNKNOWN').toUpperCase();
    const entities = parsed.entities || {};

    let reply = '';
    switch (intent) {
      case 'MY_SALARY': reply = await handleMySalary(user, entities); break;
      case 'WHAT_IF_LEAVE': reply = await handleWhatIfLeave(user, entities); break;
      case 'EMPLOYEE_SALARY': reply = await handleEmployeeSalary(user, entities, text); break;
      case 'EMPLOYEE_INFO': reply = await handleEmployeeInfo(user, entities); break;
      case 'TOTAL_PAYROLL': reply = await handleTotalPayroll(user, entities); break;
      case 'CHECKED_IN_ON_DATE': reply = await handleCheckedInOnDate(user, entities); break;
      case 'UNATTENDED_TODAY': reply = await handleUnattendedToday(user, entities); break;
      case 'MY_ATTENDANCE_TODAY': reply = await handleMyAttendanceToday(user, entities); break;
      case 'TODAY_DATE': reply = `Hôm nay là ${new Date().toISOString().slice(0, 10)}.`; break;
      case 'EMPLOYEE_ATTENDANCE_BY_CODE': reply = await handleEmployeeAttendanceByCode(user, entities, text); break;
      case 'MY_PROFILE': reply = await handleMyProfile(user); break;
      case 'MY_LEAVE_BALANCE': reply = await handleMyLeaveBalance(user); break;
      case 'LEAVE_APPROVER': reply = handleLeaveApprover(); break;
      case 'IS_LATE_DEDUCTED': reply = await handleIsLateDeducted(); break;
      case 'LATE_PENALTY_RULE': reply = await handleLatePenaltyRule(); break;
      case 'MY_ATTENDANCE_YESTERDAY': reply = await handleMyAttendanceYesterday(user, entities); break;
      case 'HR_POLICY_SUMMARY': reply = handlePolicySummary(); break;
      default:
        // Fallback: Câu hỏi về thông tin cá nhân/hồ sơ của tôi → MY_PROFILE
        if (/(thông tin cá nhân|hồ sơ|profile)/i.test(text) && 
            /(của tôi|của tui|của mình|tôi|tui|mình)\b/i.test(text) &&
            !/nhân\s*viên/i.test(text)) {
          reply = await handleMyProfile(user);
        }
        // Fallback: Câu hỏi về tổng lương/quỹ lương → TOTAL_PAYROLL
        else if (/(tổng lương|quỹ lương|chi phí lương|lương tổng)/i.test(text) && 
                 (/(tháng này|tháng \d+|tất cả|toàn công ty|toàn bộ)/i.test(text) || 
                  /bao nhiêu/i.test(text))) {
          reply = await handleTotalPayroll(user, entities);
        }
        // Fallback: Câu hỏi về quy định giờ OT → HR_POLICY_SUMMARY
        else if (/(quy định giờ ot|giờ ot|ot bắt đầu|giờ làm thêm|chính sách ot|quy định về ot)/i.test(text)) {
          reply = handlePolicySummary();
        }
        // Fallback: Nếu câu có "hôm qua" và "tui/tôi" và "check in/điểm danh" → MY_ATTENDANCE_YESTERDAY
        else if (/(hom qua|hôm qua|yesterday)/i.test(text) &&
          /(toi|tui|m[iì]nh|t[ôo]i|em)\b/i.test(text) &&
          /(da|đã|chưa|chua|check|diem danh|điểm danh|cham cong|chấm công)/i.test(text)) {
          reply = await handleMyAttendanceYesterday(user, entities);
        }
        // Fallback: Nếu câu có "lương" và "nhân viên" → thử coi như EMPLOYEE_SALARY
        // NHƯNG không phải nếu có từ khóa check-in/điểm danh
        else if (/l[ươ]ng|b[ả]ng l[ươ]ng/i.test(text) && /nhân\s*viên/i.test(text) && !/(toi|tui|minh|cua toi|của tôi|m[iì]nh|t[ôo]i|em)\b/i.test(text) &&
          !/(checkin|check\s*in|diem danh|điểm danh|cham cong|chấm công)/i.test(text)) {
          // Thử extract lại một lần nữa
          const extractedName = pickEmployeeName(text);
          const extractedCode = pickEmployeeCode(toASCII(text), text);
          if (extractedName || extractedCode) {
            entities.employeeName = extractedName || entities.employeeName;
            entities.employeeCode = extractedCode || entities.employeeCode;
            reply = await handleEmployeeSalary(user, entities, text);
          } else {
            reply = helpText();
          }
        }
        // Nếu câu có "lương ... của ..." hoặc mã NV → thử coi như EMPLOYEE_SALARY
        // NHƯNG không phải nếu có từ khóa check-in/điểm danh
        else if ((/l[ươ]ng|b[ả]ng l[ươ]ng/i.test(text) && /c[ủ]a\s+/i.test(text)) ||
          (/\b(EMP|NV)\s*\d{2,6}\b/i.test(text) && !/(checkin|check\s*in|diem danh|điểm danh|cham cong|chấm công)/i.test(text))) {
          reply = await handleEmployeeSalary(user, entities, text);
        }
        // Fallback: Nếu có mã nhân viên + check-in/điểm danh → EMPLOYEE_ATTENDANCE_BY_CODE
        else if (/\b(EMP|NV)\s*\d{2,6}\b/i.test(text) &&
          /(checkin|check\s*in|diem danh|điểm danh|cham cong|chấm công|da|đã|chưa)/i.test(text) &&
          !/l[ươ]ng|b[ả]ng l[ươ]ng/i.test(text)) {
          const extractedCode = pickEmployeeCode(toASCII(text), text);
          if (extractedCode) {
            entities.employeeCode = extractedCode;
            reply = await handleEmployeeAttendanceByCode(user, entities, text);
          } else {
            reply = helpText();
          }
        }
        else reply = helpText();
    }

    res.json({ reply, intent, entities });
  } catch (err) {
    console.error('[chatController] error', err);
    res.status(500).json({ error: 'Lỗi xử lý chat', detail: err.message });
  }
};
