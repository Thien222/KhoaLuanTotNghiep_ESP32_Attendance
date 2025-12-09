# DANH SÁCH USE CASE - HỆ THỐNG QUẢN LÝ NHÂN SỰ

| ID | Tên Use case | Mô tả ngắn gọn Use case | Chức năng | Ghi chú |
|----|--------------|-------------------------|-----------|---------|
| UC001 | Đăng nhập | Người dùng đăng nhập vào hệ thống bằng username và mật khẩu hợp lệ. | Xác thực tài khoản và phân quyền truy cập dashboard. | Áp dụng cho Nhân viên, Kế toán, Quản lý; yêu cầu có tài khoản. |
| UC002 | Xem ca làm | Nhân viên xem thông tin ca làm việc của mình (tên ca, giờ bắt đầu/kết thúc). | Hiển thị thông tin ca làm việc được gán cho nhân viên. | Nhân viên cần có ca làm việc được gán trong hệ thống. |
| UC003 | Gửi đơn | Nhân viên gửi đơn (đơn nghỉ phép, đơn xin OT) cho quản lý phê duyệt. | Tạo và lưu yêu cầu theo ngày bắt đầu/kết thúc, lý do. | Với đơn nghỉ phép, hệ thống kiểm tra số ngày phép còn lại trước khi lưu yêu cầu. |
| UC004 | Xem lịch sử chấm công | Người dùng xem lịch sử chấm công cá nhân theo khoảng thời gian. | Hiển thị bảng lịch sử chấm công theo bộ lọc. | Áp dụng cho Nhân viên và Quản lý (xem lịch sử của bản thân hoặc nhân viên phụ trách). |
| UC005 | Tương tác với chatbot | Người dùng đặt câu hỏi và nhận câu trả lời từ Chatbot AI. | Hỗ trợ trả lời các câu hỏi về quy định, chấm công, lương, nghỉ phép… | Cần đăng nhập hệ thống; chatbot có thể yêu cầu người dùng diễn đạt lại nếu không hiểu. |
| UC006 | Xem bảng lương | Người dùng xem chi tiết bảng lương của mình theo từng kỳ lương. | Tra cứu và hiển thị thông tin lương (lương cơ bản, phụ cấp, khấu trừ…). | Dữ liệu lương cho kỳ đã chọn phải tồn tại trong hệ thống. |
| UC007 | Thống kê lương | Kế toán/Quản lý xem thống kê lương của toàn bộ nhân viên. | Tổng hợp và hiển thị báo cáo, biểu đồ thống kê lương. | Chỉ Kế toán và Quản lý có quyền thực hiện; dùng cho báo cáo tổng hợp. |
| UC008 | Báo cáo chấm công | Quản lý xem báo cáo chấm công của nhân viên. | Tạo báo cáo chấm công và hiển thị kết quả (bảng, biểu đồ). | Chỉ Quản lý có quyền; dùng để đánh giá tình hình đi làm của nhân viên. |
| UC009 | Duyệt đơn | Quản lý duyệt hoặc từ chối các yêu cầu nghỉ phép pending. | Cập nhật trạng thái yêu cầu nghỉ phép và thông báo kết quả. | Yêu cầu nghỉ phép phải tồn tại và ở trạng thái chờ duyệt. |
| UC010 | Quản lý nhân sự | Quản lý thêm mới, chỉnh sửa, xóa thông tin hồ sơ nhân viên. | Quản lý danh sách nhân sự trong hệ thống. | Chỉ Quản lý được cấp quyền; thông tin cập nhật ảnh hưởng đến chấm công, lương. |
| UC011 | Quản lý nhân sự | Quản lý thêm mới, chỉnh sửa, xóa thông tin hồ sơ nhân viên. | Quản lý danh sách nhân sự trong hệ thống. | Chỉ Quản lý được cấp quyền; thông tin cập nhật ảnh hưởng đến chấm công, lương. |
| UC012 | Tính lương | Kế toán dùng dữ liệu chấm công để tính lương cho nhân viên theo kỳ. | Tự động tính lương và lưu kết quả bảng lương. | Chỉ thực hiện khi đã có đầy đủ dữ liệu chấm công; kết quả dùng cho các chức năng xem/thống kê lương. |
| UC013 | Duyệt đơn | Quản lý duyệt hoặc từ chối các yêu cầu nghỉ phép và đơn xin OT đang chờ duyệt. | Cập nhật trạng thái yêu cầu (approved/rejected) và thông báo kết quả cho nhân viên. | Yêu cầu phải tồn tại và ở trạng thái pending; chỉ Quản lý có quyền duyệt. |
| UC014 | Quản lý ca làm | Quản lý thiết lập các ca làm việc (tạo, sửa, xóa) và gán ca cho nhân viên với ngày bắt đầu hiệu lực. | Thêm, sửa, xóa thông tin ca làm (tên ca, giờ bắt đầu/kết thúc, grace period, loại ca) và quản lý việc gán ca. | Dữ liệu ca làm được dùng trong tính công, tính lương; không thể xóa ca đang được nhân viên sử dụng. |

---

## CHI TIẾT CÁC USE CASE

### UC001 - Đăng nhập
**Tác nhân:** Nhân viên, Kế toán, Quản lý  
**Mục đích:** Xác thực tài khoản và phân quyền truy cập dashboard  
**Điều kiện trước:** Có tài khoản trong hệ thống  
**Điều kiện sau:** Người dùng đăng nhập thành công và được chuyển đến dashboard tương ứng với quyền của mình

### UC002 - Xem ca làm
**Tác nhân:** Nhân viên  
**Mục đích:** Xem thông tin ca làm việc của mình (tên ca, giờ bắt đầu/kết thúc)  
**Điều kiện trước:** Đã đăng nhập, có role = 'employee'; có ca làm việc được gán  
**Điều kiện sau:** Hiển thị thông tin ca làm việc được gán cho nhân viên

### UC003 - Gửi đơn
**Tác nhân:** Nhân viên  
**Mục đích:** Tạo và gửi đơn nghỉ phép hoặc đơn xin OT cho quản lý phê duyệt  
**Điều kiện trước:** Đã đăng nhập, có role = 'employee'  
**Điều kiện sau:** Đơn được tạo và lưu với status = 'pending'  
**Lưu ý:** Với đơn nghỉ phép, hệ thống kiểm tra số ngày phép còn lại trước khi lưu yêu cầu

### UC004 - Xem lịch sử chấm công
**Tác nhân:** Nhân viên, Quản lý  
**Mục đích:** Xem lịch sử chấm công cá nhân hoặc của nhân viên phụ trách theo khoảng thời gian  
**Điều kiện trước:** Đã đăng nhập  
**Điều kiện sau:** Hiển thị bảng lịch sử chấm công với các bộ lọc

### UC005 - Tương tác với chatbot
**Tác nhân:** Người dùng (Nhân viên, Kế toán, Quản lý)  
**Mục đích:** Đặt câu hỏi và nhận câu trả lời từ Chatbot AI về quy định, chấm công, lương, nghỉ phép  
**Điều kiện trước:** Đã đăng nhập hệ thống  
**Điều kiện sau:** Nhận được câu trả lời từ chatbot  
**Lưu ý:** Chatbot có thể yêu cầu người dùng diễn đạt lại nếu không hiểu

### UC006 - Xem bảng lương
**Tác nhân:** Người dùng (Nhân viên, Kế toán, Quản lý)  
**Mục đích:** Xem chi tiết bảng lương của mình theo từng kỳ lương  
**Điều kiện trước:** Đã đăng nhập  
**Điều kiện sau:** Hiển thị thông tin lương chi tiết (lương cơ bản, phụ cấp, khấu trừ…)  
**Lưu ý:** Dữ liệu lương cho kỳ đã chọn phải tồn tại trong hệ thống

### UC007 - Thống kê lương
**Tác nhân:** Kế toán, Quản lý  
**Mục đích:** Xem thống kê lương của toàn bộ nhân viên  
**Điều kiện trước:** Đã đăng nhập, có role = 'accountant' hoặc 'manager'  
**Điều kiện sau:** Hiển thị báo cáo và biểu đồ thống kê lương  
**Lưu ý:** Chỉ Kế toán và Quản lý có quyền thực hiện; dùng cho báo cáo tổng hợp

### UC008 - Báo cáo chấm công
**Tác nhân:** Quản lý  
**Mục đích:** Xem báo cáo chấm công của nhân viên để đánh giá tình hình đi làm  
**Điều kiện trước:** Đã đăng nhập, có role = 'manager' hoặc 'admin'  
**Điều kiện sau:** Hiển thị báo cáo chấm công dưới dạng bảng và biểu đồ  
**Lưu ý:** Chỉ Quản lý có quyền; dùng để đánh giá tình hình đi làm của nhân viên

### UC009 - Duyệt đơn
**Tác nhân:** Quản lý  
**Mục đích:** Duyệt hoặc từ chối các yêu cầu nghỉ phép và đơn xin OT đang chờ duyệt  
**Điều kiện trước:** Đã đăng nhập, có role = 'manager' hoặc 'admin'; có yêu cầu ở trạng thái pending  
**Điều kiện sau:** Trạng thái yêu cầu được cập nhật và thông báo kết quả cho nhân viên  
**Lưu ý:** Yêu cầu nghỉ phép phải tồn tại và ở trạng thái chờ duyệt

### UC010 - Quản lý nhân sự
**Tác nhân:** Quản lý  
**Mục đích:** Thêm mới, chỉnh sửa, xóa thông tin hồ sơ nhân viên  
**Điều kiện trước:** Đã đăng nhập, có role = 'manager' hoặc 'admin'  
**Điều kiện sau:** Thông tin nhân viên được cập nhật trong hệ thống  
**Lưu ý:** Chỉ Quản lý được cấp quyền; thông tin cập nhật ảnh hưởng đến chấm công, lương

### UC011 - Quản lý nhân sự
**Tác nhân:** Quản lý  
**Mục đích:** Thêm mới, chỉnh sửa, xóa thông tin hồ sơ nhân viên  
**Điều kiện trước:** Đã đăng nhập, có role = 'manager' hoặc 'admin'  
**Điều kiện sau:** Thông tin nhân viên được cập nhật trong hệ thống  
**Lưu ý:** Chỉ Quản lý được cấp quyền; thông tin cập nhật ảnh hưởng đến chấm công, lương

### UC012 - Tính lương
**Tác nhân:** Kế toán  
**Mục đích:** Dùng dữ liệu chấm công để tính lương cho nhân viên theo kỳ  
**Điều kiện trước:** Đã đăng nhập, có role = 'accountant' hoặc 'manager'; đã có đầy đủ dữ liệu chấm công  
**Điều kiện sau:** Bảng lương được tính toán và lưu với status = 'draft'  
**Lưu ý:** Chỉ thực hiện khi đã có đầy đủ dữ liệu chấm công; kết quả dùng cho các chức năng xem/thống kê lương

### UC013 - Duyệt đơn
**Tác nhân:** Quản lý  
**Mục đích:** Duyệt hoặc từ chối các yêu cầu nghỉ phép và đơn xin OT đang chờ duyệt  
**Điều kiện trước:** Đã đăng nhập, có role = 'manager' hoặc 'admin'; có yêu cầu ở trạng thái pending  
**Điều kiện sau:** Trạng thái yêu cầu được cập nhật và thông báo kết quả cho nhân viên  
**Lưu ý:** Yêu cầu phải tồn tại và ở trạng thái pending; chỉ Quản lý có quyền duyệt

### UC014 - Quản lý ca làm
**Tác nhân:** Quản lý  
**Mục đích:** Thiết lập các ca làm việc (tạo, sửa, xóa) và gán ca cho nhân viên với ngày bắt đầu hiệu lực  
**Điều kiện trước:** Đã đăng nhập, có role = 'manager' hoặc 'admin'  
**Điều kiện sau:** Ca làm việc được quản lý và gán cho nhân viên  
**Lưu ý:** Dữ liệu ca làm được dùng trong tính công, tính lương; không thể xóa ca đang được nhân viên sử dụng

