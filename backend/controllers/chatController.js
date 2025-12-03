const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance'); // giữ nguyên model Attendance của bạn
const Payroll = require('../models/Payroll');       // snapshot bảng lương theo tháng
const { detectIntentAndEntities, toASCII, pickEmployeeName, pickEmployeeCode } = require('../services/nlu');
const { classifyIntent } = require('../services/llm');

// ===== Commons =====
function dayRange(dateISO) {
  const start = new Date(dateISO + 'T00:00:00.000Z');
  const end   = new Date(dateISO + 'T23:59:59.999Z');
  return { start, end };
}
function monthRange(year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end   = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
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

/** Ưu tiên snapshot bảng lương nếu đã có; nếu chưa thì fallback Employee.salary + Attendance */
async function computeSalaryFor(emp, year, month, extraLeaveDays = 0) {
  // 1) Ưu tiên snapshot payrolls (format month: "YYYY-MM")
  const monthStr = `${year}-${String(month).padStart(2, '0')}`; // "2025-08"
  const snap = await Payroll.findOne({ employee: emp._id, month: monthStr }).lean();
  if (snap) {
    // Đọc các trường từ Payroll model
    const baseSalaryFull = Number(emp.baseSalary || emp.salary || 0); // Lương cơ bản đầy đủ
    const base = Number(snap.baseSalary || 0); // Lương theo ngày công thực tế
    const netSalary = Number(snap.netSalary || snap.totalSalary || 0); // Lương thực lãnh
    const workingDays = Number(snap.workingDays || 0);
    const overtimeHours = Number(snap.overtimeHours || 0);
    const overtimePay = Number(snap.overtimePay || 0);
    const latePenalty = Number(snap.latePenalty || 0);
    const generalAllowance = Number(snap.generalAllowance || 0);
    const taxAmount = Number(snap.taxAmount || 0);
    const totalDeductions = Number(snap.totalDeductions || 0);
    
    // Tính daily rate từ lương cơ bản đầy đủ / 30
    const dailyRate = baseSalaryFull / 30;
    
    // Nếu có extraLeaveDays (what-if), trừ thêm theo đơn giá ngày để dự báo
    const totalLeave = Number(snap.absentDays || 0) + Number(snap.unpaidLeaveDays || 0) + Number(extraLeaveDays || 0);
    const total = netSalary > 0 
      ? Math.max(0, netSalary - dailyRate * Number(extraLeaveDays || 0))
      : base;

    return {
      mode: 'snapshot',
      baseSalaryFull,   // Lương cơ bản đầy đủ
      base,             // Lương theo ngày công
      netSalary,        // Lương thực lãnh
      dailyRate,
      workingDays,
      overtimeHours,
      overtimePay,
      latePenalty,
      generalAllowance,
      taxAmount,
      totalDeductions,
      leaveDays: Number(snap.absentDays || 0),
      extraLeaveDays,
      totalLeave,
      hours: Number(snap.overtimeHours || 0),
      total             // Lương thực lãnh (sau khi trừ what-if nếu có)
    };
  }

  // 2) Fallback tính theo Employee.salary + giờ công thực tế
  const hourly = Number(emp.hourlyRate || 0);
  if (hourly > 0) {
    const { start, end } = monthRange(year, month);
    const docs = await Attendance.find(
      { employee: emp._id, date: { $gte: start, $lt: end } },
      'workingHours checkIn checkOut'
    ).lean();

    let hours = 0;
    if (docs.length && docs.some(d => d.workingHours != null))
      hours = docs.reduce((s, d) => s + Number(d.workingHours || 0), 0);
    else {
      for (const d of docs) {
        const inT  = d?.checkIn?.time ? new Date(d.checkIn.time) : null;
        const outT = d?.checkOut?.time ? new Date(d.checkOut.time) : null;
        if (inT && outT && outT > inT) hours += (outT - inT) / 3600000;
      }
    }
    return { mode: 'hourly', base: hourly, hours, dailyRate: 0, leaveDays: 0, total: hours * hourly };
  }

  /** Employee.salary là Number theo schema gốc (default 0) — dùng làm lương cơ bản fallback. */
  const baseSalary = Number(emp.salary || 0); // schema Employee.salary (Number) :contentReference[oaicite:2]{index=2}
  const wd = Number(emp.workingDaysPerMonth || 26);
  const dailyRate = wd ? baseSalary / wd : 0;

  // tạm thời không trừ vắng vì không có snapshot; nếu muốn có thể tính từ Attendance.status ('absent','half-day')
  const net = Math.max(0, baseSalary - dailyRate * Number(extraLeaveDays || 0));
  return { mode: 'daily', base: baseSalary, wd, dailyRate, leaveDays: 0, extraLeaveDays, totalLeave: extraLeaveDays || 0, hours: 0, total: net };
}

function isPrivileged(user) {
  // Roles trong schema: employee | accountant | manager  :contentReference[oaicite:3]{index=3}
  return user && user.role && user.role !== 'employee';
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
    // Có dữ liệu từ Payroll - hiển thị chi tiết
    const parts = [
      `Lương ${month}/${year} của bạn:`,
      `• Lương cơ bản: ${fmtVND(info.baseSalaryFull || info.base)}`,
      `• Lương ngày công (${info.workingDays || 0} ngày): ${fmtVND(info.base)}`,
    ];
    if (info.generalAllowance > 0) parts.push(`• Phụ cấp: +${fmtVND(info.generalAllowance)}`);
    if (info.overtimePay > 0) parts.push(`• OT (${info.overtimeHours || 0}h): +${fmtVND(info.overtimePay)}`);
    if (info.latePenalty > 0) parts.push(`• Phạt: -${fmtVND(info.latePenalty)}`);
    if (info.taxAmount > 0) parts.push(`• Thuế: -${fmtVND(info.taxAmount)}`);
    parts.push(`→ Thực lãnh: ${fmtVND(info.netSalary || info.total)}`);
    return parts.join('\n');
  }
  return `Lương ${month}/${year} của bạn: ${fmtVND(info.total)} (cơ bản ${fmtVND(info.base)}, nghỉ ${info.totalLeave || 0} ngày, đơn giá/ngày ${fmtVND(info.dailyRate)}).`;
}

async function handleWhatIfLeave(user, entities) {
  const now = new Date();
  const year = entities.year || now.getFullYear();
  const month = entities.month || now.getMonth() + 1;
  const more = Math.max(0, Number(entities.days ?? 1));

  const me = await resolveMe(user);
  if (!me) return 'Không tìm thấy hồ sơ nhân viên của bạn.';

  const info = await computeSalaryFor(me, year, month, more);
  if (info.mode === 'hourly') {
    return `Bạn tính lương theo giờ (${fmtVND(info.base)}/h). Tạm tính nếu nghỉ thêm ${more} ngày → ${fmtVND(info.total)} (giờ hiện tại: ${info.hours.toFixed(2)}h).`;
  }
  return `Nếu nghỉ thêm ${more} ngày trong ${month}/${year}, lương tạm tính: ${fmtVND(info.total)} (tổng nghỉ ${info.totalLeave} ngày, đơn giá/ngày ${fmtVND(info.dailyRate)}).`;
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
    // Có dữ liệu từ Payroll - hiển thị chi tiết
    const parts = [
      `Lương ${month}/${year} của ${emp.name}${codePart}:`,
      `• Lương cơ bản: ${fmtVND(info.baseSalaryFull || info.base)}`,
      `• Lương ngày công (${info.workingDays || 0} ngày): ${fmtVND(info.base)}`,
    ];
    if (info.generalAllowance > 0) parts.push(`• Phụ cấp: +${fmtVND(info.generalAllowance)}`);
    if (info.overtimePay > 0) parts.push(`• OT (${info.overtimeHours || 0}h): +${fmtVND(info.overtimePay)}`);
    if (info.latePenalty > 0) parts.push(`• Phạt: -${fmtVND(info.latePenalty)}`);
    if (info.taxAmount > 0) parts.push(`• Thuế: -${fmtVND(info.taxAmount)}`);
    parts.push(`→ Thực lãnh: ${fmtVND(info.netSalary || info.total)}`);
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

  const emps = await Employee.find({ status: 'active' }, '_id name salary');
  let total = 0;
  for (const e of emps) {
    const { total: t } = await computeSalaryFor(e, year, month, 0);
    total += t;
  }
  return `Tổng lương ${month}/${year} của toàn bộ nhân viên: ${fmtVND(total)}.`;
}

async function handleCheckedInOnDate(user, entities) {
  if (!isPrivileged(user)) return 'Bạn không có quyền xem danh sách điểm danh.';
  const dateISO = entities.dateISO || new Date().toISOString().slice(0,10);
  const { start, end } = dayRange(dateISO);
  const attendedIds = await Attendance.distinct('employee', { date: { $gte: start, $lt: end } });
  const attended = await Employee.find({ _id: { $in: attendedIds } }, 'name').lean();
  if (!attended.length) return `Chưa có ai điểm danh ngày ${dateISO}.`;
  return `Đã điểm danh ${dateISO} (${attended.length}): ${attended.map(x=>x.name).join(', ')}`;
}

async function handleUnattendedToday(user, entities) {
  if (!isPrivileged(user)) return 'Bạn không có quyền xem danh sách điểm danh.';
  const dateISO = entities.dateISO || new Date().toISOString().slice(0,10);
  const { start, end } = dayRange(dateISO);
  const active = await Employee.find({ status: 'active' }, '_id name').lean();
  const attendedIds = await Attendance.distinct('employee', { date: { $gte: start, $lt: end } });
  const missing = active.filter(e => !attendedIds.find(id => String(id) === String(e._id)));
  if (!missing.length) return `Tất cả nhân viên đều đã điểm danh ngày ${dateISO}`;
  return `Chưa điểm danh ${dateISO} (${missing.length}): ${missing.map(x=>x.name).join(', ')}`;
}

async function handleMyAttendanceToday(user, entities) {
  const me = await resolveMe(user);
  if (!me) return 'Không tìm thấy hồ sơ nhân viên của bạn.';

  const dateISO = entities.dateISO || new Date().toISOString().slice(0,10);
  const { start, end } = dayRange(dateISO);
  const has = await Attendance.exists({ employee: me._id, date: { $gte: start, $lt: end } });
  if (has) return `Bạn ĐÃ điểm danh ngày ${dateISO}.`;
  return `Bạn CHƯA điểm danh ngày ${dateISO}.`;
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

  const dateISO = entities.dateISO || new Date().toISOString().slice(0,10);
  const { start, end } = dayRange(dateISO);
  const has = await Attendance.exists({ employee: emp._id, date: { $gte: start, $lt: end } });
  
  if (has) return `Nhân viên ${emp.name} (${code}) ĐÃ điểm danh ngày ${dateISO}.`;
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
    (me.bankAccount?.bankName && me.bankAccount?.accountNumber) ? `• Tài khoản: ${me.bankAccount.bankName} – ${me.bankAccount.accountNumber}` : null
  ].filter(Boolean).join('\n');
}

async function handleMyLeaveBalance(user) {
  const me = await resolveMe(user);
  if (!me) return 'Không tìm thấy hồ sơ nhân viên của bạn.';
  const annual = Number(me.annualLeaveDays || 0);   // từ schema Employee  :contentReference[oaicite:4]{index=4}
  const used   = Number(me.usedLeaveDays   || 0);   // từ schema Employee  :contentReference[oaicite:5]{index=5}
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
function handleIsLateDeducted() {
  return 'Mặc định: đi trễ có thể bị khấu trừ theo chính sách công ty (tuỳ cấu hình). Nếu đã có bảng chính sách cụ thể, mình sẽ lấy đúng mức khấu trừ để trả lời.';
}
function handleLatePenaltyRule() {
  return 'Quy định phạt đi trễ (mặc định): <15 phút: nhắc nhở; 15–60 phút: phạt cố định; >60 phút: tính 1/2 ngày công. Hãy cập nhật bảng chính sách để mình trả lời đúng con số.';
}
function handlePolicySummary() {
  return [
    'Tổng hợp chính sách nhân sự (mặc định):',
    '• Nghỉ phép năm: 12 ngày/năm (tích luỹ theo tháng).',
    '• OT: tính theo hệ số 150%/200%/300% tuỳ khung giờ.',
    '• Đi trễ/ về sớm: có thể bị phạt hoặc trừ lương theo quy định.',
    '• Chấm công: điểm danh khi vào/ra, nghỉ trưa không tính công.',
    '→ Bạn có thể hỏi: "nếu tôi nghỉ 2 ngày thì lương còn bao nhiêu?", "checkin ngày 2025-11-12 có những ai", "số ngày phép còn lại của tôi"...'
  ].join('\n');
}

function helpText() {
  return [
    'Mình hiểu các câu:',
    '• “Lương của tôi tháng này”, “nếu tôi nghỉ 2 ngày thì lương còn bao nhiêu?”',
    '• “Lương EMP030 tháng 10”, “thông tin của mã EMP015”',
    '• “Hôm nay ai đã/ chưa điểm danh?”, “checkin ngày YYYY-MM-DD có những ai”',
    '• “Tổng lương tháng 9 của tất cả nhân viên?”',
    '• “Hồ sơ của tôi”, “số ngày phép còn lại của tôi”, “xin nghỉ cần duyệt của ai”',
    '• “mức phạt đi muộn”, “đi trễ có bị trừ lương không”, “tổng hợp chính sách nhân sự”'
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
      case 'MY_SALARY':             reply = await handleMySalary(user, entities); break;
      case 'WHAT_IF_LEAVE':         reply = await handleWhatIfLeave(user, entities); break;
      case 'EMPLOYEE_SALARY':       reply = await handleEmployeeSalary(user, entities, text); break;
      case 'EMPLOYEE_INFO':         reply = await handleEmployeeInfo(user, entities); break;
      case 'TOTAL_PAYROLL':         reply = await handleTotalPayroll(user, entities); break;
      case 'CHECKED_IN_ON_DATE':    reply = await handleCheckedInOnDate(user, entities); break;
      case 'UNATTENDED_TODAY':      reply = await handleUnattendedToday(user, entities); break;
      case 'MY_ATTENDANCE_TODAY':   reply = await handleMyAttendanceToday(user, entities); break;
      case 'TODAY_DATE':            reply = `Hôm nay là ${new Date().toISOString().slice(0,10)}.`; break;
      case 'EMPLOYEE_ATTENDANCE_BY_CODE': reply = await handleEmployeeAttendanceByCode(user, entities, text); break;
      case 'MY_PROFILE':            reply = await handleMyProfile(user); break;
      case 'MY_LEAVE_BALANCE':      reply = await handleMyLeaveBalance(user); break;
      case 'LEAVE_APPROVER':        reply = handleLeaveApprover(); break;
      case 'IS_LATE_DEDUCTED':      reply = handleIsLateDeducted(); break;
      case 'LATE_PENALTY_RULE':     reply = handleLatePenaltyRule(); break;
      case 'HR_POLICY_SUMMARY':     reply = handlePolicySummary(); break;
      default:
        // Fallback: Nếu câu có "lương" và "nhân viên" → thử coi như EMPLOYEE_SALARY
        if (/l[ươ]ng|b[ả]ng l[ươ]ng/i.test(text) && /nhân\s*viên/i.test(text) && !/(toi|tui|minh|cua toi|của tôi|m[iì]nh|t[ôo]i|em)\b/i.test(text)) {
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
        else if ((/l[ươ]ng|b[ả]ng l[ươ]ng/i.test(text) && /c[ủ]a\s+/i.test(text)) || /\b(EMP|NV)\s*\d{2,6}\b/i.test(text)) {
          reply = await handleEmployeeSalary(user, entities, text);
        }
        else reply = helpText();
    }

    res.json({ reply, intent, entities });
  } catch (err) {
    console.error('[chatController] error', err);
    res.status(500).json({ error: 'Lỗi xử lý chat', detail: err.message });
  }
};
