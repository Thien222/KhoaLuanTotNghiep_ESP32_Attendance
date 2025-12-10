# 🔧 Quick Fixes Summary

Vì có quá nhiều issues cần fix, tôi đã phân tích và đưa ra giải pháp nhanh cho từng cái:

## 1️⃣ Mode Switch Bug (CRITICAL)

**Vấn đề:** Không hiển thị mode switch button khi login, phải F5 mới có.

**Nguyên nhân:** 
- ViewModeContext đã OK
- Layout component cần force re-render khi user changes
- Có thể do browser cache CSS class `ant-btn-icon`

**Giải pháp:**
```javascript
// Layout.js - Add key to force re-render
<Button 
  key={`mode-${user?.role}-${canSwitchMode}`} // Force remount
  icon={...}
  onClick={handleToggleMode}
/>
```

**Manual Fix:** Bạn F5 trang sau khi login → Works → Meaning context is fine, just rendering issue

---

## 2️⃣ Horizontal Scroll

**Giải pháp:** Thêm vào Layout CSS:
```css
body {
  overflow-x: hidden !important;
}
.main-content-area {
  overflow-x: hidden !important;
  max-width: 100vw;
}
```

---

## 3️⃣ Socket for Chat (BIG FEATURE)

**Status:** ⏳ Cần implement riêng (estimated 4-6 hours)

**Quick Win:** Đã có socket cho notifications (leave/OT requests)

**TODO Later:**
- Chat real-time messages
- Badge unread count
- Read/unread status
- Online/offline indicator

---

## 4️⃣ Rename "Bảng lương cơ bản" → "Bảng lương ngày công"

**Files to change:**
1. `chatController.js` - Line 175, 294: "Lương cơ bản" (keep as is for monthly base)
2. `chatController.js` - Line 176: "Lương ngày công" (this one is correct already!)

**Action:** Search "lương cơ bản" trong frontend và đổi context-appropriate ones

---

## 5️⃣ LLM Fix - EMP003 Check-in vs Salary

**Vấn đề:** 
- "EMP003 đã check in chưa" → Response về lương (WRONG)
- "Lương tháng 11 của EMP003" → Response: "18.000.000đ" (OK nhưng cần "thực lãnh")

**Root Cause:** chatController.js line 674-677 - priority sai

**Fix:**
```javascript
// Line 674 - Put attendance check BEFORE salary check
else if (/\\b(EMP|NV)\\s*\\d{2,6}\\b/i.test(text)) {
  // Check if has attendance keywords first
  if (/(checkin|check\\s*in|diem danh|điểm danh|cham cong|chấm công|da|đã|chưa)/i.test(text) &&
      !/l[ươ]ng|b[ả]ng l[ươ]ng/i.test(text)) {
    // Attendance query
    entities.employeeCode = pickEmployeeCode(toASCII(text), text);
    reply = await handleEmployeeAttendanceByCode(user, entities, text);
  } else {
    // Salary query
    reply = await handleEmployeeSalary(user, entities, text);
  }
}
```

**Also fix line 289:** Return only netSalary for admin: ✅ Already correct!

---

## 6️⃣ Remove UNATTENDED_TODAY

**Status:** ❌ Pattern không tồn tại trong code
- Đã search "UNATTENDED_TODAY" → No results
- Đã search "hôm nay ai chưa điểm danh" → No results trong pattern files

**Action:** Nothing to do, đã bị xóa rồi hoặc không tồn tại

---

## 7️⃣ Chat Whitespace

**Vấn đề:** Khoảng trắng thừa trong chat response (image 4)

**Giải pháp:** Check ChatBot.js CSS:
```css
.chat-message {
  white-space: pre-line; /* Keep line breaks */
  margin-bottom: 8px; /* Reduce if needed */
}
```

---

## 🚀 Priority Actions:

### NOW (Critical):
1. Fix mode switch rendering → Add `key` prop
2. Fix horizontal scroll → Add CSS
3. Fix LLM check-in priority → Reorder conditions

### SOON (Important):
4. Rename labels → Text changes
5. Fix chat whitespace → CSS

### LATER (Feature):
6. Socket full implementation → Separate task

---

## 📝 Bạn muốn tôi:

**Option A:** Fix tất cả ngay (except socket)?  
**Option B:** Fix từng cái một và test?  
**Option C:** Ưu tiên 1-3 để user test được?

Tôi khuyến nghị **Option C** vì đó là các vấn đề blocking nhất!

---

**Status:** Waiting for your decision  
**ETA:** 30-45 minutes để fix Option C
