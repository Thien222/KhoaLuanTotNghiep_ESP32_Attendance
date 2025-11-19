const OpenAI = require("openai");
const LLM_ENABLED = (process.env.OPENAI_ENABLED || 'true') !== 'false';
const hasKey = !!process.env.OPENAI_API_KEY && LLM_ENABLED;
const client = hasKey ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
let breakerUntil = 0;
const safeJSON = s => { try { return JSON.parse(s); } catch { return null; } };

/** Examples cho các intent chính (chọn lọc, không cần quá dài để tiết kiệm token) */
const EX = {
  MY_SALARY: [
    "lương của tôi tháng này",
    "bảng lương tháng 10 của tôi",
    "thu nhập tháng này của tui",
    "tháng này net của tôi là bao nhiêu",
    "lương tháng 12 của tôi tính giùm"
  ],
  WHAT_IF_LEAVE: [
    "nếu tôi nghỉ 2 ngày thì lương tháng này còn bao nhiêu",
    "giả sử nghỉ 3 ngày thì lương tháng này thế nào",
    "nếu nghỉ thêm 2 ngày nữa thì lương tháng 10",
    "nghỉ 1 bữa có bị trừ nhiều không",
    "tính hộ nếu nghỉ 2 ngày"
  ],
  TOTAL_PAYROLL: [
    "tổng lương tháng 9 của tất cả nhân viên",
    "quỹ lương tháng này là bao nhiêu",
    "tháng 10 tổng tiền lương toàn công ty",
    "chi phí lương tháng 11",
    "tổng payroll tháng này"
  ],
  CHECKED_IN_ON_DATE: [
    "hôm nay ai đã điểm danh rồi",
    "checkin ngày 2025-11-12 có những ai",
    "ai đã chấm công buổi sáng nay",
    "danh sách đã điểm danh hôm nay",
    "today checked in list"
  ],
  UNATTENDED_TODAY: [
    "hôm nay ai chưa điểm danh",
    "danh sách chưa chấm công hôm nay",
    "những ai chưa checkin",
    "ai còn thiếu điểm danh hôm nay",
    "chưa có mặt hôm nay là ai"
  ],
  MY_ATTENDANCE_TODAY: [
    "hôm nay tôi đã điểm danh chưa",
    "tui đã chấm công chưa",
    "coi giùm mình có chấm công chưa",
    "nay tôi có log checkin chưa",
    "đã chấm công của tôi hôm nay chưa"
  ],
  TODAY_DATE: [
    "hôm nay là ngày mấy",
    "nay ngày bao nhiêu vậy",
    "bữa nay ngày mấy",
    "today is what date",
    "date today"
  ],
  EMPLOYEE_SALARY: [
    "lương EMP030 tháng 10",
    "lương tháng 9 của nhân viên Nguyễn Văn A",
    "xem lương tháng 8 của bạn Lê Văn C",
    "lương bạn Phương tháng này",
    "lương của mã NV015 tháng này"
  ],
  EMPLOYEE_INFO: [
    "nhân viên EMP030 là ai",
    "thông tin của mã EMP015",
    "cho xem hồ sơ EMP100",
    "ai là NV012",
    "profile của mã EMP120"
  ],
  MY_PROFILE: [
    "hồ sơ của tôi",
    "my profile",
    "thông tin nhân viên của tôi",
    "profile của tui",
    "xem thông tin của tôi"
  ],
  MY_LEAVE_BALANCE: [
    "số ngày phép còn lại của tôi",
    "leave balance của mình",
    "còn bao nhiêu ngày phép",
    "ngày phép còn lại",
    "tôi còn phép không"
  ],
  LEAVE_APPROVER: [
    "xin nghỉ cần duyệt của ai",
    "đơn phép do ai duyệt",
    "ai phê duyệt đơn nghỉ",
    "ai duyệt đơn phép",
    "quy trình duyệt nghỉ là gì"
  ],
  IS_LATE_DEDUCTED: [
    "đi trễ có bị trừ lương không",
    "đi muộn có bị trừ tiền không",
    "đi trễ có khấu trừ?",
    "đi muộn bị trừ lương chứ",
    "đi trễ có sao không"
  ],
  LATE_PENALTY_RULE: [
    "mức phạt đi muộn",
    "đi muộn phạt thế nào",
    "đi trễ phạt bao nhiêu",
    "quy định phạt đi trễ",
    "đi muộn tính phạt ra sao"
  ],
  HR_POLICY_SUMMARY: [
    "tổng hợp chính sách nhân sự",
    "policy nghỉ phép",
    "quy định OT",
    "đi trễ/ về sớm tính sao",
    "quy định chấm công giờ nghỉ trưa"
  ]
};

const MAP_INTENT = Object.fromEntries(Object.keys(EX).map(k => [k,k]));

function buildFewShot() {
  const lines = [];
  for (const [k, arr] of Object.entries(EX))
    for (const q of arr) lines.push(`- ${MAP_INTENT[k]} :: ${q}`);
  return lines.join("\n");
}

async function classifyIntent({ text, user }) {
  const now = Date.now();
  if (!client || now < breakerUntil) return null;

  const system = `
Bạn là NLU tiếng Việt cho hệ thống HR. Trả về JSON duy nhất:
{
  "intent": "MY_SALARY | WHAT_IF_LEAVE | TOTAL_PAYROLL | CHECKED_IN_ON_DATE | UNATTENDED_TODAY | MY_ATTENDANCE_TODAY | TODAY_DATE | EMPLOYEE_SALARY | EMPLOYEE_INFO | MY_PROFILE | MY_LEAVE_BALANCE | LEAVE_APPROVER | IS_LATE_DEDUCTED | LATE_PENALTY_RULE | HR_POLICY_SUMMARY | UNKNOWN",
  "entities": { "month": <1..12>, "year": <YYYY>, "dateISO": "YYYY-MM-DD", "days": <int>, "employeeName": "<string>", "employeeCode": "<EMP###>" }
}
- Có ngày (YYYY-MM-DD hoặc YYYY/MM/DD) → "dateISO".
- Có “tháng X” → "month".
- “nếu nghỉ X ngày” → "days".
- Không thêm chữ ngoài JSON.
Ví dụ map:
${buildFewShot()}
`.trim();

  try {
    const resp = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.1,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Utterance: ${text}\nUserRole: ${user?.role || 'employee'}` },
      ],
      timeout: 10000,
    });
    const raw = resp.choices?.[0]?.message?.content || "{}";
    const parsed = safeJSON(raw) || {};
    return { intent: String(parsed.intent || 'UNKNOWN').toUpperCase(), entities: parsed.entities || {} };
  } catch (err) {
    if (err?.status === 429 || err?.code === 'insufficient_quota')
      breakerUntil = Date.now() + 15 * 60 * 1000;
    return null;
  }
}

module.exports = { classifyIntent };
