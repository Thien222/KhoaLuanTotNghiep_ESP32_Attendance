# 40 CÂU HỎI PHẢN BIỆN KHÓA LUẬN TỐT NGHIỆP
## Hệ thống Quản lý Chấm công & Tính lương với ESP32

---

## PHẦN 1: LOGIC NGHIỆP VỤ (10 câu)

### Câu 1: Logic nghiệp vụ chấm công
**Hỏi:** Hệ thống xử lý logic chấm công như thế nào? Khi nhân viên quét vân tay, hệ thống tự động phân biệt check-in và check-out như thế nào? File nào chứa logic này và nó hoạt động ra sao?

**Trả lời mong đợi:** 
- File: `backend/controllers/attendanceController.js` - hàm `addAttendance()`
- Logic auto-detect: Kiểm tra xem đã có record hôm nay chưa, nếu chưa có check-in thì là check-in, nếu có check-in nhưng chưa có check-out thì là check-out
- Dòng 1014-1029: Logic auto detect action

### Câu 2: Quy tắc phạt đi muộn
**Hỏi:** Công thức tính phạt đi muộn là gì? Nếu nhân viên đi muộn 45 phút thì phạt bao nhiêu? File nào chứa logic này? Có ngưỡng nào để mất cả ngày công không?

**Trả lời mong đợi:**
- File: `backend/utils/attendanceHelper.js` - hàm `calculateLatePenalty()`
- Công thức: Mỗi 15 phút = 20,000 VND (mặc định), làm tròn lên
- 45 phút = 3 blocks × 20k = 60,000 VND
- Ngưỡng mất ngày công: >= 120 phút (2 giờ) → status = 'absent'

### Câu 3: Quy tắc phạt về sớm
**Hỏi:** Hệ thống xử lý trường hợp nhân viên về sớm như thế nào? Công thức tính phạt về sớm? File nào chứa logic này?

**Trả lời mong đợi:**
- File: `backend/utils/attendanceHelper.js` - hàm `calculateEarlyPenalty()`
- Check-out trước 16:45 = về sớm
- Phạt: Mỗi 15 phút = 20,000 VND
- Nếu về sớm >= 120 phút → mất ngày công

### Câu 4: Logic tính giờ làm việc và OT
**Hỏi:** Hệ thống phân biệt giờ làm việc chuẩn (08:00-17:00) và giờ OT (từ 18:00) như thế nào? Công thức tính OT? File nào chứa logic này?

**Trả lời mong đợi:**
- File: `backend/controllers/attendanceController.js` - dòng 1192-1258
- Standard hours: Overlap giữa [checkIn, checkOut] và [08:00, 17:00], tối đa 8h
- OT hours: Từ sau 18:00 (sau giờ nghỉ 17:00-18:00), tính bằng phút rồi chia 60 (giữ số lẻ)
- OT chỉ tính nếu có đơn OT được duyệt (`is_ot_approved = true`)

### Câu 5: Quy tắc làm tròn giờ OT
**Hỏi:** Hệ thống làm tròn giờ OT như thế nào? Nếu làm OT 3 giờ 35 phút thì tính bao nhiêu giờ? File nào chứa logic này?

**Trả lời mong đợi:**
- File: `backend/utils/salaryCalculator.js` - hàm `roundOvertimeHours()` (dòng 24-38)
- Quy tắc: >= 30 phút → +0.5 giờ, < 30 phút → làm tròn xuống (giữ nguyên phần nguyên)
- Ví dụ: 3h35p → 3.5h, 3h29p → 3.0h

### Câu 6: Xử lý ngày lễ và cuối tuần
**Hỏi:** Hệ thống xử lý chấm công vào ngày lễ và cuối tuần như thế nào? Có hệ số tính lương khác nhau không? File nào chứa logic này?

**Trả lời mong đợi:**
- File: `backend/utils/attendanceHelper.js` - hàm `isHoliday()`, `getOvertimeRate()`
- Ngày lễ: Kiểm tra trong bảng `Holiday`, có `workRate` (mặc định 2.0x)
- Cuối tuần: Kiểm tra dayOfWeek (0 hoặc 6), có hệ số 2.0x
- OT ngày lễ: Hệ số cao hơn (3.0x mặc định)

### Câu 7: Logic đăng ký vân tay ESP32
**Hỏi:** Quy trình đăng ký vân tay qua ESP32 hoạt động như thế nào? Hệ thống Command Queue hoạt động ra sao? File nào chứa logic này?

**Trả lời mong đợi:**
- File: `backend/app.js` - dòng 225-423 (ESP32 Command Queue System)
- Frontend queue command → ESP32 poll → ESP32 execute → ESP32 report completion
- File: `frontend/src/pages/employee/EmployeeManagement.js` - hàm `handleEnrollFingerprint()` (dòng 240-347)

### Câu 8: Xử lý nghỉ phép và chế độ đặc biệt
**Hỏi:** Hệ thống tính lương cho các trường hợp nghỉ phép có lương, nghỉ ốm, thai sản như thế nào? Công thức tính từng loại? File nào chứa logic này?

**Trả lời mong đợi:**
- File: `backend/utils/salaryCalculator.js`
- Nghỉ phép: 100% lương (hàm `calculateAnnualLeavePay()` - dòng 500-505)
- Nghỉ ốm: 75% lương (hàm `calculateSickLeavePay()` - dòng 490-495)
- Thai sản: 100% trong 4 tháng đầu, 30% trong 2 tháng cuối (hàm `calculateMaternityPay()` - dòng 465-485)

### Câu 9: Time Machine - Điều khiển thời gian hệ thống
**Hỏi:** Hệ thống có tính năng Time Machine để điều khiển thời gian ảo. Tính năng này hoạt động như thế nào? Mục đích sử dụng? File nào chứa logic này?

**Trả lời mong đợi:**
- File: `backend/utils/timeMachine.js`
- Mục đích: Test hệ thống với các thời điểm khác nhau (không cần đợi thời gian thực)
- Lưu trữ: MongoDB collection `TimeMachineState`
- Sử dụng: Admin set thời gian ảo → Tất cả attendance dùng thời gian này thay vì `new Date()`

### Câu 10: Auto-completion chấm công
**Hỏi:** Hệ thống có tính năng auto-completion để tự động hoàn thành check-out cho nhân viên quên chấm công. Tính năng này hoạt động như thế nào? File nào chứa logic này?

**Trả lời mong đợi:**
- File: `backend/services/autoCompletionService.js`
- Cron job: Chạy vào giờ kết thúc làm việc (17:00) hàng ngày
- Logic: Tìm nhân viên có check-in nhưng chưa check-out → Tự động tạo check-out với giờ chuẩn (17:00)
- Được khởi tạo trong `backend/app.js` dòng 94-118

---

## PHẦN 2: CÔNG THỨC TÍNH LƯƠNG (10 câu)

### Câu 11: Công thức tính lương cơ bản
**Hỏi:** Công thức tính lương cơ bản theo ngày công là gì? Tại sao chia cho 26 ngày? File nào chứa công thức này? Cho ví dụ cụ thể.

**Trả lời mong đợi:**
- File: `backend/utils/salaryCalculator.js` - hàm `calculateMonthlySalary()` (dòng 43-340)
- Công thức: `baseSalary = (baseSalaryFull × actualWorkingDays) / 26`
- Lý do: 26 ngày công chuẩn trong tháng (loại trừ chủ nhật)
- Ví dụ: Lương 10,000,000 VND, làm 22 ngày → (10,000,000 × 22) / 26 = 8,461,538 VND

### Câu 12: Công thức tính phụ cấp
**Hỏi:** Hệ thống tính các loại phụ cấp như thế nào? Phụ cấp chung, phụ cấp thâm niên, phụ cấp chức vụ được tính ra sao? File nào chứa logic này?

**Trả lời mong đợi:**
- File: `backend/utils/salaryCalculator.js`
- Phụ cấp chung: 5% của `baseSalaryFull` (dòng 115-117)
- Phụ cấp thâm niên: 2% mỗi năm, tối đa 20% (hàm `calculateSeniorityAllowance()` - dòng 345-355)
- Phụ cấp chức vụ: Theo config từ Settings (hàm `calculatePositionAllowance()` - dòng 360-364)

### Câu 13: Công thức tính lương OT
**Hỏi:** Công thức tính lương OT chi tiết là gì? Có hệ số khác nhau cho ngày thường, cuối tuần, ngày lễ không? File nào chứa logic này?

**Trả lời mong đợi:**
- File: `backend/utils/attendanceHelper.js` - hàm `calculateOTSalary()`
- Công thức: `OT Salary = OT Hours × Rate Per Hour × Multiplier`
- Rate mặc định: 100,000 VND/giờ
- Hệ số: Weekday 1.5x, Weekend 2.0x, Holiday 3.0x
- Lưu ý: Chỉ tính nếu `is_ot_approved = true`

### Câu 14: Công thức tính thuế
**Hỏi:** Hệ thống tính thuế như thế nào? Thuế được tính trên cơ sở nào? Tỷ lệ thuế mặc định là bao nhiêu? File nào chứa logic này?

**Trả lời mong đợi:**
- File: `backend/utils/salaryCalculator.js` - dòng 248-250
- Công thức: `Tax = baseSalaryFull × TaxRate / 100`
- Tỷ lệ mặc định: 10%
- Tính trên: Lương cơ bản tháng (không phải prorated), không tính trên gross income

### Câu 15: Công thức tính lương thực nhận (Net Salary)
**Hỏi:** Công thức tổng quát tính lương thực nhận (Net Salary) là gì? Hãy liệt kê tất cả các thành phần tăng và giảm. File nào chứa công thức này?

**Trả lời mong đợi:**
- File: `backend/utils/salaryCalculator.js` - dòng 233-258
- Công thức: `Net Salary = Base Salary (prorated) + Allowances + OT Salary - Fines - Tax`
- Thành phần tăng: baseSalary, generalAllowance, seniorityAllowance, positionAllowance, overtimePay, holidayWorkPay
- Thành phần giảm: latePenalty, taxAmount

### Câu 16: Xử lý khấu trừ nghỉ không lương
**Hỏi:** Hệ thống xử lý khấu trừ lương cho ngày nghỉ không lương như thế nào? Công thức tính? File nào chứa logic này?

**Trả lời mong đợi:**
- File: `backend/utils/salaryCalculator.js`
- Hàm `calculateAbsentDeduction()` (dòng 444-448): `absentDeduction = (baseSalaryFull / 26) × absentDays`
- Hàm `calculateUnpaidLeaveDeduction()` (dòng 450-454): Tương tự
- Lưu ý: Đã được tính vào `baseSalary` prorated, nên chỉ hiển thị tham khảo

### Câu 17: Tính lương làm việc ngày lễ
**Hỏi:** Công thức tính lương cho nhân viên làm việc vào ngày lễ là gì? File nào chứa logic này?

**Trả lời mong đợi:**
- File: `backend/utils/salaryCalculator.js` - hàm `calculateHolidayWorkPay()` (dòng 408-413)
- Công thức: `holidayWorkPay = (baseSalaryFull / 26) × holidayWorkDays`
- Lý do: Làm lễ được tính 2x (1x đã tính trong basePay, thêm 1x)

### Câu 18: Tính lương làm việc cuối tuần
**Hỏi:** Công thức tính lương cho nhân viên làm việc cuối tuần là gì? File nào chứa logic này?

**Trả lời mong đợi:**
- File: `backend/utils/salaryCalculator.js` - hàm `calculateWeekendWorkPay()` (dòng 418-425)
- Công thức: `weekendWorkPay = (baseSalaryFull / 26) × weekendWorkDays × (weekendRate - 1)`
- Lý do: Làm cuối tuần được tính 2x (1x đã tính trong basePay, thêm 1x)

### Câu 19: API tính lương và luồng xử lý
**Hỏi:** Khi gọi API tính lương, hệ thống thực hiện những bước nào? File nào xử lý request? File nào chứa logic tính toán? Luồng dữ liệu như thế nào?

**Trả lời mong đợi:**
- API: `POST /api/payroll/calculate` hoặc `POST /api/salary/calculate`
- Controller: `backend/controllers/payrollController.js` - hàm `calculateMonthly()` (dòng 150-239)
- Logic tính: Gọi `calculateMonthlySalary()` từ `backend/utils/salaryCalculator.js`
- Luồng: Controller → salaryCalculator → Lấy dữ liệu (Employee, Attendance, Leave, Holiday, Settings) → Tính toán → Lưu vào Payroll

### Câu 20: So sánh 2 file tính lương
**Hỏi:** Tôi thấy có 2 file tính lương: `salaryCalculator.js` và `salary.service.js`. Sự khác biệt giữa chúng là gì? File nào đang được sử dụng? Tại sao có 2 file?

**Trả lời mong đợi:**
- `salary.service.js`: Deprecated, công thức cũ (28 ngày chuẩn, thuế 5%, tính trên grossIncome)
- `salaryCalculator.js`: Công thức mới (26 ngày chuẩn, thuế 10%, tính trên baseSalaryFull)
- File đang dùng: `salaryCalculator.js` (được import trong `payrollController.js` và `salaryController.js`)
- Lý do: Refactor để thống nhất công thức tính lương

---

## PHẦN 3: API QUAN TRỌNG (10 câu)

### Câu 21: API chấm công ESP32
**Hỏi:** API nào xử lý request chấm công từ ESP32? Endpoint là gì? File nào xử lý? Luồng xử lý như thế nào?

**Trả lời mong đợi:**
- Endpoint: `POST /api/attendance/add` hoặc `POST /api/attendance/fingerprint`
- File: `backend/app.js` (dòng 692-708, 1126-1144) → gọi `attendanceController.addAttendance()`
- File controller: `backend/controllers/attendanceController.js` - hàm `addAttendance()` (dòng 917-1336)
- Luồng: ESP32 gửi {fingerId, action} → Tìm Employee → Validate thời gian → Tính penalty/OT → Lưu Attendance → Emit Socket → Trả response

### Câu 22: API đăng ký vân tay
**Hỏi:** API nào xử lý đăng ký vân tay? Endpoint là gì? File nào xử lý? Quy trình hoạt động như thế nào?

**Trả lời mong đợi:**
- Endpoint: `GET /api/enroll?id=X` (ESP32) hoặc `POST /api/esp32/commands` (Frontend queue command)
- File: `backend/app.js` - dòng 742-1034 (GET /api/enroll) và dòng 225-275 (Command Queue)
- Quy trình: Frontend queue command → ESP32 poll → ESP32 enroll → ESP32 report → Update Employee.fingerprintEnrolled → Gửi email

### Câu 23: API lấy danh sách bảng lương
**Hỏi:** API nào lấy danh sách bảng lương theo tháng? Endpoint là gì? File nào xử lý? Có phân quyền như thế nào?

**Trả lời mong đợi:**
- Endpoint: `GET /api/payroll?month=11&year=2025`
- File: `backend/controllers/payrollController.js` - hàm `listMonthly()` (dòng 23-144)
- Phân quyền: Employee chỉ xem được lương của mình, Manager/Accountant xem được tất cả
- Route: `backend/routes/payrollRoutes.js` - dòng 35

### Câu 24: API tính lương cho tất cả nhân viên
**Hỏi:** API nào tính lương cho tất cả nhân viên trong tháng? Endpoint là gì? File nào xử lý? Có xử lý lỗi như thế nào?

**Trả lời mong đợi:**
- Endpoint: `POST /api/payroll/calculate` (không có employeeId)
- File: `backend/controllers/payrollController.js` - hàm `calculateMonthly()` (dòng 189-230)
- Logic: Lấy tất cả Employee status='active' → Loop tính lương từng người → Lưu kết quả và lỗi riêng
- Route: `backend/routes/payrollRoutes.js` - dòng 38

### Câu 25: API chấm công thủ công
**Hỏi:** API nào cho phép admin chấm công thủ công? Endpoint là gì? File nào xử lý? Có preview mode không?

**Trả lời mong đợi:**
- Endpoint: `POST /api/attendance/manual`
- File: `backend/controllers/attendanceController.js` - hàm `manualCheckIn()` (dòng 1583-2057)
- Preview mode: `preview=true` → Chỉ tính toán, không lưu DB
- Route: `backend/routes/attendanceRoutes.js`

### Câu 26: API Socket.IO real-time
**Hỏi:** Hệ thống sử dụng Socket.IO để cập nhật real-time. API nào emit event khi có chấm công mới? File nào xử lý? Event name là gì?

**Trả lời mong đợi:**
- File: `backend/controllers/attendanceController.js` - dòng 1102-1118 (check-in) và 1279-1295 (check-out)
- Event name: `new_attendance`
- File Socket server: `backend/socket/socketServer.js`
- Data: { type: 'checkin'/'checkout'/'manual', attendance, employee, message }

### Câu 27: API Settings - Cấu hình hệ thống
**Hỏi:** API nào quản lý cấu hình hệ thống (giờ làm việc, phạt, OT rate)? Endpoint là gì? File nào xử lý?

**Trả lời mong đợi:**
- Endpoint: `GET/POST /api/settings`
- File: `backend/controllers/settingsController.js`
- Route: `backend/routes/settingsRoutes.js`
- Model: `backend/models/Settings.js` - Lưu theo type: 'working-hours', 'late-policy', 'ot-rate', 'overtime', 'salary-structure', 'tax-config'

### Câu 28: API quản lý nhân viên
**Hỏi:** API nào thêm/sửa/xóa nhân viên? Endpoint là gì? File nào xử lý? Có tự động tạo user account không?

**Trả lời mong đợi:**
- Endpoint: `POST /api/debug/employees`, `PUT /api/employees/:id`, `DELETE /api/employees/:id`
- File: `backend/app.js` (dòng 1555-1847) và `backend/controllers/employeeController.js`
- Tự động tạo user: Nếu `createUserAccount=true` → Tạo User với password = employeeId
- Route: `backend/routes/employeeRoutes.js`

### Câu 29: API quản lý đơn OT
**Hỏi:** API nào xử lý đơn xin làm thêm giờ (OT)? Endpoint là gì? File nào xử lý? Có duyệt đơn không?

**Trả lời mong đợi:**
- Endpoint: `POST /api/overtime`, `GET /api/overtime`, `PUT /api/overtime/:id/approve`
- File: `backend/controllers/overtimeController.js`
- Route: `backend/routes/overtimeRoutes.js`
- Model: `backend/models/OvertimeRequest.js` - Status: 'pending', 'approved', 'rejected'
- Logic: Chỉ tính OT nếu có đơn approved (`is_ot_approved = true`)

### Câu 30: API Time Machine
**Hỏi:** API nào điều khiển Time Machine? Endpoint là gì? File nào xử lý? Chỉ admin mới dùng được không?

**Trả lời mong đợi:**
- Endpoint: `GET /api/timemachine/status`, `POST /api/timemachine/set`
- File: `backend/controllers/timeMachineController.js`
- Route: `backend/routes/timeMachineRoutes.js` - Chỉ Manager role
- File logic: `backend/utils/timeMachine.js`
- Mục đích: Test hệ thống với thời gian ảo

---

## PHẦN 4: CÔNG NGHỆ BACKEND (5 câu)

### Câu 31: Stack công nghệ Backend
**Hỏi:** Hệ thống backend sử dụng những công nghệ gì? Framework, database, thư viện quan trọng? File package.json chứa gì?

**Trả lời mong đợi:**
- Framework: Express.js (Node.js)
- Database: MongoDB với Mongoose ODM
- Authentication: JWT (jsonwebtoken), bcryptjs
- Real-time: Socket.IO
- Email: @sendgrid/mail, nodemailer, resend
- Utilities: moment-timezone, axios, node-cron
- File: `backend/package.json`

### Câu 32: Cấu trúc thư mục Backend
**Hỏi:** Cấu trúc thư mục backend như thế nào? Mỗi thư mục có chức năng gì? Tại sao tổ chức như vậy?

**Trả lời mong đợi:**
- `controllers/`: Xử lý business logic, nhận request và trả response
- `models/`: Định nghĩa schema MongoDB (Employee, Attendance, Payroll, ...)
- `routes/`: Định nghĩa API routes
- `middleware/`: Authentication, authorization, error handling
- `utils/`: Helper functions (salaryCalculator, attendanceHelper, timeMachine)
- `services/`: Business services (emailService, autoCompletionService)
- `socket/`: Socket.IO server

### Câu 33: Authentication và Authorization
**Hỏi:** Hệ thống xử lý authentication và authorization như thế nào? File nào chứa middleware? Có những role nào?

**Trả lời mong đợi:**
- File: `backend/middleware/authMiddleware.js`
- Authentication: JWT token trong header `Authorization: Bearer <token>`
- Roles: 'employee', 'accountant', 'manager'
- Middleware: `protect` (kiểm tra JWT), `restrictTo(...roles)` (kiểm tra role)
- File: `backend/controllers/authController.js` - login, register

### Câu 34: Xử lý lỗi và validation
**Hỏi:** Hệ thống xử lý lỗi và validation như thế nào? File nào chứa error handler? Có validation cho input không?

**Trả lời mong đợi:**
- File: `backend/middleware/errorHandler.js`
- Validation: express-validator (trong routes)
- Error handling: Try-catch trong controllers, errorHandler middleware catch tất cả
- Format: `{ success: false, message: '...', error: '...' }`

### Câu 35: Kết nối ESP32
**Hỏi:** Hệ thống kết nối với ESP32 như thế nào? Có cơ chế nào để ESP32 tự động tìm server không? File nào xử lý?

**Trả lời mong đợi:**
- ESP32 Registration: `POST /esp32-register` - ESP32 gửi IP của nó
- Discovery: `GET /esp32-discovery` - ESP32 lấy server URL
- Command Queue: ESP32 poll `GET /api/esp32/commands/poll` để nhận lệnh
- File: `backend/app.js` - dòng 158-219, 225-423

---

## PHẦN 5: CÔNG NGHỆ FRONTEND (5 câu)

### Câu 36: Stack công nghệ Frontend
**Hỏi:** Hệ thống frontend sử dụng những công nghệ gì? Framework, UI library, state management? File package.json chứa gì?

**Trả lời mong đợi:**
- Framework: React.js
- UI Library: Ant Design (antd)
- Routing: react-router-dom
- HTTP Client: axios
- Real-time: socket.io-client
- Charts: recharts
- Calendar: @fullcalendar/react
- File: `frontend/package.json`

### Câu 37: Quản lý state và context
**Hỏi:** Frontend quản lý state như thế nào? Có sử dụng Context API không? File nào chứa context?

**Trả lời mong đợi:**
- Context: `frontend/src/contexts/AuthContext.js` (authentication state)
- Context: `frontend/src/contexts/ViewModeContext.js` (view mode)
- Local state: useState, useEffect hooks
- Socket state: `frontend/src/hooks/useSocket.js`

### Câu 38: Component quan trọng
**Hỏi:** Component nào quan trọng nhất trong frontend? File nào? Chức năng gì?

**Trả lời mong đợi:**
- `frontend/src/pages/employee/EmployeeManagement.js`: Quản lý nhân viên, đăng ký vân tay
- `frontend/src/pages/payroll/PayrollManagement.js`: Quản lý bảng lương
- `frontend/src/pages/attendance/AttendanceManagement.js`: Quản lý chấm công
- `frontend/src/App.js`: Main app component, routing

### Câu 39: Tích hợp Socket.IO frontend
**Hỏi:** Frontend tích hợp Socket.IO như thế nào? File nào xử lý? Có hook custom không?

**Trả lời mong đợi:**
- File: `frontend/src/hooks/useSocket.js` - Custom hook để kết nối Socket.IO
- File: `frontend/src/services/api.js` - API service
- Event: Lắng nghe `new_attendance` để cập nhật real-time
- Sử dụng: Trong các component attendance để hiển thị chấm công mới ngay lập tức

### Câu 40: Cấu hình và quản lý API URL
**Hỏi:** Frontend quản lý API URL như thế nào? Có hỗ trợ nhiều môi trường (dev, production) không? File nào chứa config?

**Trả lời mong đợi:**
- File: `frontend/src/utils/configManager.js` - Quản lý API URL động
- File: `frontend/src/config.js` - Config cơ bản
- Hỗ trợ: Development, Production, có thể override qua localStorage
- Function: `getAPIUrl()`, `getConfig()`

---

## TỔNG KẾT

**Lưu ý cho sinh viên:**
- Chuẩn bị demo trực tiếp các tính năng quan trọng
- Giải thích rõ luồng dữ liệu từ ESP32 → Backend → Database → Frontend
- Hiểu rõ công thức tính lương và có thể tính tay một ví dụ
- Biết cách debug và xử lý lỗi trong từng module
- Giải thích được tại sao chọn các công nghệ này

**Điểm cần nhấn mạnh:**
- Logic nghiệp vụ phức tạp (chấm công, tính lương, phạt)
- Tích hợp phần cứng ESP32
- Real-time update với Socket.IO
- Security (JWT, phân quyền)
- Tính năng Time Machine để test

