# Chính sách Nhân sự (Demo)

## Nghỉ phép
- Mỗi tháng tối đa **3 ngày nghỉ**. Nếu vượt quá, hệ thống sẽ **gắn cờ/đề xuất kỷ luật** theo `termination_if_exceed_leave`.
- Mỗi ngày nghỉ **trừ 1 ngày công** khỏi lương tháng (`leave_deduction_per_day`).
- Công chuẩn mặc định: **26 ngày/tháng** (`working_days_per_month_default`).

## Chấm công & Điểm danh
- Một nhân viên **được coi là đã điểm danh** nếu có bản ghi Attendance với `status` là `present` hoặc `half-day` (*và có check-in*).
- Không có bản ghi hoặc `status = absent` coi như **chưa điểm danh**.

## Tính lương (đơn giản)
- `lương/ngày = baseSalary / công_chuẩn`.
- `net = baseSalary - lương/ngày * leave_days`.
