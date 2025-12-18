# Biểu đồ Hoạt động (Activity Diagrams) - Tiếng Việt

Tài liệu này chứa các biểu đồ hoạt động được vẽ lại dựa trên đặc tả hệ thống, đã được chuyển ngữ sang tiếng Việt.

## 3.4.1 UC003 - Gửi đơn

```mermaid
graph TD
    |Nhân viên|
    Start((Bắt đầu)) --> A[Truy cập trang 'Xin nghỉ phép' hoặc 'Đăng ký làm thêm']
    A --> B{Điền form và nhấn 'Gửi đơn'}
    
    |Hệ thống|
    B --> C{Loại đơn?}
    C -- Nghỉ phép --> D[Validate ngày, tính tổng ngày nghỉ]
    D --> E[Tạo Yêu cầu nghỉ phép <br/>(trạng thái = 'chờ duyệt')]
    
    C -- Làm thêm giờ (OT) --> F[Xác định khung giờ OT từ ca làm]
    F --> G[Kiểm tra trùng lặp]
    G --> H[Tạo Yêu cầu làm thêm giờ <br/>(trạng thái = 'chờ duyệt')]
    
    E --> I[Lưu vào cơ sở dữ liệu và thông báo thành công]
    H --> I
    I --> End((Kết thúc))
```

## 3.4.2 UC004 - Xem lịch sử chấm công

```mermaid
graph TD
    |Nhân viên/Quản lý|
    Start((Bắt đầu)) --> A[Vào trang 'Lịch sử chấm công' và chọn khoảng thời gian]
    
    |Hệ thống|
    A --> B[Lấy danh sách Bản ghi chấm công trong khoảng thời gian]
    B --> C[Sắp xếp và hiển thị danh sách]
    C --> D{Có dữ liệu không?}
    D -- Không --> E[Hiển thị 'Không có dữ liệu']
    D -- Có --> F[Hiển thị danh sách chấm công]
    E --> End((Kết thúc))
    F --> End
```

## 3.4.3 UC005 - Tương tác với Chatbot

```mermaid
graph TD
    |Người dùng|
    Start((Bắt đầu)) --> A[Mở giao diện chat]
    
    |Hệ thống|
    A --> B[Hiển thị cửa sổ chat]
    
    |Người dùng|
    B --> C[Nhập câu hỏi hoặc yêu cầu]
    C --> D[Gửi tin nhắn]
    
    |Hệ thống|
    D --> E[Xử lý tin nhắn bằng AI]
    E --> F[ChatBot phân tích ý định và tạo câu trả lời]
    F --> G{Hiểu câu hỏi?}
    G -- Có --> H[Hiển thị câu trả lời]
    G -- Không --> I[Yêu cầu người dùng diễn đạt lại]
    
    H --> End((Kết thúc))
    I --> End
```

## 3.4.4 UC006 - Chấm công bằng vân tay

```mermaid
graph TD
    |Nhân viên|
    Start((Bắt đầu)) --> A[Đặt ngón tay lên thiết bị]
    
    |Hệ thống|
    A --> B[Tìm Nhân viên, kiểm tra đăng ký vân tay]
    B --> C[Chống spam]
    C --> D{Xác định hành động}
    
    D -- Chưa có bản ghi hôm nay --> E[Check-in (Vào)]
    D -- Đã check-in chưa check-out --> F[Check-out (Ra)]
    D -- Đã có cả hai --> G[Bỏ qua]
    
    E --> H[Validate thời gian (giờ mở cổng)]
    H --> I[Tính phút đi muộn và tiền phạt]
    I --> J[Tạo Bản ghi chấm công mới]
    
    F --> K[Validate thời gian]
    K --> L[Kiểm tra duyệt OT (nếu sau giờ OT)]
    L --> M[Tính phút về sớm, giờ làm việc, giờ OT, lương OT]
    M --> N[Cập nhật Bản ghi chấm công]
    
    J --> O[Trả về phản hồi cho thiết bị ESP32]
    N --> O
    G --> O
    O --> End((Kết thúc))
```

## 3.4.5 UC008 - Quản lý chấm công

```mermaid
graph TD
    |Quản lý|
    Start((Bắt đầu)) --> A[Vào trang 'Quản lý chấm công', chọn thời gian/phòng ban]
    
    |Hệ thống|
    A --> B[Lấy tất cả Bản ghi chấm công]
    B --> C[Hiển thị bảng chấm công]
    
    |Quản lý|
    C --> D[Chọn bản ghi và thực hiện hành động]
    D --> E{Hành động?}
    
    E -- Chỉnh sửa --> F[Nhập giờ vào/ra mới]
    E -- Xóa --> G[Xác nhận xóa]
    E -- Xem chi tiết --> H[Hiển thị chi tiết]
    
    |Hệ thống|
    F --> I[Validate thời gian]
    I --> J[Tính lại đi muộn/về sớm, phạt, giờ làm, OT]
    J --> K[Cập nhật Bản ghi chấm công]
    
    G --> L[Xóa Bản ghi chấm công]
    
    K --> M[Thông báo thành công]
    L --> M
    H --> End((Kết thúc))
    M --> End
```

## 3.4.6 UC009 - Quản lý nhân sự

```mermaid
graph TD
    |Quản lý|
    Start((Bắt đầu)) --> A[Vào trang 'Quản lý nhân sự']
    A --> B{Chọn hành động}
    
    B -- Thêm nhân viên --> C[Điền form và click 'Lưu']
    B -- Cập nhật --> D[Chọn nhân viên, sửa và click 'Lưu']
    B -- Vô hiệu hóa --> E[Chọn nhân viên, click 'Vô hiệu hóa']
    B -- Đăng ký vân tay --> F[Chọn nhân viên, click 'Đăng ký vân tay']
    
    |Hệ thống|
    C --> G[Tạo mã nhân viên, mã vân tay, tạo Hồ sơ nhân viên]
    D --> H[Validate và cập nhật Hồ sơ nhân viên]
    E --> I[Cập nhật trạng thái = 'ngưng hoạt động']
    
    F --> J[Gửi lệnh đến thiết bị ESP32]
    J --> K[Nhân viên quét vân tay trên ESP32]
    K --> L[ESP32 gửi mẫu vân tay về server]
    L --> M[Cập nhật Mẫu vân tay và trạng thái đã đăng ký]
    
    G --> N[Thông báo thành công]
    H --> N
    I --> N
    M --> N
    N --> End((Kết thúc))
```

## 3.4.7 UC010 - Quản lý ca làm

```mermaid
graph TD
    |Quản lý|
    Start((Bắt đầu)) --> A[Vào trang 'Quản lý ca làm việc']
    A --> B{Chọn hành động}
    
    B -- Tạo ca mới --> C[Điền form (tên, giờ, thời gian ân hạn) và Lưu]
    B -- Cập nhật/Xóa --> D[Chọn ca, sửa hoặc xóa và xác nhận]
    B -- Gán ca --> E[Chọn ca, chọn nhân viên và ngày bắt đầu]
    
    |Hệ thống|
    C --> F[Validate và tạo Bản ghi Ca làm việc]
    D --> G[Kiểm tra ràng buộc (nhân viên đang dùng)]
    G --> H[Cập nhật hoặc xóa Bản ghi Ca làm việc]
    
    E --> I[Vô hiệu hóa Ca nhân viên cũ]
    I --> J[Tạo Ca nhân viên mới cho mỗi nhân viên]
    
    F --> K[Thông báo thành công]
    H --> K
    J --> K
    K --> End((Kết thúc))
```

## 3.4.8 UC011 - Tính lương

```mermaid
graph TD
    |Kế toán|
    Start((Bắt đầu)) --> A[Vào trang 'Tính lương', chọn tháng/năm và phạm vi]
    A --> B[Click nút 'Tính lương']
    
    |Hệ thống|
    B --> C[Lặp qua danh sách nhân viên]
    C --> D[Lấy các Bản ghi chấm công]
    D --> E[Tính ngày công làm việc]
    E --> F[Tính tiền phạt đi muộn]
    F --> G[Tính tiền làm thêm giờ (OT)]
    G --> H[Tính phụ cấp và khấu trừ]
    H --> I[Tính Lương gộp (Gross Salary)]
    I --> J[Tính Lương thực nhận (Net Salary)]
    J --> K[Lưu bảng lương]
    
    K --> L{Còn nhân viên?}
    L -- Có --> C
    L -- Không --> M[Thông báo hoàn tất]
    M --> End((Kết thúc))
```
