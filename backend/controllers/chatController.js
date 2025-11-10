// backend/controllers/chatController.js
const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');

// Nếu đã có 2 service dưới đây thì bỏ comment; chưa có thì cứ để mặc định mình set ở dưới.
// const { loadPolicy } = require('../services/policy');
// const { retrievePolicySnippets } = require('../services/rag');
const { detectIntent, parseMonthText, monthKey, parseDateText } = require('../services/nlu');

const elevatedRoles = new Set(['manager', 'admin', 'accountant']);

function getMonthRange(y, m) {
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const end   = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  return { start, end };
}

async function findEmployeeByNameOrCode(input) {
  if (!input) return null;
  let e = await Employee.findOne({ employeeId: input });
  if (e) return e;
  e = await Employee.findOne({ name: new RegExp(input, 'i') });
  return e;
}

function fmtVND(n) {
  try {
    return new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' VND';
  } catch {
    return `${Math.round(n)} VND`;
  }
}

async function countLeaveDays(employeeId, start, end) {
  return Attendance.countDocuments({
    employee: employeeId,
    date: { $gte: start, $lte: end },
    status: 'absent'
  });
}

async function calcNetForEmployee(emp, y, m, extraLeaveDays = 0) {
  // Nếu chưa có services/policy, dùng default policy này
  const policy = /* loadPolicy?.() || */ {
    working_days_per_month_default: 26,
    leave_deduction_per_day: 1.0,
    termination_if_exceed_leave: false,
    max_leave_days_per_month: 3
  };

  const base = Number(emp.baseSalary || 0); // nếu bạn dùng hourlyRate -> đổi cách tính
  const wd   = policy.working_days_per_month_default || 26;
  const { start, end } = getMonthRange(y, m);
  const leaveDays = (await countLeaveDays(emp._id, start, end)) + (extraLeaveDays || 0);
  const daily = wd ? base / wd : 0;
  const net = base - daily * leaveDays * (policy.leave_deduction_per_day || 1.0);

  return { base, wd, leaveDays, net, month: `${y}-${String(m).padStart(2, '0')}` };
}

exports.postMessage = async (req, res) => {
  try {
    // Nếu chưa bật auth, mình giả lập user admin để test
    const user = req.user || { role: 'admin', employee: null, name: 'Demo' };
    const text = String(req.body?.message || '').trim();
    if (!text) return res.status(400).json({ success: false, message: 'Thiếu message' });

    const intent = detectIntent(text);
    const isElevated = elevatedRoles.has(user.role);

    // 1) Lương của tôi
    if (intent.intent === 'MY_SALARY') {
      const { year, month } = parseMonthText(text);
      const me =
        (user.employee && await Employee.findById(user.employee)) ||
        await Employee.findOne({ name: user.name }) ||
        await Employee.findOne();
      if (!me) return res.json({ reply: 'Không tìm thấy hồ sơ nhân viên của bạn.', intent: 'MY_SALARY' });

      const info = await calcNetForEmployee(me, year, month, 0);
      return res.json({
        reply: `Lương của bạn tháng ${info.month}: ${fmtVND(info.net)} (cơ bản ${fmtVND(info.base)}, nghỉ ${info.leaveDays} ngày).`,
        intent: 'MY_SALARY'
      });
    }

    // 2) Lương nhân viên X
    if (intent.intent === 'EMPLOYEE_SALARY') {
      const { year, month } = parseMonthText(text);
      const target = await findEmployeeByNameOrCode(intent.employee);
      if (!target) return res.json({ reply: 'Không tìm thấy nhân viên cần tra cứu.', intent: 'EMPLOYEE_SALARY' });

      if (!isElevated && String(target._id) !== String(user.employee)) {
        return res.json({ reply: 'Bạn không có quyền xem lương của người khác.', intent: 'EMPLOYEE_SALARY' });
      }

      const info = await calcNetForEmployee(target, year, month, 0);
      return res.json({
        reply: `Lương của ${target.name} tháng ${info.month}: ${fmtVND(info.net)} (cơ bản ${fmtVND(info.base)}, nghỉ ${info.leaveDays} ngày).`,
        intent: 'EMPLOYEE_SALARY'
      });
    }

    // 3) Tổng lương tháng N
    if (intent.intent === 'TOTAL_PAYROLL') {
      if (!isElevated) return res.json({ reply: 'Chỉ kế toán/manager/admin mới xem được tổng lương.', intent: 'TOTAL_PAYROLL' });

      const { year, month } = parseMonthText(text);
      const list = await Employee.find({ status: 'active' }).select('_id name baseSalary');
      const results = await Promise.all(list.map(e => calcNetForEmployee(e, year, month, 0)));
      const total = results.reduce((s, r) => s + (r.net || 0), 0);
      return res.json({
        reply: `Tổng lương tháng ${monthKey({ year, month })} của toàn bộ nhân viên là ${fmtVND(total)}.`,
        intent: 'TOTAL_PAYROLL'
      });
    }

    // 4) Hôm nay ai chưa điểm danh
    if (intent.intent === 'UNATTENDED_TODAY') {
      if (!isElevated) return res.json({ reply: 'Chỉ kế toán/manager/admin mới hỏi được danh sách chưa điểm danh.', intent: 'UNATTENDED_TODAY' });

      const dateISO = parseDateText(text); // YYYY-MM-DD
      const start = new Date(dateISO + 'T00:00:00.000Z');
      const end   = new Date(dateISO + 'T23:59:59.999Z');

      const present = await Attendance.find({
        date: { $gte: start, $lte: end },
        status: { $in: ['present', 'half-day'] }
      }).select('employee');

      const presentIds = new Set(present.map(r => String(r.employee)));
      const employees  = await Employee.find({ status: 'active' }).select('_id name');
      const missing    = employees.filter(e => !presentIds.has(String(e._id)));

      if (!missing.length) return res.json({ reply: `Tất cả nhân viên đã điểm danh ngày ${dateISO}.`, intent: 'UNATTENDED_TODAY' });
      return res.json({ reply: `Chưa điểm danh ngày ${dateISO}: ${missing.map(m => m.name).join(', ')}.`, intent: 'UNATTENDED_TODAY' });
    }

    // 5) Nếu tôi nghỉ X ngày thì lương là bao nhiêu?
    if (intent.intent === 'WHAT_IF_LEAVE') {
      const { year, month } = parseMonthText(text);
      const days = Math.max(0, Math.round(intent.days || 1));
      const me =
        (user.employee && await Employee.findById(user.employee)) ||
        await Employee.findOne({ name: user.name }) ||
        await Employee.findOne();
      if (!me) return res.json({ reply: 'Không tìm thấy hồ sơ của bạn.', intent: 'WHAT_IF_LEAVE' });

      const info = await calcNetForEmployee(me, year, month, days);
      return res.json({
        reply: `Nếu bạn nghỉ thêm ${days} ngày trong ${info.month}, lương tạm tính: ${fmtVND(info.net)} (tổng nghỉ ${info.leaveDays} ngày).`,
        intent: 'WHAT_IF_LEAVE'
      });
    }

    // 6) Xin nghỉ (placeholder)
    if (intent.intent === 'REQUEST_LEAVE') {
      return res.json({ reply: "Bạn muốn xin nghỉ mấy ngày và từ ngày nào? (VD: 'Xin nghỉ 2 ngày từ 2025-10-24')", intent: 'REQUEST_LEAVE' });
    }

    // 7) Mặc định: gợi ý
    // const snippets = retrievePolicySnippets?.(text) || [];
    // const more = snippets.length ? ("\n\nTheo chính sách:\n" + snippets.map(s => `• ${s.snippet}`).join("\n\n")) : "";
    const more = '';
    return res.json({
      reply: `Mình có thể giúp về lương/chấm công/nghỉ phép. Bạn thử:\n- "Lương tháng này của tôi"\n- "Tổng lương tháng 9"\n- "Hôm nay có ai chưa điểm danh?"${more}`,
      intent: 'HELP'
    });

  } catch (err) {
    console.error('[chatController] error', err);
    return res.status(500).json({ success: false, message: 'Lỗi xử lý chat', error: err.message });
  }
};
