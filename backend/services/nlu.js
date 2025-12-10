/** Tiền xử lý: bỏ dấu, hạ chữ */
function toASCII(str = '') {
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[“”"']/g, '"')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const VN_MONTH_WORDS = {
  'mot':1,'một':1,'hai':2,'ba':3,'bon':4,'bốn':4,'tu':4,'tư':4,'nam':5,'năm':5,
  'sau':6,'sáu':6,'bay':7,'bảy':7,'tam':8,'tám':8,'chin':9,'chín':9,
  'muoi':10,'mười':10,'muoi mot':11,'mười một':11,'muoi hai':12,'mười hai':12
};

function monthFromText(s, now=new Date()) {
  const m = s.match(/\b(1[0-2]|0?[1-9])\b/);
  if (m) return Number(m[1]);
  for (const [w,v] of Object.entries(VN_MONTH_WORDS)) if (s.includes(`thang ${w}`)) return v;
  if (/\b(thang nay|thang này)\b/.test(s)) return now.getMonth()+1;
  return now.getMonth()+1;
}
function yearFromText(s, now=new Date()) {
  const y = s.match(/\b(20\d{2})\b/);
  return y ? Number(y[1]) : now.getFullYear();
}
function dateISOFromText(s, now=new Date()) {
  const m = s.match(/\b(20\d{2})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
  if (/\b(hom nay|hôm nay|bua nay|bữa nay|nay)\b/.test(s)) {
    const y=now.getFullYear(), mo=String(now.getMonth()+1).padStart(2,'0'), d=String(now.getDate()).padStart(2,'0');
    return `${y}-${mo}-${d}`;
  }
  return null;
}
function pickDays(s) {
  const m = s.match(/(\d+)\s*(ngay|h[oô]m|bua|bữa)/);
  return m ? Number(m[1]) : null;
}
/** Bắt mã nhân viên: EMP###, NV###, hoặc “mã 30” */
function normalizeEmpCode(prefix, digits) {
  const pre = (prefix || 'EMP').toUpperCase().startsWith('N') ? 'NV' : 'EMP';
  return pre + String(digits).padStart(3, '0');
}
function pickEmployeeCode(s, raw='') {
  let m = s.match(/\b(emp|nv)\s*0?(\d{2,6})\b/);
  if (m) return normalizeEmpCode(m[1], m[2]);
  m = s.match(/\bma\s*(nhan\s*vien|nv)?\s*0?(\d{1,6})\b/);
  if (m) return normalizeEmpCode((m[1] || 'EMP'), m[2]);
  m = raw.match(/\b(EMP|NV)\s*0?(\d{2,6})\b/);
  if (m) return normalizeEmpCode(m[1], m[2]);
  return null;
}
function pickEmployeeName(raw='') {
  raw = String(raw).replace(/\*\*/g, ' ');
  let m;
  
  // Pattern 1: "lương tháng X của nhân viên [TÊN]" - thứ tự ngược lại, linh hoạt hơn
  m = raw.match(/lương\s+tháng\s+\d+\s+của\s+nhân\s*viên\s+([a-zA-ZÀ-ỹ][a-zA-ZÀ-ỹ0-9 _.'\-]{2,50})/i);
  if (m) {
    let name = m[1].trim();
    // Loại bỏ phần "của" nếu có ở cuối
    name = name.replace(/\s+của.*$/i, '').trim();
    if (name.length > 1) return name;
  }
  
  // Pattern 2: "lương của nhân viên [TÊN] của tháng X này" - pattern cụ thể nhất
  m = raw.match(/lương\s+của\s+nhân\s*viên\s+([a-zA-ZÀ-ỹ][a-zA-ZÀ-ỹ0-9 _.'\-]+?)\s+của\s+tháng/i);
  if (m) return m[1].trim();
  
  // Pattern 3: "lương của nhân viên [TÊN] tháng X" hoặc "lương của nhân viên [TÊN] tháng này"
  m = raw.match(/lương\s+của\s+nhân\s*viên\s+([a-zA-ZÀ-ỹ][a-zA-ZÀ-ỹ0-9 _.'\-]+?)\s+tháng/i);
  if (m) {
    let name = m[1].trim();
    // Loại bỏ phần "của" nếu có ở cuối tên
    name = name.replace(/\s+của\s*$/i, '').trim();
    // Trả về tên nếu có độ dài hợp lý (tên không nên chứa "tháng" vì đã dừng ở đó)
    if (name.length > 0 && !/^\s*$/i.test(name) && !/tháng/i.test(name)) return name;
  }
  // Pattern 4: "lương của nhân viên [TÊN]" (không có tháng)
  m = raw.match(/lương\s+của\s+nhân\s*viên\s+([a-zA-ZÀ-ỹ][a-zA-ZÀ-ỹ0-9 _.'\-]{1,50})(?:\s+tháng|$)/i);
  if (m) {
    const name = m[1].trim();
    if (!/tháng/i.test(name)) return name;
  }
  // Pattern 3: "lương nhân viên [TÊN] tháng X" hoặc "lương nhân viên [TÊN] tháng này"
  m = raw.match(/lương\s+nhân\s*viên\s+([a-zA-ZÀ-ỹ][a-zA-ZÀ-ỹ0-9 _.'\-]+?)\s+tháng/i);
  if (m) {
    const name = m[1].trim();
    // Đảm bảo tên không chứa từ khóa "tháng"
    if (!/tháng/i.test(name) && name.length > 0) return name;
  }
  
  // Pattern 4: "lương tháng X của nhân viên [TÊN]" - đã được xử lý ở Pattern 1, nhưng để đảm bảo
  m = raw.match(/lương\s+tháng\s+\d+\s+của\s+nhân\s*viên\s+([a-zA-ZÀ-ỹ][a-zA-ZÀ-ỹ0-9 _.'\-]+?)(?:\s+của|$)/i);
  if (m) return m[1].trim();
  
  // Pattern 5: Tổng quát - có từ "lương", "nhân viên", và tên (không quan trọng thứ tự)
  if (/lương/i.test(raw) && /nhân\s*viên/i.test(raw) && !/(toi|tui|minh|cua toi|của tôi|m[iì]nh|t[ôo]i|em)\b/i.test(raw)) {
    // Tìm tên sau "nhân viên"
    m = raw.match(/nhân\s*viên\s+([a-zA-ZÀ-ỹ][a-zA-ZÀ-ỹ0-9 _.'\-]{2,50})/i);
    if (m) {
      let name = m[1].trim();
      // Loại bỏ các từ khóa không phải tên
      name = name.replace(/\s+(của|tháng|này|nay).*$/i, '').trim();
      // Chỉ lấy tên nếu không chứa từ khóa
      if (name.length > 1 && !/tháng|của|EMP|NV\d|này|nay/i.test(name)) {
        return name;
      }
    }
  }
  
  // Pattern 6: "nhân viên [TÊN]" - pattern chung (đặt cuối để tránh conflict)
  m = raw.match(/(?:nhan?\s*vien|nhanvien|nv)\s+([a-zA-ZÀ-ỹ][a-zA-ZÀ-ỹ0-9 _.'\-]{1,50})/i);
  if (m && !/lương/i.test(raw)) {
    const name = m[1].trim();
    if (!/tháng|EMP|NV\d/i.test(name)) return name;
  }
  
  m = raw.match(/["""]([a-zA-ZÀ-ỹ0-9 _.'\-]{1,50})["""]/i);
  if (m) return m[1].trim();
  if (/lương|bang luong|bảng lương/i.test(raw)) {
    m = raw.match(/(?:lương|bảng lương)[^a-zA-ZÀ-ỹ]*([a-zA-ZÀ-ỹ][a-zA-ZÀ-ỹ _.'\-]{1,50})$/i);
    if (m) return m[1].trim();
  }
  return null;
}

/** Phân loại intent + entity */
function detectIntentAndEntities(text) {
  const raw = text || '';
  const s = toASCII(raw);
  const now = new Date();

  const month = monthFromText(s, now);
  const year = yearFromText(s, now);
  const dateISO = dateISOFromText(s, now);
  const days = pickDays(s);
  const employeeName = pickEmployeeName(raw);
  const employeeCode = pickEmployeeCode(s, raw);

  // === INTENT MATCHING ===
  if ((/\bneu\b/.test(s) && /\bnghi\b/.test(s)) || /muon nghi them|muốn nghỉ thêm/.test(s))
    return { intent: 'WHAT_IF_LEAVE', entities: { month, year, days: days ?? 1 } };

  if (/(chinh sach|chính sách|policy|nghi phep|nghỉ phép|ot|tang ca|tăng ca|di tre|đi trễ|nhan su|nhân sự)/.test(s))
    return { intent: 'HR_POLICY_SUMMARY', entities: {} };

  // Detection cho EMPLOYEE_ATTENDANCE_BY_CODE: hỏi checkin của nhân viên theo mã
  // Pattern: "Nhân viên EMP003 đã check in chưa" hoặc "EMP003 đã điểm danh chưa"
  // Ưu tiên kiểm tra check-in trước khi kiểm tra lương
  if ((/(da|đã|chưa|chua)\s*(checkin|check\s*in|diem danh|điểm danh|cham cong|chấm công)/.test(s) ||
       /(checkin|check\s*in|diem danh|điểm danh|cham cong|chấm công)\s*(da|đã|chưa|chua)/.test(s)) &&
      (employeeCode || /\b(EMP|NV)\s*0?\d{2,6}\b/i.test(raw)) &&
      !/(toi|tui|minh|cua toi|của tôi|m[iì]nh|t[ôo]i|em)\b/.test(s) &&
      !/l[ươ]ng|b[ả]ng l[ươ]ng/i.test(s)) {
    const extractedCode = employeeCode || pickEmployeeCode(s, raw);
    if (extractedCode) {
      return { intent: 'EMPLOYEE_ATTENDANCE_BY_CODE', entities: { dateISO: dateISO || null, employeeCode: extractedCode } };
    }
  }

  // Detection cho MY_ATTENDANCE_YESTERDAY: hỏi checkin hôm qua của mình
  // Pattern: "hôm qua tui đã check in chưa" hoặc "hôm qua tôi đã điểm danh chưa"
  if (/\b(hom qua|hôm qua|yesterday)\b/.test(s) && 
      /(toi|tui|m[iì]nh|t[ôo]i|em)\b/.test(s) &&
      /(da|đã|chưa|chua|check|diem danh|điểm danh|cham cong|chấm công)/.test(s))
    return { intent: 'MY_ATTENDANCE_YESTERDAY', entities: {} };

  if ((/\b(hom nay|bua nay|nay)\b/.test(s) && /(da|đã)?\s*(diem danh|check\s*in|checkin|cham cong|chấm công)/.test(s)) &&
      /(toi|tui|m[iì]nh|t[ôo]i|em)\b/.test(s))
    return { intent: 'MY_ATTENDANCE_TODAY', entities: { dateISO: dateISO || null } };

  if (/h[oô]m nay.*(ngay may|ngay bao nhieu|m[ấa]y t[âa]y)|today is what date|date today/.test(s))
    return { intent: 'TODAY_DATE', entities: {} };

  if ((/\b(hom nay|bua nay|nay)\b/.test(s) && /(da|roi|r?oi).*(diem danh|check\s*in|checkin|cham cong)/.test(s)) ||
      /\b(ai|danh sach|list|nhung ai).*(da).*(diem danh|check\s*in|checkin|cham cong)/.test(s) ||
      /\b(danh sach|danh sách).*(checkin|check\s*in|diem danh|điểm danh).*(hom nay|hôm nay|nay)\b/.test(s))
    return { intent: 'CHECKED_IN_ON_DATE', entities: { dateISO: dateISO || null } };

  if ((/\b(hom nay|bua nay|nay)\b/.test(s) && /\b(chua|chưa)\b.*(diem danh|check\s*in|checkin|cham cong)/.test(s)) ||
      /(ai|list|nhung ai).*(chua|chưa).*(diem danh|check\s*in|checkin|cham cong)/.test(s))
    return { intent: 'UNATTENDED_TODAY', entities: { dateISO: dateISO || null } };

  if (/(luong|bang luong|thu nhap).*(toi|tui|cua toi|m[iì]nh)\b/.test(s))
    return { intent: 'MY_SALARY', entities: { month, year } };

  // Detection cho EMPLOYEE_SALARY: có từ "lương" và có mã nhân viên hoặc tên nhân viên
  if (/luong|bang luong|bảng lương|thu nhap/i.test(raw)) {
    // Ưu tiên: Nếu có mã nhân viên hoặc tên nhân viên được extract VÀ không phải là "của tôi"
    // Đây là cách đơn giản và tự nhiên nhất
    if ((employeeCode || employeeName) && !/(toi|tui|minh|cua toi|của tôi|m[iì]nh|t[ôo]i|em)\b/i.test(s)) {
      return { intent: 'EMPLOYEE_SALARY', entities: { month, year, employeeName, employeeCode } };
    }
    
    // Thử extract lại một lần nữa với pattern cụ thể hơn nếu chưa có
    if (!employeeCode && !employeeName) {
      // Pattern: "lương [CODE] tháng X" hoặc "lương tháng X của [CODE]"
      if (/\b(EMP|NV)\s*0?\d{2,6}\b/i.test(raw) && !/(toi|tui|minh|cua toi|của tôi)\b/i.test(s)) {
        const extractedCode = pickEmployeeCode(s, raw);
        if (extractedCode) {
          return { intent: 'EMPLOYEE_SALARY', entities: { month, year, employeeCode: extractedCode } };
        }
      }
      
      // Pattern: có từ "nhân viên" + tên trong câu hỏi về lương
      if (/nhân\s*viên/i.test(raw) && !/(toi|tui|minh|cua toi|của tôi|m[iì]nh|t[ôo]i|em)\b/i.test(s)) {
        const extractedName = pickEmployeeName(raw);
        if (extractedName && extractedName.length > 1) {
          return { intent: 'EMPLOYEE_SALARY', entities: { month, year, employeeName: extractedName } };
        }
      }
    }
  }

  if ((/nhan\s*vien|nv|thong tin|ai\b/.test(s)) && employeeCode)
    return { intent: 'EMPLOYEE_INFO', entities: { employeeCode } };

  if (/(tong|quy|toan bo|tat ca).*(luong|payroll).*(thang)/.test(s))
    return { intent: 'TOTAL_PAYROLL', entities: { month, year } };

  // Bổ sung:
  if (/xin ngh[iì]|don phep|đơn phép|duyet|duy[eê]t.*(cua ai|boi ai|ai duyet)/.test(s))
    return { intent: 'LEAVE_APPROVER', entities: {} };

  if (/tre|tr[eễ]|\bdi tre\b|\bđi trễ\b.*(tru|tr[uừ]|khau tru|khấu trừ)/.test(s))
    return { intent: 'IS_LATE_DEDUCTED', entities: {} };

  if (/(muc phat|mức phạt).*(di tre|đi trễ)/.test(s))
    return { intent: 'LATE_PENALTY_RULE', entities: {} };

  if (/ho so cua toi|my profile|thong tin cua toi|profile cua toi|thong tin nhan vien cua toi/.test(s))
    return { intent: 'MY_PROFILE', entities: {} };

  if (/so ngay phep|ngay phep con lai|leave balance|bao nhieu ngay phep/.test(s))
    return { intent: 'MY_LEAVE_BALANCE', entities: {} };

  if (dateISO && /(checkin|điểm danh|da diem danh|ai da check)/.test(s))
    return { intent: 'CHECKED_IN_ON_DATE', entities: { dateISO } };

  return { intent: 'UNKNOWN', entities: { month, year, dateISO, days, employeeName, employeeCode } };
}

module.exports = { detectIntentAndEntities, toASCII, pickEmployeeName, pickEmployeeCode };
