# TỔNG HỢP CÂU HỎI VÀ PHÂN TÍCH HỆ THỐNG HR MANAGER

Dưới đây là tổng hợp các câu hỏi tiềm năng về nghiệp vụ, công nghệ và phân tích sâu về 3 module chính: ESP32 Chấm công, Chatbot AI và Chat nội bộ dựa trên source code hiện tại.

---

## PHẦN 1: CÂU HỎI VỀ NGHIỆP VỤ & CÔNG NGHỆ

### 1. Về Nghiệp vụ (Business Logic)
*   **Quy trình Chấm công (Attendance):**
    *   Hệ thống xử lý thế nào khi một nhân viên chấm công quá nhiều lần trong ngày? (Hiện tại ESP32 dùng logic: Lần 1 = IN, Lần 2 = OUT, các lần sau có thể bị bỏ qua hoặc ghi đè tùy cấu hình).
    *   Làm thế nào để phân biệt ca làm việc (Shift) khi nhân viên chấm công vào lúc nửa đêm hoặc giao thừa?
    *   Logic tính lương "What-if" (nếu nghỉ thêm X ngày) hoạt động như thế nào? (Dựa trên lương cơ bản và ngày công chuẩn 26 ngày).
*   **Tính lương (Payroll):**
    *   Sự khác biệt giữa lương "snapshot" (đã chốt) và lương "real-time" (tạm tính theo chấm công) là gì?
    *   Các khoản phụ cấp, tăng ca (OT) và phạt đi muộn được tính toán và cộng dộp vào lương cuối kỳ như thế nào?
*   **Quyền hạn (Role-based Access Control):**
    *   Ma trận phân quyền chat nội bộ được thiết kế ra sao? (Ví dụ: Nhân viên không được chat với nhân viên khác, chỉ chat với Quản lý/Kế toán).

### 2. Về Công nghệ Backend (Node.js/Express)
*   **Kiến trúc:** Tại sao lại tách biệt `controllers` và `services` (ví dụ: `chatController` gọi `classifyIntent` từ `llm.js`)? Lợi ích của việc này là gì?
*   **Real-time:** Socket.io được tích hợp như thế nào với REST API trong tính năng Chat nội bộ? (Cơ chế emit event sau khi lưu DB).
*   **AI Integration:** Làm thế nào để xử lý giới hạn Rate Limit hoặc lỗi từ OpenAI API? (Cơ chế fallback regex hoặc breaker pattern trong `llm.js`).
*   **Database:** Schema của MongoDB được thiết kế để tối ưu cho việc truy vấn lịch sử chấm công theo tháng/năm như thế nào?

### 3. Về Công nghệ Frontend & ESP32
*   **ESP32:** Cơ chế "WiFi Multi" hoạt động ra sao để đảm bảo thiết bị luôn kết nối mạng? Làm thế nào thiết bị đồng bộ thời gian chính xác (NTP)?
*   **Frontend:** Làm thế nào để hiển thị dữ liệu real-time khi có tin nhắn mới hoặc nhân viên vừa chấm công?

---

## PHẦN 2: PHÂN TÍCH SÂU VỀ CODE

### 1. Hệ thống ESP32 (`esp32_vantay/src/main.cpp`)
Đây là trái tim của hệ thống chấm công vật lý.
*   **Luồng hoạt động chính (Auto Mode):**
    *   Thiết bị không cần nút bấm IN/OUT. Code logic tự động xác định:
        *   **Check-in:** Lần chấm công đầu tiên trong ngày (so khớp với `todayKey`).
        *   **Check-out:** Lần chấm công thứ hai trong ngày.
    *   Hàm `validateAttendanceTime` kiểm tra khung giờ hợp lệ (ví dụ: từ 7h00 - 24h00) để tránh spam hoặc chấm công sai giờ.
*   **Kết nối mạng & Thời gian:**
    *   Sử dụng `WiFiMulti` để lưu nhiều cấu hình WiFi. Nếu mất mạng này, ESP32 tự động thử mạng khác trong danh sách `WIFI_LIST`.
    *   Đồng bộ thời gian qua NTP Server (`pool.ntp.org`) múi giờ UTC+7 để đảm bảo timestamp chấm công luôn chính xác, không phụ thuộc vào thời gian khởi động.
*   **Giao tiếp Server:**
    *   Toàn bộ cấu hình (Server URL) được lưu trong bộ nhớ Flash (NVS) và có thể cập nhật động từ Backend hoặc qua Webserver nội bộ.
    *   Khi có vân tay hợp lệ, ESP32 gọi API POST `/attendance/add` kèm theo `fingerprintId` và `timestamp`.

### 2. Chatbot AI (`backend/controllers/chatController.js` & `services/llm.js`)
Hệ thống Chatbot lai (Hybrid) giữa AI hiện đại và xử lý logic truyền thống.
*   **Cơ chế Phân loại (NLU):**
    *   Sử dụng OpenAI (GPT-4o-mini) trong file `services/llm.js` để phân tích ý định (Intent) của người dùng từ ngôn ngữ tự nhiên.
    *   Ví dụ: "Lương tháng này của tui" -> Intent: `MY_SALARY`, Entities: `{ month: current, year: current }`.
    *   Nếu OpenAI bị lỗi hoặc quá tải (Rate limit), hệ thống có cơ chế Fallback sử dụng Regex truyền thống để bắt các từ khóa cơ bản.
*   **Xử lý Logic (Handlers):**
    *   **Tính lương (`handleMySalary`, `computeSalaryFor`):**
        *   Nếu tháng đã chốt lương (`Payroll` model có dữ liệu), bot trả về con số chính xác.
        *   Nếu chưa chốt, bot tự động tính lương "tạm tính" dựa trên dữ liệu chấm công (`Attendance`) và lương cơ bản (`Employee`), bao gồm cả trừ tiền đi muộn/nghỉ không phép.
    *   **Dự báo (`handleWhatIfLeave`):** Tính toán giả lập: "Nếu nghỉ thêm 2 ngày thì lương còn bao nhiêu?" giúp nhân viên quản lý ngày phép tốt hơn.
*   **Bảo mật:**
    *   Bot kiểm tra quyền người dùng (`isPrivileged`). Admin xem được lương nhân viên khác, còn nhân viên chỉ xem được lương của chính mình.

### 3. Chat Nội bộ (`backend/controllers/internalChatController.js`)
Hệ thống liên lạc nội bộ với quy tắc nghiệp vụ chặt chẽ.
*   **Phân quyền (Role-based Filtering):**
    *   Hàm `canUsersChat(senderRole, receiverRole)` định nghĩa ma trận giao tiếp:
        *   **Manager:** Chat được với Employee.
        *   **Employee:** Chỉ chat được với Manager & Accountant (không chat với Employee khác để tránh xao nhãng hoặc bảo mật).
        *   **Accountant:** Chat với Manager & Employee.
*   **Cơ chế Real-time (Socket.io + REST):**
    *   Sử dụng phương pháp lai:
        1.  Client gửi tin nhắn qua REST API (`POST /chat/send`) để đảm bảo tin nhắn được lưu vào MongoDB (`InternalMessage`).
        2.  Sau khi lưu thành công, Controller gọi `socket.io` để `emit` sự kiện `new_message` tới người nhận ngay lập tức.
    *   Điều này đảm bảo tính toàn vẹn dữ liệu (tin nhắn không bị mất nếu Socket mất kết nối) đồng thời vẫn có trải nghiệm thời gian thực.
*   **Quản lý trạng thái:**
    *   Hệ thống theo dõi trạng thái `read` (đã xem) và đếm số tin nhắn chưa đọc (`unreadCount`) để hiển thị thông báo trên giao diện Mobile/Web.

---

## PHẦN 3: HƯỚNG DẪN TRIỂN KHAI REAL-TIME NOTIFICATIONS

### 1. Cơ chế hiện tại (Đã hoạt động)

#### A. Chat nội bộ - Tin nhắn mới
**Backend (`socketServer.js`):**
```javascript
// Khi user gửi tin nhắn qua socket
socket.on('send_message', async (data) => {
  // Lưu vào DB
  const message = new InternalMessage({ sender, receiver, content });
  await message.save();
  
  // ✅ Emit tới người nhận ngay lập tức
  io.to(`user_${receiverId}`).emit('new_message', message);
});
```

**Frontend (`InternalChat.js`):**
```javascript
// Lắng nghe sự kiện tin nhắn mới
socket.on('new_message', (message) => {
  setMessages(prev => [...prev, message]); // Thêm vào danh sách
  scrollToBottom(); // Cuộn xuống dưới
});
```

#### B. Thông báo đơn nghỉ phép/OT mới (cho Admin)
**Frontend (`Layout.js`):**
```javascript
socket.on('new_leave_request', (data) => {
  setNotificationCount(prev => prev + 1); // Tăng badge
  message.info({ content: data.message }); // Popup thông báo
});
```

---

### 2. THÊM THÔNG BÁO KHI NHÂN VIÊN VỪA CHẤM CÔNG (Hướng dẫn)

**Bước 1: Backend - Emit sự kiện sau khi chấm công**

Trong file `backend/controllers/attendanceController.js`, thêm vào cuối hàm `addAttendance`:

```javascript
const { getIO } = require('../socket/socketServer');

// Sau khi lưu attendance thành công
await attendance.save();

// ✅ Emit thông báo tới tất cả Admin
try {
  const io = getIO();
  io.to('role_manager').emit('new_attendance', {
    type: actionType, // 'checkin' hoặc 'checkout'
    employee: {
      name: employee.name,
      employeeId: employee.employeeId
    },
    time: new Date().toISOString(),
    message: `${employee.name} vừa ${actionType === 'checkin' ? 'check-in' : 'check-out'}`
  });
} catch (socketError) {
  console.error('Socket emit error:', socketError);
}
```

**Bước 2: Frontend - Lắng nghe sự kiện**

Trong file `frontend/src/components/Layout.js`, thêm vào useEffect socket:

```javascript
// Thêm vào useEffect hiện tại (dòng 68-101)
const handleNewAttendance = (data) => {
  console.log('📢 New attendance:', data);
  
  // Hiển thị thông báo popup
  message.info({
    content: data.message,
    duration: 4,
    icon: data.type === 'checkin' ? '🟢' : '🔴'
  });

  // (Tùy chọn) Phát âm thanh thông báo
  // new Audio('/notification-sound.mp3').play();
};

socket.on('new_attendance', handleNewAttendance);

// Cleanup
return () => {
  socket.off('new_attendance', handleNewAttendance);
};
```

---

### 3. TÓM TẮT LUỒNG DỮ LIỆU REAL-TIME

```
ESP32 quét vân tay
       ↓
   POST /api/attendance/add
       ↓
   Backend xử lý & lưu DB
       ↓
   io.to('role_manager').emit('new_attendance', {...})
       ↓
   Frontend (Admin) nhận qua Socket.io
       ↓
   message.info() hiển thị popup + Badge count
```

### 4. LƯU Ý QUAN TRỌNG

| Vấn đề | Giải pháp |
|--------|-----------|
| Socket mất kết nối | Sử dụng polling fallback (mỗi 3s gọi API lấy dữ liệu mới) |
| Tin nhắn trùng lặp | Kiểm tra `message._id` tồn tại trước khi thêm vào state |
| Thứ tự tin nhắn sai | Sort theo `createdAt` khi merge messages |
| Thông báo quá nhiều | Gom nhóm (batch) nhiều thông báo trong 1 popup |
