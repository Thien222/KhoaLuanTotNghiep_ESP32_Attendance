# ĐẶC TẢ USE CASE - HỆ THỐNG QUẢN LÝ NHÂN SỰ

## Use case: Chấm công bằng vân tay

**Mục đích:** Nhân viên chấm công bằng cách quét vân tay trên thiết bị ESP32.

**Mô tả:** Nhân viên quét vân tay trên ESP32. Hệ thống tự động xác định check-in hoặc check-out dựa trên trạng thái hiện tại, validate thời gian, tính toán late/early minutes, penalties, working hours, OT, và cập nhật Attendance record.

**Tác nhân:** Nhân viên

**Điều kiện trước:** Đã đăng ký vân tay (fingerprintEnrolled = true), ESP32 đã được cấu hình và kết nối.

**Điều kiện sau:** Attendance record được tạo/cập nhật, ESP32 hiển thị thông báo cho nhân viên.

**Luồng sự kiện chính (Basic flows):**

| Actor | System |
|-------|--------|
| 1. Quét vân tay trên ESP32. | |
| | 2. Hệ thống tìm Employee, kiểm tra fingerprintEnrolled, chống spam (3 phút). |
| | 3. Hệ thống tự động xác định action: chưa có record → check-in, đã check-in → check-out, đã xong → bỏ qua. |
| | 4. Nếu check-in: validate giờ mở cổng, tính late minutes và penalty, tạo Attendance record. |
| | 5. Nếu check-out: validate thời gian và OT approved (nếu sau giờ OT), tính early minutes, working hours, OT hours, OT salary, cập nhật Attendance record. |
| | 6. Hệ thống trả về response cho ESP32. |

**Luồng sự kiện phụ (Alternative flows):**

2.1. Không tìm thấy Employee hoặc chưa enroll vân tay → Hệ thống trả về lỗi tương ứng.
2.2. Thao tác trong vòng 3 phút → Hệ thống trả về "Da cham cong roi".
4.1. Giờ check-in < giờ mở cổng → Hệ thống trả về "Not working hours yet".
5.1. Chưa check-in hoặc không có OT approved khi check-out sau giờ OT → Hệ thống trả về lỗi tương ứng.

---

## Use case: Gửi đơn

**Mục đích:** Nhân viên gửi đơn xin nghỉ phép hoặc đơn đăng ký làm thêm giờ (OT) để được quản lý duyệt.

**Mô tả:** Nhân viên có thể gửi đơn nghỉ phép (với thông tin loại nghỉ, ngày bắt đầu/kết thúc, lý do) hoặc đơn đăng ký OT (chọn ngày và nhập lý do). Hệ thống tạo Leave request hoặc OvertimeRequest với status = 'pending'.

**Tác nhân:** Nhân viên

**Điều kiện trước:** Đã đăng nhập, có role = 'employee', tài khoản đã được liên kết với Employee record.

**Điều kiện sau:** Đơn được tạo và gửi đến quản lý để duyệt.

**Luồng sự kiện chính (Basic flows):**

| Actor | System |
|-------|--------|
| 1. Vào trang "Xin nghỉ phép" hoặc "Đăng ký làm thêm giờ", điền form và click "Gửi đơn". | |
| | 2. Nếu đơn nghỉ phép: Hệ thống validate ngày, tính tổng số ngày nghỉ, tạo Leave request (status = 'pending'). |
| | 3. Nếu đơn OT: Hệ thống tự động xác định khung giờ OT từ ca làm việc, kiểm tra trùng lặp, tạo OvertimeRequest (status = 'pending'). |
| | 4. Hệ thống lưu vào database và thông báo thành công. |

**Luồng sự kiện phụ (Alternative flows):**

3.1. (Nghỉ phép) Ngày kết thúc < ngày bắt đầu → Hệ thống trả về lỗi: "Ngày kết thúc phải sau ngày bắt đầu".

3.1. (OT) Đã có đơn OT pending/approved cho ngày này → Hệ thống trả về lỗi: "Bạn đã có đơn OT đang chờ duyệt/đã được duyệt cho ngày này".
3.2. (OT) Không thể xác định khung giờ OT → Hệ thống trả về lỗi: "Không thể xác định khung giờ OT. Vui lòng kiểm tra cài đặt hệ thống.".

---

## Use case: Xem lịch sử chấm công

**Mục đích:** Nhân viên xem lịch sử chấm công của mình theo khoảng thời gian.

**Mô tả:** Nhân viên chọn khoảng thời gian để xem danh sách các bản ghi chấm công, bao gồm ngày, giờ vào/ra, trạng thái, giờ làm, OT, và phạt.

**Tác nhân:** Nhân viên

**Điều kiện trước:** Đã đăng nhập, có role = 'employee', tài khoản đã được liên kết với Employee record.

**Điều kiện sau:** Nhân viên xem được lịch sử chấm công chi tiết.

**Luồng sự kiện chính (Basic flows):**

| Actor | System |
|-------|--------|
| 1. Vào trang "Lịch sử chấm công" và chọn khoảng thời gian. | |
| | 2. Hệ thống lấy Attendance records của nhân viên trong khoảng thời gian, sắp xếp và hiển thị danh sách. |

**Luồng sự kiện phụ (Alternative flows):**

2.1. Không tìm thấy Attendance records → Hệ thống hiển thị: "Không có dữ liệu chấm công trong khoảng thời gian này".

---

## Use case: Tương tác với chatbot

**Mục đích:** Nhân viên tương tác với chatbot AI để hỏi về lương, chấm công, nghỉ phép, và các thông tin nhân sự khác.

**Mô tả:** Nhân viên nhập câu hỏi vào chatbot. Hệ thống phân tích intent bằng LLM (OpenAI) hoặc NLU fallback, xử lý intent tương ứng, và trả về câu trả lời.

**Tác nhân:** Nhân viên

**Điều kiện trước:** Đã đăng nhập, profile đã hoàn thiện (profileCompleted = true), hệ thống có cấu hình LLM service.

**Điều kiện sau:** Nhân viên nhận được câu trả lời từ chatbot.

**Luồng sự kiện chính (Basic flows):**

| Actor | System |
|-------|--------|
| 1. Vào trang "Chatbot" và nhập câu hỏi. | |
| 2. Click nút "Gửi". | |
| | 3. Hệ thống phân tích intent bằng LLM hoặc NLU, xử lý intent và lấy dữ liệu từ database. |
| | 4. Hệ thống trả về và hiển thị reply trong chat. |

**Luồng sự kiện phụ (Alternative flows):**

3.1. profileCompleted = false → Hệ thống trả về lỗi: "Vui lòng hoàn thiện hồ sơ trước khi sử dụng chatbot".
3.2. Không phân tích được intent → Hệ thống trả về helpText với danh sách câu hỏi hỗ trợ.

---

## Use case: Tính lương

**Mục đích:** Kế toán tính lương cho nhân viên hoặc tất cả nhân viên theo tháng.

**Mô tả:** Kế toán chọn tháng/năm và phạm vi (một nhân viên hoặc tất cả). Hệ thống tính lương dựa trên dữ liệu chấm công, nghỉ phép, và các quy định lương, sau đó lưu Payroll record với status = 'draft'.

**Tác nhân:** Kế toán

**Điều kiện trước:** Đã đăng nhập, có role = 'accountant' hoặc 'manager' hoặc 'admin'.

**Điều kiện sau:** Payroll records được tạo/cập nhật với status = 'draft', kế toán có thể xem và điều chỉnh bảng lương.

**Luồng sự kiện chính (Basic flows):**

| Actor | System |
|-------|--------|
| 1. Vào trang "Tính lương", chọn tháng/năm và phạm vi (một nhân viên hoặc tất cả). | |
| 2. Click nút "Tính lương". | |
| | 3. Hệ thống tính lương cho mỗi nhân viên: lấy Attendance records, tính workingDays, latePenalty, overtimePay, phụ cấp, khấu trừ, grossSalary, netSalary. |
| | 4. Hệ thống lưu Payroll record (status = 'draft') và hiển thị kết quả. |

**Luồng sự kiện phụ (Alternative flows):**

3.1. Lỗi khi tính lương cho một nhân viên → Hệ thống ghi lại lỗi và tiếp tục với nhân viên khác, kết quả trả về bao gồm danh sách lỗi.

**Công thức:** Monthly Salary = (Basic Salary * (Work Days / 30)) + (OT Rate * OT Hours * OT Price_Per_Hour) + Allowance - Penalties - Tax

---

## Use case: Quản lý chấm công

**Mục đích:** Quản lý xem, chỉnh sửa, và quản lý dữ liệu chấm công của tất cả nhân viên.

**Mô tả:** Quản lý có thể xem danh sách chấm công, chỉnh sửa giờ vào/ra thủ công, và xóa bản ghi chấm công.

**Tác nhân:** Quản lý

**Điều kiện trước:** Đã đăng nhập, có role = 'manager' hoặc 'admin'.

**Điều kiện sau:** Quản lý quản lý được dữ liệu chấm công của tất cả nhân viên.

**Luồng sự kiện chính (Basic flows):**

| Actor | System |
|-------|--------|
| 1. Vào trang "Quản lý chấm công" và chọn khoảng thời gian, phòng ban (tùy chọn). | |
| | 2. Hệ thống lấy tất cả Attendance records và hiển thị bảng chấm công. |
| 3. Chọn bản ghi và thực hiện: Xem chi tiết / Chỉnh sửa (nhập giờ vào/ra mới) / Xóa (xác nhận). | |
| | 4. Nếu chỉnh sửa: Hệ thống validate thời gian, tính lại late/early minutes, penalties, working hours, OT, cập nhật Attendance record. |
| | 5. Nếu xóa: Hệ thống xóa Attendance record. |
| | 6. Hệ thống thông báo thành công. |

**Luồng sự kiện phụ (Alternative flows):**

2.1. Giờ vào < giờ mở cổng hoặc giờ ra sau giờ OT nhưng không có OT approved → Hệ thống trả về lỗi tương ứng.

---

## Use case: Quản lý nhân sự

**Mục đích:** Quản lý quản lý thông tin nhân viên: thêm, sửa, xóa, xem danh sách, đăng ký vân tay.

**Mô tả:** Quản lý có thể thêm nhân viên mới, cập nhật thông tin nhân viên, vô hiệu hóa nhân viên, xem danh sách nhân viên, và đăng ký vân tay cho nhân viên.

**Tác nhân:** Quản lý

**Điều kiện trước:** Đã đăng nhập, có role = 'manager' hoặc 'admin'.

**Điều kiện sau:** Quản lý quản lý được thông tin nhân viên.

**Luồng sự kiện chính (Basic flows):**

| Actor | System |
|-------|--------|
| 1. Vào trang "Quản lý nhân sự" và thực hiện: | |
|    - Thêm: Click "Thêm nhân viên", điền form và click "Lưu" | |
|    - Cập nhật: Chọn nhân viên, click "Chỉnh sửa", cập nhật thông tin và click "Lưu" | |
|    - Vô hiệu hóa: Chọn nhân viên, click "Vô hiệu hóa" và xác nhận | |
|    - Đăng ký vân tay: Chọn nhân viên và click "Đăng ký vân tay" | |
| | 2. Nếu thêm: Hệ thống tự động tạo employeeId, fingerprintId, tạo Employee record. |
| | 3. Nếu cập nhật: Hệ thống validate, cập nhật Employee record. |
| | 4. Nếu vô hiệu hóa: Hệ thống cập nhật status = 'inactive'. |
| | 5. Nếu đăng ký vân tay: Hệ thống gửi lệnh đến ESP32, nhân viên quét vân tay, ESP32 gửi template về server, cập nhật fingerprintTemplate và fingerprintEnrolled = true. |
| | 6. Hệ thống thông báo thành công. |

**Luồng sự kiện phụ (Alternative flows):**

2.1. Email đã tồn tại → Hệ thống trả về lỗi: "Email đã được sử dụng".
2.2. ESP32 không phản hồi → Hệ thống trả về lỗi: "Không thể kết nối với thiết bị".

---

## Use case: Quản lý ca làm việc

**Mục đích:** Quản lý tạo, cập nhật, xóa ca làm việc và gán ca cho nhân viên.

**Mô tả:** Quản lý có thể tạo ca làm việc mới với thông tin tên ca, giờ bắt đầu/kết thúc, grace period, cập nhật hoặc xóa ca, và gán ca cho nhân viên với ngày bắt đầu hiệu lực.

**Tác nhân:** Quản lý

**Điều kiện trước:** Đã đăng nhập, có role = 'manager' hoặc 'admin'.

**Điều kiện sau:** Quản lý quản lý được ca làm việc và gán ca cho nhân viên.

**Luồng sự kiện chính (Basic flows):**

| Actor | System |
|-------|--------|
| 1. Vào trang "Quản lý ca làm việc" và thực hiện: | |
|    - Tạo ca: Click "Tạo ca mới", điền form (tên ca, giờ bắt đầu/kết thúc, grace period) và click "Lưu" | |
|    - Cập nhật/Xóa: Chọn ca, click "Chỉnh sửa" hoặc "Xóa", cập nhật/xác nhận | |
|    - Gán ca: Chọn ca, click "Gán cho nhân viên", chọn danh sách nhân viên và ngày bắt đầu, click "Gán" | |
| | 2. Nếu tạo ca: Hệ thống validate, tạo Shift record. |
| | 3. Nếu cập nhật/xóa: Hệ thống kiểm tra (nếu xóa: có nhân viên đang sử dụng không), cập nhật hoặc xóa Shift record. |
| | 4. Nếu gán ca: Hệ thống deactivate EmployeeShift cũ, tạo EmployeeShift mới cho mỗi nhân viên. |
| | 5. Hệ thống thông báo thành công. |

**Luồng sự kiện phụ (Alternative flows):**

2.1. Tên ca đã tồn tại → Hệ thống trả về lỗi: "Tên ca đã tồn tại".
2.2. Có nhân viên đang sử dụng ca khi xóa → Hệ thống trả về lỗi: "Không thể xóa ca. Đang được gán cho X nhân viên".

---

## TỔNG KẾT

### Phân quyền
- **NhanVien (employee):** Chỉ xem và thao tác với dữ liệu của chính mình
- **KeToan (accountant):** Xem và tính lương cho tất cả nhân viên
- **QuanLi (manager/admin):** Toàn quyền quản lý hệ thống

### Công nghệ
- Backend: Node.js, Express, MongoDB, Mongoose
- Authentication: JWT
- Fingerprint: ESP32 với module vân tay
- AI Chatbot: OpenAI GPT-4o-mini hoặc NLU service
- Frontend: React (web), React Native (mobile)
