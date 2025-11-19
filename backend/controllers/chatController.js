const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance'); // giữ nguyên model Attendance của bạn
const Payroll = require('../models/Payroll');       // snapshot bảng lương theo tháng
const { detectIntentAndEntities, toASCII } = require('../services/nlu');
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
  // 1) Ưu tiên snapshot payrolls
  const snap = await Payroll.findOne({ employee: emp._id, year, month }).lean();
  if (snap) {
    // Nếu có extraLeaveDays (what-if), trừ thêm theo đơn giá ngày để dự báo
    const base = Number(snap.basicSalary || emp.salary || 0);
    const wd   = Number(emp.workingDaysPerMonth || 26);
    const dailyRate = wd ? base / wd : 0;
    const totalLeave = Number(snap.leaveDays || 0) + Number(extraLeaveDays || 0);
    const total = (typeof snap.totalSalary === 'number')
      ? Math.max(0, snap.totalSalary - dailyRate * Number(extraLeaveDays || 0))
      : Math.max(0, base - dailyRate * totalLeave);

    return {
      mode: 'snapshot',
      base, wd, dailyRate,
      leaveDays: Number(snap.leaveDays || 0),
      extraLeaveDays,
      totalLeave,
      hours: Number(snap.workingHours || 0),
      total
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
    return `Lương **${month}/${year}** của bạn: **${fmtVND(info.total)}** (giờ: ${info.hours.toFixed(2)}h × ${fmtVND(info.base)}/h).`;
  }
  return `Lương **${month}/${year}** của bạn: **${fmtVND(info.total)}** (cơ bản ${fmtVND(info.base)}, nghỉ ${info.totalLeave || 0} ngày, đơn giá/ngày ${fmtVND(info.dailyRate)}).`;
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
    return `Bạn tính lương theo giờ (${fmtVND(info.base)}/h). Tạm tính nếu nghỉ thêm **${more} ngày** → **${fmtVND(info.total)}** (giờ hiện tại: ${info.hours.toFixed(2)}h).`;
  }
  return `Nếu nghỉ thêm **${more} ngày** trong **${month}/${year}**, lương tạm tính: **${fmtVND(info.total)}** (tổng nghỉ ${info.totalLeave} ngày, đơn giá/ngày ${fmtVND(info.dailyRate)}).`;
}

async function handleEmployeeSalary(user, entities, rawText) {
  const privileged = isPrivileged(user);
  let name = (entities.employeeName || '').trim();
  const code = (entities.employeeCode || '').trim();

  if (!privileged && !name && !code) {
    return handleMySalary(user, entities);
  }
  if (!privileged && (name || code) && toASCII(name || '') !== toASCII(String(user.name || ''))) {
    return '❌ Bạn không có quyền xem lương của người khác.';
  }

  const now = new Date();
  const year = entities.year || now.getFullYear();
  const month = entities.month || now.getMonth() + 1;

  let emp = null;
  if (code) emp = await Employee.findOne({ $or: [{ employeeId: code }, { code }, { empCode: code }] });
  if (!emp && name) emp = await Employee.findOne({ name }).collation({ locale: 'vi', strength: 1 });
  if (!emp) emp = await resolveMe(user);

  if (!emp) return `Không tìm thấy nhân viên "${name || code || user.name}".`;

  const info = await computeSalaryFor(emp, year, month, 0);
  if (info.mode === 'hourly') {
    return `Lương **${month}/${year}** của **${emp.name}**: **${fmtVND(info.total)}** (giờ: ${info.hours.toFixed(2)}h × ${fmtVND(info.base)}/h).`;
  }
  return `Lương **${month}/${year}** của **${emp.name}**: **${fmtVND(info.total)}** (cơ bản ${fmtVND(info.base)}, nghỉ ${info.totalLeave || 0} ngày, đơn giá/ngày ${fmtVND(info.dailyRate)}).`;
}

async function handleEmployeeInfo(user, entities) {
  const privileged = isPrivileged(user);
  const code = (entities.employeeCode || '').trim();

  if (!privileged) {
    const me = await resolveMe(user);
    if (!me) return 'Không tìm thấy hồ sơ nhân viên của bạn.';
    return [
      `👤 **${me.name}** (${me.employeeId || me.code || '—'})`,
      me.position ? `• Chức danh: ${me.position}` : null,
      me.department ? `• Phòng ban: ${me.department}` : null,
      `• Lương cơ bản (hồ sơ): ${fmtVND(me.salary || 0)}`
    ].filter(Boolean).join('\n');
  }

  let emp = null;
  if (code) emp = await Employee.findOne({ $or: [{ employeeId: code }, { code }, { empCode: code }] });
  if (!emp) return `Không tìm thấy nhân viên với mã cung cấp.`;

  return [
    `👤 **${emp.name}** (${emp.employeeId || emp.code || '—'})`,
    emp.position ? `• Chức danh: ${emp.position}` : null,
    emp.department ? `• Phòng ban: ${emp.department}` : null,
    `• Lương cơ bản (hồ sơ): ${fmtVND(emp.salary || 0)}`
  ].filter(Boolean).join('\n');
}

async function handleTotalPayroll(user, entities) {
  if (!isPrivileged(user)) return '❌ Chỉ kế toán/manager mới xem được tổng lương.';

  const now = new Date();
  const year = entities.year || now.getFullYear();
  const month = entities.month || now.getMonth() + 1;

  const emps = await Employee.find({ status: 'active' }, '_id name salary');
  let total = 0;
  for (const e of emps) {
    const { total: t } = await computeSalaryFor(e, year, month, 0);
    total += t;
  }
  return `Tổng lương **${month}/${year}** của toàn bộ nhân viên: **${fmtVND(total)}**.`;
}

async function handleCheckedInOnDate(user, entities) {
  if (!isPrivileged(user)) return '❌ Bạn không có quyền xem danh sách điểm danh.';
  const dateISO = entities.dateISO || new Date().toISOString().slice(0,10);
  const { start, end } = dayRange(dateISO);
  const attendedIds = await Attendance.distinct('employee', { date: { $gte: start, $lt: end } });
  const attended = await Employee.find({ _id: { $in: attendedIds } }, 'name').lean();
  if (!attended.length) return `Chưa có ai điểm danh ngày ${dateISO}.`;
  return `Đã điểm danh **${dateISO}** (${attended.length}): ${attended.map(x=>x.name).join(', ')}`;
}

async function handleUnattendedToday(user, entities) {
  if (!isPrivileged(user)) return '❌ Bạn không có quyền xem danh sách điểm danh.';
  const dateISO = entities.dateISO || new Date().toISOString().slice(0,10);
  const { start, end } = dayRange(dateISO);
  const active = await Employee.find({ status: 'active' }, '_id name').lean();
  const attendedIds = await Attendance.distinct('employee', { date: { $gte: start, $lt: end } });
  const missing = active.filter(e => !attendedIds.find(id => String(id) === String(e._id)));
  if (!missing.length) return `Tất cả nhân viên đều đã điểm danh ngày ${dateISO} ✅`;
  return `Chưa điểm danh **${dateISO}** (${missing.length}): ${missing.map(x=>x.name).join(', ')}`;
}

async function handleMyAttendanceToday(user, entities) {
  const me = await resolveMe(user);
  if (!me) return 'Không tìm thấy hồ sơ nhân viên của bạn.';

  const dateISO = entities.dateISO || new Date().toISOString().slice(0,10);
  const { start, end } = dayRange(dateISO);
  const has = await Attendance.exists({ employee: me._id, date: { $gte: start, $lt: end } });
  if (has) return `✅ Bạn **ĐÃ** điểm danh ngày **${dateISO}**.`;
  return `❌ Bạn **CHƯA** điểm danh ngày **${dateISO}**.`;
}

async function handleMyProfile(user) {
  const me = await resolveMe(user);
  if (!me) return 'Không tìm thấy hồ sơ nhân viên của bạn.';
  return [
    `👤 **${me.name}** (${me.employeeId || me.code || '—'})`,
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
  return `Bạn có **${annual} ngày phép/năm**, đã dùng **${used}**, còn lại **${remain}**.`;
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
  return 'Mặc định: **đi trễ có thể bị khấu trừ** theo chính sách công ty (tuỳ cấu hình). Nếu đã có bảng chính sách cụ thể, mình sẽ lấy đúng mức khấu trừ để trả lời.';
}
function handleLatePenaltyRule() {
  return 'Quy định phạt đi trễ (mặc định): <15 phút: nhắc nhở; 15–60 phút: phạt cố định; >60 phút: tính **1/2 ngày công**. Hãy cập nhật bảng chính sách để mình trả lời đúng con số.';
}
function handlePolicySummary() {
  return [
    '📝 **Tổng hợp chính sách nhân sự (mặc định):**',
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
      case 'TODAY_DATE':            reply = `Hôm nay là **${new Date().toISOString().slice(0,10)}**.`; break;
      case 'MY_PROFILE':            reply = await handleMyProfile(user); break;
      case 'MY_LEAVE_BALANCE':      reply = await handleMyLeaveBalance(user); break;
      case 'LEAVE_APPROVER':        reply = handleLeaveApprover(); break;
      case 'IS_LATE_DEDUCTED':      reply = handleIsLateDeducted(); break;
      case 'LATE_PENALTY_RULE':     reply = handleLatePenaltyRule(); break;
      case 'HR_POLICY_SUMMARY':     reply = handlePolicySummary(); break;
      default:
        // Nếu câu có "lương ... của ..." hoặc mã NV → thử coi như EMPLOYEE_SALARY
        if ((/l[ươ]ng|b[ả]ng l[ươ]ng/i.test(text) && /c[ủ]a\s+/i.test(text)) || /\b(EMP|NV)\s*\d{2,6}\b/i.test(text))
          reply = await handleEmployeeSalary(user, entities, text);
        else reply = helpText();
    }

    res.json({ reply, intent, entities });
  } catch (err) {
    console.error('[chatController] error', err);
    res.status(500).json({ error: 'Lỗi xử lý chat', detail: err.message });
  }
};
