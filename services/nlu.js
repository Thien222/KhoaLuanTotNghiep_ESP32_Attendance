function normalizeVN(s) {
  const from = 'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ';
  const to   = 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyydAAAAAAAAAAAAAAAAAEEEEEEEEEEEIIIIIoooooooooooooooooUUUUUUUUUUYYYYYD';
  let out = '';
  for (let c of String(s||'')) {
    const idx = from.indexOf(c);
    out += idx >= 0 ? to[idx] : c;
  }
  return out.toLowerCase();
}

// Parse "tháng này", "tháng 9"
function parseMonthText(text) {
  const lower = String(text||'').toLowerCase();
  const now = new Date();
  if (lower.includes('tháng này')) return { year: now.getFullYear(), month: now.getMonth()+1 };
  const m = lower.match(/tháng\s*(\d{1,2})/);
  if (m) return { year: now.getFullYear(), month: parseInt(m[1], 10) };
  return { year: now.getFullYear(), month: now.getMonth()+1 };
}

function monthKey({year,month}) {
  return `${year}-${String(month).padStart(2,'0')}`;
}

function parseDateText(text) {
  const lower = String(text||'').toLowerCase();
  const now = new Date();
  if (lower.includes('hôm nay')) return now.toISOString().slice(0,10);
  const m = lower.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[0];
  return now.toISOString().slice(0,10);
}

function detectIntent(text) {
  const s = normalizeVN(text);
  if (s.includes('bang luong') || s.includes('luong thang')) {
    if (s.includes('cua toi') || s.includes('cua tao') || s.includes('cua t')) return { intent: 'MY_SALARY' };
    // cố gắng bắt tên "nhân viên X"
    const m = text.match(/nhân viên\s+([a-zA-Z0-9\s\.\-]+)/i);
    return { intent: 'EMPLOYEE_SALARY', employee: m ? m[1].trim() : null };
  }
  if (s.includes('tong luong')) return { intent: 'TOTAL_PAYROLL' };
  if (s.includes('chua diem danh') || s.includes('chua checkin') || s.includes('chua cham cong')) return { intent: 'UNATTENDED_TODAY' };
  if ((s.includes('xin nghi') || s.includes('nghi')) && (s.includes('luong') || s.includes('bi tru'))) {
    const m = s.match(/nghi\s*(\d+)\s*ngay/);
    const days = m ? parseInt(m[1], 10) : null;
    return { intent: 'WHAT_IF_LEAVE', days };
  }
  if (s.includes('xin nghi') || s.includes('dang ky nghi')) return { intent: 'REQUEST_LEAVE' };
  return { intent: 'SMALL_TALK' };
}

module.exports = {
  normalizeVN, parseMonthText, parseDateText, monthKey, detectIntent
};
