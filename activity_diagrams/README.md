# Activity Diagrams - Hệ thống Quản lý Nhân sự

Thư mục này chứa các file PlantUML (.puml) cho 14 use case chính của hệ thống.

## Danh sách các file:

1. `UC001_DangNhap.puml` - Đăng nhập
2. `UC002_XemCaLam.puml` - Xem ca làm (Chấm công bằng vân tay)
3. `UC003_XemBangLuong.puml` - Xem bảng lương (Gửi đơn nghỉ phép/OT)
4. `UC004_GuiDon.puml` - Gửi đơn (Xem lịch sử chấm công)
5. `UC005_XemLichSuChamCong.puml` - Xem lịch sử chấm công (Tương tác với chatbot)
6. `UC006_ChamCongVanTay.puml` - Chấm công bằng vân tay (Xem bảng lương)
7. `UC007_TuongTacChatbot.puml` - Tương tác với chatbot (Thống kê lương)
8. `UC008_ChatNoiBo.puml` - Chat nội bộ (Báo cáo chấm công)
9. `UC009_TinhLuong.puml` - Tính lương (Duyệt đơn)
10. `UC010_ThongKeLuong.puml` - Thống kê lương (Quản lý nhân sự)
11. `UC011_QuanLyNhanSu.puml` - Quản lý nhân sự (Quản lý ca làm)
12. `UC012_QuanLyChamCong.puml` - Quản lí chấm công
13. `UC013_DuyetDon.puml` - Duyệt đơn (Tính lương)
14. `UC014_QuanLyCaLam.puml` - Quản lý ca làm

## Cách sử dụng:

### Cách 1: PlantUML Online Editor
1. Truy cập: http://www.plantuml.com/plantuml/uml/
2. Copy nội dung file .puml
3. Paste vào editor
4. Click "Submit" để xem sơ đồ
5. Click "Download PNG" hoặc "Download SVG" để tải ảnh

### Cách 2: VS Code Extension
1. Cài đặt extension "PlantUML" trong VS Code
2. Mở file .puml
3. Nhấn `Alt + D` để preview
4. Right-click → "Export Current Diagram" để xuất ảnh

### Cách 3: Command Line (nếu đã cài Java và PlantUML)
```bash
java -jar plantuml.jar activity_diagrams/*.puml
```

### Cách 4: PlantUML Server (local)
```bash
# Cài đặt PlantUML server
npm install -g node-plantuml

# Generate ảnh
puml generate activity_diagrams/*.puml
```

## Ký hiệu trong sơ đồ:

- **Swimlanes**: Phân chia Actor và System
  - Màu xanh nhạt (#E3F2FD): Actor
  - Màu cam nhạt (#FFF3E0): System

- **Activity**: Hình chữ nhật bo tròn - các hành động
- **Decision**: Hình thoi - các điều kiện rẽ nhánh
- **Start/Stop**: Điểm bắt đầu/kết thúc
- **Repeat**: Vòng lặp xử lý

## Lưu ý:

- Tất cả các file đều sử dụng theme "plain" để dễ đọc
- Font size và màu sắc đã được tối ưu cho việc in ấn
- Có thể chỉnh sửa trực tiếp trong file .puml để thay đổi nội dung
- Mỗi use case đều có xử lý lỗi và các luồng thay thế
