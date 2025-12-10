# Implementation Plan - Fix Multiple Issues

## 🎯 Issues to Fix:

### 1. **Mode Switch Icon Bug** ⚠️ CRITICAL
**Problem:** Khi đăng nhập admin/k toán, mode switch không hiển thị/không hoạt động. Phải F5 mới swap được.

**Root Cause:** ViewModeContext state không được initialize đúng khi mount component.

**Solution:** 
- Fix `ViewModeContext` để detect role và set initial mode ngay khi mount
- Add `useEffect` to force re-render when user changes

**Files:**
- `frontend/src/contexts/ViewModeContext.js`
- `frontend/src/components/Layout.js`

---

### 2. **Horizontal Scroll** 🐛
**Problem:** Layout có scroll ngang, chỉ cần scroll dọc.

**Solution:**
- Fix Layout CSS: `overflow-x: hidden` 
- Ensure content width không vượt quá viewport

**Files:**
- `frontend/src/components/Layout.js` (CSS inline)
- Check responsive issues

---

### 3. **Socket for Chat & Notifications** 🔌
**Problem:** Cần socket cho:
- Chat tin nhắn real-time
- Badge unread count
- Status đã xem/chưa xem
- Online/offline status
- Pop-up notification khi có đơn mới

**Solution:**
- Implement socket.io events:
  - `new_message` - chat tin nhắn
  - `message_read` - đánh dấu đã đọc
  - `user_online` / `user_offline` - status
  - `new_leave_request` - đơn nghỉ (đã có)
  - `new_ot_request` - đơn OT (đã có)

**Files:**
- `backend/socket/socketServer.js` - Add new events
- `frontend/src/hooks/useSocket.js` - Handle events
- `frontend/src/pages/chat/*` - Update UI

---

### 4. **Rename "Bảng lương cơ bản" → "Bảng lương ngày công"** ✏️
**Problem:** Terminology không đúng.

**Solution:**
- Find all "lương cơ bản" và replace với context phù hợp:
  - `baseSalary` (field name) - giữ nguyên
  - "Lương cơ bản" (display text) - đổi thành "Lương ngày công" khi hiển thị calculated salary based on working days

**Files:**
- `backend/controllers/chatController.js` - Response text
- `frontend/src/pages/payroll/*` - UI labels
- Check all files có "lương cơ bản"

---

### 5. **LLM Chatbot: Fix Salary Query** 🤖
**Problem:**
- Hỏi "lương tháng 11 của EMP003" → trrả lời đúng lương thực lãnh
- Hỏi "EMP003 đã check in chưa" → bị nhầm, trả lời về lương

**Solution:**
- Improve intent classification logic
- Add priority: Check-in keywords should override salary keywords when both present
- Fix fallback logic in chatController

**Files:**
- `backend/controllers/chatController.js` (lines 654-687)
- `backend/services/nlu.js` - Regex patterns

---

### 6. **Remove UNATTENDED_TODAY patterns** 🗑️
**Problem:** Không cần patterns này.

**Solution:**
- Find và xóa section:
```javascript
UNATTENDED_TODAY: [
  "hôm nay ai chưa điểm danh",
  ...
],
```

**Files:**
- Search for "UNATTENDED_TODAY" và xóa

---

### 7. **Remove Whitespace in Chat** 📏
**Problem:** Chatbot response có khoảng trắng thừa (image 2).

**Solution:**
- Check CSS padding/margin trong chat container
- Review response formatting

**Files:**
- `frontend/src/pages/chatbot/ChatBot.js` - CSS
- Check message rendering component

---

## 📋 Implementation Order:

1. ✅ Fix Mode Switch (CRITICAL - blocking work)
2. ✅ Fix Horizontal Scroll (UX issue)
3. ✅ Fix LLM Chatbot Intent (User facing bug)
4. ✅ Rename labels (Simple text change)
5. ✅ Remove UNATTENDED patterns (Cleanup)
6. ✅ Fix Chat whitespace (Minor UI)
7. ⏳ Socket implementation (Feature addition - can be done later)

---

## 🚀 Execution Plan:

**Phase 1 - Critical Bugs (Now):**
- [ ] Fix Mode Switch
- [ ] Fix Horizontal Scroll
- [ ] Fix LLM Intent Classification

**Phase 2 - Text/UI (Now):**
- [ ] Rename labels
- [ ] Remove patterns
- [ ] Fix chat whitespace

**Phase 3 - Feature (Later):**
- [ ] Socket for chat (requires more time)

---

**Created:** 2025-12-10  
**Status:** Ready to implement
