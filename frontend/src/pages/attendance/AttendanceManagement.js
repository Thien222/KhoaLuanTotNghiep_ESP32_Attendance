// import React, { useState, useEffect } from 'react';
// import { 
//   Table, 
//   Button, 
//   Space, 
//   DatePicker, 
//   Card, 
//   Typography,
//   Tag,
//   message,
//   Modal,
//   Form,
//   Row,
//   Col,
//   Statistic,
//   TimePicker,
//   Divider,
//   Alert,
//   Select
// } from 'antd';
// import { 
//   ClockCircleOutlined, 
//   CheckCircleOutlined,
//   CloseCircleOutlined,
//   UserOutlined,
//   SafetyCertificateOutlined,
//   WifiOutlined
// } from '@ant-design/icons';
// import axios from 'axios';
// import moment from 'moment';
// import { getESP32Url, getAPIUrl } from '../../utils/configManager';

// const { Title } = Typography;
// const { RangePicker } = DatePicker;

// const AttendanceManagement = () => {
//   const [attendances, setAttendances] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [dateRange, setDateRange] = useState([moment().subtract(7, 'days'), moment()]);
//   const [modalVisible, setModalVisible] = useState(false);
//   const [form] = Form.useForm();
//   const [esp32Connected, setEsp32Connected] = useState(false);
//   const [previewData, setPreviewData] = useState(null);
//   const [previewLoading, setPreviewLoading] = useState(false);
//   const [employees, setEmployees] = useState([]);
//   const [isOvernightShift, setIsOvernightShift] = useState(false);

//   useEffect(() => {
//     fetchAttendances();
//     checkESP32Connection();
//     fetchEmployees();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [dateRange]);

//   const fetchEmployees = async () => {
//     try {
//       const API_URL = getAPIUrl();
//       const response = await axios.get(`${API_URL}/employees`, {
//         headers: {
//           'Authorization': `Bearer ${localStorage.getItem('token')}`
//         }
//       });
//       if (response.data.success) {
//         setEmployees(response.data.data || []);
//       }
//     } catch (error) {
//       console.error('Error fetching employees:', error);
//     }
//   };

//   const checkESP32Connection = async () => {
//     try {
//       const esp32Url = getESP32Url();
//       const response = await axios.get(`${esp32Url}/healthz`);
//       setEsp32Connected(response.status === 200);
//     } catch (error) {
//       setEsp32Connected(false);
//     }
//   };

//   const fetchAttendances = async () => {
//     setLoading(true);
//     try {
//       const API_URL = getAPIUrl();
//       const token = localStorage.getItem('token');
      
//       if (!token) {
//         message.error('Chưa đăng nhập. Vui lòng đăng nhập lại.');
//         setTimeout(() => {
//           window.location.href = '/login';
//         }, 1500);
//         return;
//       }
      
//       // Check if token might be expired
//       try {
//         const payload = JSON.parse(atob(token.split('.')[1]));
//         const exp = payload.exp * 1000;
//         if (Date.now() >= exp) {
//           message.error('Token đã hết hạn. Vui lòng đăng nhập lại.');
//           localStorage.removeItem('token');
//           localStorage.removeItem('user');
//           setTimeout(() => {
//             window.location.href = '/login';
//           }, 1500);
//           return;
//         }
//       } catch (e) {
//         // Token format invalid, try anyway
//         console.warn('Could not parse token:', e);
//       }
      
//       const startDate = dateRange[0].format('YYYY-MM-DD');
//       const endDate = dateRange[1].format('YYYY-MM-DD');
      
//       console.log('📤 Fetching attendances:', { API_URL, startDate, endDate, hasToken: !!token });
      
//       const response = await axios.get(`${API_URL}/attendance`, {
//         params: { startDate, endDate },
//         headers: {
//           Authorization: `Bearer ${token}`
//         }
//       });
      
//       console.log('✅ Attendance response:', response.data);
      
//       if (response.data.success) {
//         setAttendances(response.data.data || []);
//       } else {
//         message.error(response.data.message || 'Lỗi khi tải dữ liệu');
//       }
//     } catch (error) {
//       console.error('Error fetching attendances:', error);
//       const errorMessage = error.response?.data?.message || 'Lỗi khi tải dữ liệu chấm công';
      
//       // If 401, token is invalid or expired
//       if (error.response?.status === 401) {
//         message.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
//         localStorage.removeItem('token');
//         localStorage.removeItem('user');
//         setTimeout(() => {
//           window.location.href = '/login';
//         }, 1500);
//       } else {
//         message.error(errorMessage);
//       }
      
//       setAttendances([]); // Set empty array on error
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleManualCheckIn = () => {
//     setModalVisible(true);
//   };

//   // Auto-fill existing attendance data when employee and date are selected
//   const autoFillExistingData = async (employeeId, date) => {
//     if (!employeeId || !date) return;
    
//     try {
//       const dateStr = moment(date).format('YYYY-MM-DD');
//       // Find existing attendance for this employee on this date
//       const existingAttendance = attendances.find(att => 
//         att.employee?._id === employeeId && 
//         moment(att.date).format('YYYY-MM-DD') === dateStr
//       );
      
//       if (existingAttendance) {
//         console.log('Found existing attendance, auto-filling:', existingAttendance);
        
//         // Auto-fill the time fields
//         const formValues = {
//           employeeId: employeeId,
//           date: date
//         };
        
//         if (existingAttendance.checkIn?.time) {
//           const checkInTime = moment(existingAttendance.checkIn.time);
//           formValues.checkInTime = checkInTime;
//         }
        
//         if (existingAttendance.checkOut?.time) {
//           const checkOutTime = moment(existingAttendance.checkOut.time);
//           formValues.checkOutTime = checkOutTime;
//         }
        
//         form.setFieldsValue(formValues);
        
//         // Trigger preview calculation
//         if (formValues.checkInTime && formValues.checkOutTime) {
//           calculatePreview(formValues);
//         }
//       }
//     } catch (error) {
//       console.error('Error auto-filling existing data:', error);
//     }
//   };

//   // Calculate preview when form values change
//   const calculatePreview = async (values) => {
//     if (!values.date || !values.checkInTime || !values.checkOutTime || !values.employeeId) {
//       setPreviewData(null);
//       setIsOvernightShift(false);
//       return;
//     }
    
//     // Validate time values
//     if (!moment(values.checkInTime).isValid() || !moment(values.checkOutTime).isValid()) {
//       console.warn('Invalid time values:', { checkInTime: values.checkInTime, checkOutTime: values.checkOutTime });
//       setPreviewData(null);
//       setIsOvernightShift(false);
//       return;
//     }
    
//     // Detect overnight shift
//     const isOvernight = detectOvernightShift(values.checkInTime, values.checkOutTime);
//     setIsOvernightShift(isOvernight);
    
//     try {
//       setPreviewLoading(true);
//       const API_URL = getAPIUrl();
      
//       // Format: date = "YYYY-MM-DD", time = "HH:mm"
//       const dateStr = moment(values.date).format('YYYY-MM-DD');
//       const checkInTimeStr = moment(values.checkInTime).format('HH:mm');
//       const checkOutTimeStr = moment(values.checkOutTime).format('HH:mm');
      
//       // Backend sẽ tự động xử lý ca qua đêm (nếu giờ ra <= giờ vào thì cộng 1 ngày)
//       // Frontend chỉ cần gửi giờ vào/ra, backend sẽ tự tính toán
      
//       console.log('Calculating preview:', {
//         userId: values.employeeId,
//         date: dateStr,
//         checkInTime: checkInTimeStr,
//         checkOutTime: checkOutTimeStr,
//         isOvernightShift: isOvernight,
//         preview: true
//       });
      
//       const response = await axios.post(`${API_URL}/attendance/manual`, {
//         userId: values.employeeId,
//         date: dateStr,
//         checkInTime: checkInTimeStr,
//         checkOutTime: checkOutTimeStr,
//         preview: true
//       }, {
//         headers: {
//           'Authorization': `Bearer ${localStorage.getItem('token')}`
//         }
//       });
      
//       if (response.data.success) {
//         setPreviewData(response.data.data);
//       }
//     } catch (error) {
//       console.error('Error calculating preview:', error);
//       console.error('Preview error details:', {
//         status: error.response?.status,
//         data: error.response?.data,
//         message: error.response?.data?.message || error.message
//       });
//       setPreviewData(null);
//     } finally {
//       setPreviewLoading(false);
//     }
//   };

//   const handleManualSubmit = async (values) => {
//     try {
//       setLoading(true);
//       const API_URL = getAPIUrl();
      
//       // Validate required fields
//       if (!values.date || !values.checkInTime || !values.checkOutTime || !values.employeeId) {
//         message.error('Vui lòng điền đầy đủ thông tin');
//         setLoading(false);
//         return;
//       }
      
//       // Validate time values
//       if (!moment(values.checkInTime).isValid() || !moment(values.checkOutTime).isValid()) {
//         message.error('Giờ vào/ra không hợp lệ');
//         setLoading(false);
//         return;
//       }
      
//       // Format: date = "YYYY-MM-DD", time = "HH:mm"
//       const dateStr = moment(values.date).format('YYYY-MM-DD');
//       const checkInTimeStr = moment(values.checkInTime).format('HH:mm');
//       const checkOutTimeStr = moment(values.checkOutTime).format('HH:mm');
      
//       // Backend sẽ tự động xử lý ca qua đêm (nếu giờ ra <= giờ vào thì cộng 1 ngày)
//       // Không cần validation ở frontend nữa
      
//       console.log('Submitting manual attendance:', {
//         userId: values.employeeId,
//         date: dateStr,
//         checkInTime: checkInTimeStr,
//         checkOutTime: checkOutTimeStr
//       });
      
//       const response = await axios.post(
//         `${API_URL}/attendance/manual`,
//         {
//           userId: values.employeeId,
//           date: dateStr,
//           checkInTime: checkInTimeStr,
//           checkOutTime: checkOutTimeStr,
//           preview: false
//         },
//         {
//           headers: {
//             'Authorization': `Bearer ${localStorage.getItem('token')}`
//           }
//         }
//       );
      
//       if (response.data.success) {
//         message.success('Chấm công thủ công thành công');
//         setModalVisible(false);
//         form.resetFields();
//         setPreviewData(null);
//         fetchAttendances(); // Refresh list
//       } else {
//         // Xử lý lỗi từ backend (bao gồm cả lỗi "Giờ ra phải sau giờ vào" nếu có)
//         const errorMsg = response.data.message || 'Lỗi khi chấm công thủ công';
//         message.error(errorMsg);
//       }
//     } catch (error) {
//       console.error('Error submitting manual attendance:', error);
      
//       // Xử lý lỗi từ API response
//       const errorMessage = error.response?.data?.message || 'Lỗi khi chấm công thủ công';
      
//       // Nếu lỗi là "Giờ ra phải sau giờ vào", thông báo rõ ràng hơn
//       if (errorMessage.includes('Giờ ra phải sau giờ vào')) {
//         message.warning('Lưu ý: Nếu là ca qua đêm (ví dụ: vào 22:00, ra 06:00), hệ thống sẽ tự động tính là ngày hôm sau.');
//       } else {
//         message.error(errorMessage);
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getStatusColor = (status) => {
//     switch (status) {
//       case 'present': return 'green';
//       case 'late': return 'orange';
//       case 'absent': return 'red';
//       default: return 'default';
//     }
//   };

//   const getStatusText = (status) => {
//     switch (status) {
//       case 'present': return 'Có mặt';
//       case 'late': return 'Muộn';
//       case 'absent': return 'Vắng mặt';
//       default: return status;
//     }
//   };

//   const formatCurrency = (amount) => {
//     return new Intl.NumberFormat('vi-VN').format(amount || 0);
//   };

//   const getWorkDayValue = (status) => {
//     switch (status) {
//       case 'present': return 1.0;
//       case 'half-day': return 0.5;
//       case 'absent': return 0;
//       default: return 0;
//     }
//   };

//   // Helper function to detect overnight shift
//   const detectOvernightShift = (checkInTime, checkOutTime) => {
//     if (!checkInTime || !checkOutTime) return false;
//     if (!moment(checkInTime).isValid() || !moment(checkOutTime).isValid()) return false;
    
//     const checkIn = moment(checkInTime);
//     const checkOut = moment(checkOutTime);
    
//     // If check-out time is before or equal to check-in time (same day), it's likely overnight
//     // Example: 22:00 -> 06:00 means checkout is next day
//     const checkInHour = checkIn.hour();
//     const checkOutHour = checkOut.hour();
    
//     // Common overnight shift patterns:
//     // 1. Check-out hour < check-in hour (e.g., 22:00 -> 06:00)
//     // 2. Check-out hour == check-in hour but check-out minute <= check-in minute (e.g., 22:00 -> 22:00 or 22:30 -> 22:00)
//     // 3. Check-in is late evening (>= 18:00) and check-out is early morning (< 12:00)
//     if (checkOutHour < checkInHour) {
//       return true;
//     }
//     if (checkOutHour === checkInHour && checkOut.minute() <= checkIn.minute()) {
//       return true;
//     }
//     if (checkInHour >= 18 && checkOutHour < 12) {
//       return true;
//     }
    
//     return false;
//   };

//   const columns = [
//     {
//       title: 'Ngày',
//       dataIndex: 'date',
//       key: 'date',
//       render: (date) => moment(date).format('DD/MM/YYYY'),
//       sorter: (a, b) => moment(a.date).unix() - moment(b.date).unix(),
//       width: 100,
//       fixed: 'left',
//     },
//     {
//       title: 'Nhân viên',
//       dataIndex: ['employee', 'name'],
//       key: 'employeeName',
//       width: 150,
//       render: (name, record) => (
//         <Space>
//           {record.employee?.name || 'Không xác định'}
//           {record.isManual && (
//             <Tag color="blue" size="small">Thủ công</Tag>
//           )}
//         </Space>
//       ),
//       fixed: 'left',
//     },
//     {
//       title: 'ID VT',
//       dataIndex: ['employee', 'fingerprintId'],
//       key: 'fingerprintId',
//       render: (id, record) => record.employee?.fingerprintId ? `#${record.employee.fingerprintId}` : '-',
//       width: 60,
//     },
//     {
//       title: 'Giờ làm',
//       key: 'workingTime',
//       width: 130,
//       render: (_, record) => {
//         const checkInTime = record.checkIn?.time;
//         const checkOutTime = record.checkOut?.time;
//         const isAutoCheckout = record.autoCheckout;
        
//         if (!checkInTime && !checkOutTime) {
//           return '-';
//         }
        
//         const timeStr = `${checkInTime ? moment(checkInTime).format('HH:mm') : '--:--'} - ${checkOutTime ? moment(checkOutTime).format('HH:mm') : '--:--'}`;
        
//         return (
//           <div>
//             <div style={{ color: isAutoCheckout ? '#ff4d4f' : 'inherit' }}>
//               {timeStr}
//             </div>
//             {isAutoCheckout && (
//               <Tag color="error" size="small" style={{ marginTop: 4 }}>
//                 Quên Check-out
//               </Tag>
//             )}
//           </div>
//         );
//       },
//     },
//     {
//       title: 'Vi phạm',
//       key: 'violations',
//       width: 140,
//       render: (_, record) => {
//         const violations = [];
        
//         if (record.lateMinutes > 0) {
//           violations.push(
//             <div key="late">
//               <Tag color="warning">Muộn {record.lateMinutes} phút</Tag>
//             </div>
//           );
//         }
        
//         if (record.status === 'half-day') {
//           violations.push(
//             <div key="halfday">
//               <Tag color="orange">Nửa công</Tag>
//             </div>
//           );
//         }
        
//         if (record.actualPenalty > 0) {
//           violations.push(
//             <div key="penalty" style={{ marginTop: 4, color: '#ff4d4f', fontSize: '12px' }}>
//               (-{formatCurrency(record.actualPenalty)} đ)
//             </div>
//           );
//         }
        
//         return violations.length > 0 ? (
//           <div>{violations}</div>
//         ) : '-';
//       },
//     },
//     {
//       title: 'Làm thêm (OT)',
//       key: 'overtime',
//       width: 140,
//       render: (_, record) => {
//         if (record.overtimeHours > 0) {
//           return (
//             <div>
//               <Tag color="blue">
//                 {record.overtimeHours}h (x{record.overtimeRate || 1.0})
//               </Tag>
//               {record.estimatedOTSalary > 0 && (
//                 <div style={{ marginTop: 4, color: '#52c41a', fontSize: '12px' }}>
//                   (+{formatCurrency(record.estimatedOTSalary)} đ)
//                 </div>
//               )}
//             </div>
//           );
//         }
//         return '-';
//       },
//     },
//     {
//       title: 'Tiền OT',
//       dataIndex: 'estimatedOTSalary',
//       key: 'estimatedOTSalary',
//       width: 120,
//       render: (amount) => amount > 0 ? (
//         <Tag color="success" style={{ color: '#52c41a' }}>
//           +{formatCurrency(amount)} đ
//         </Tag>
//       ) : '-',
//       sorter: (a, b) => (a.estimatedOTSalary || 0) - (b.estimatedOTSalary || 0),
//     },
//     {
//       title: 'Tiền phạt',
//       dataIndex: 'actualPenalty',
//       key: 'actualPenalty',
//       width: 120,
//       render: (amount) => amount > 0 ? (
//         <Tag color="error">
//           -{formatCurrency(amount)} đ
//         </Tag>
//       ) : '-',
//       sorter: (a, b) => (a.actualPenalty || 0) - (b.actualPenalty || 0),
//     },
//     {
//       title: 'Công quy đổi',
//       key: 'workDay',
//       width: 110,
//       render: (_, record) => {
//         const workDay = getWorkDayValue(record.status);
//         let color = 'default';
//         if (workDay === 1.0) color = 'success';
//         else if (workDay === 0.5) color = 'warning';
//         else color = 'error';
        
//         return (
//           <Tag color={color}>
//             {workDay.toFixed(1)}
//           </Tag>
//         );
//       },
//       sorter: (a, b) => getWorkDayValue(a.status) - getWorkDayValue(b.status),
//     },
//     {
//       title: 'Số giờ',
//       dataIndex: 'workingHours',
//       key: 'workingHours',
//       render: (hours) => hours ? `${Number(hours).toFixed(1)}h` : '-',
//       width: 80,
//     },
//     {
//       title: 'Trạng thái',
//       dataIndex: 'status',
//       key: 'status',
//       render: (status, record) => (
//         <Space direction="vertical" size="small">
//           <Tag color={getStatusColor(status)}>
//             {getStatusText(status)}
//           </Tag>
//           {record.isHoliday && (
//             <Tag color="purple">Ngày lễ (x{record.holidayRate || 1.0})</Tag>
//           )}
//           {record.autoCheckout && (
//             <Tag color="orange">Auto CO</Tag>
//           )}
//         </Space>
//       ),
//       width: 120,
//     },
//   ];

//   return (
//     <div>
//       <Card>
//         <div style={{ marginBottom: 16 }}>
//           <Title level={3} style={{ margin: 0 }}>Quản lý chấm công vân tay</Title>
//         </div>

//         {/* ESP32 Status */}
//         <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
//           <Col xs={24} sm={12} lg={6}>
//             <Card size="small">
//               <Statistic
//                 title="Trạng thái ESP32"
//                 value={esp32Connected ? "Kết nối" : "Mất kết nối"}
//                 prefix={esp32Connected ? <WifiOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
//                 valueStyle={{ color: esp32Connected ? '#52c41a' : '#ff4d4f' }}
//               />
//             </Card>
//           </Col>
//           <Col xs={24} sm={12} lg={6}>
//             <Card size="small">
//               <Statistic
//                 title="Chấm công hôm nay"
//                 value={attendances.filter(att => moment(att.date).isSame(moment(), 'day')).length}
//                 prefix={<ClockCircleOutlined />}
//                 valueStyle={{ color: '#1890ff' }}
//               />
//             </Card>
//           </Col>
//           <Col xs={24} sm={12} lg={6}>
//             <Card size="small">
//               <Statistic
//                 title="Tổng nhân viên"
//                 value={new Set(attendances.filter(att => att.employee?.name).map(att => att.employee.name)).size}
//                 prefix={<UserOutlined />}
//                 valueStyle={{ color: '#722ed1' }}
//               />
//             </Card>
//           </Col>
//           <Col xs={24} sm={12} lg={6}>
//             <Card size="small">
//               <Statistic
//                 title="Tỷ lệ chấm công"
//                 value="95%"
//                 prefix={<CheckCircleOutlined />}
//                 valueStyle={{ color: '#52c41a' }}
//               />
//             </Card>
//           </Col>
//         </Row>

//         <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
//           <RangePicker
//             value={dateRange}
//             onChange={setDateRange}
//             format="DD/MM/YYYY"
//           />
//           <Button 
//             type="primary" 
//             icon={<ClockCircleOutlined />}
//             onClick={fetchAttendances}
//           >
//             Tải lại
//           </Button>
//           <Button 
//             type="default" 
//             icon={<UserOutlined />}
//             onClick={handleManualCheckIn}
//           >
//             Chấm công thủ công
//           </Button>
//           <Button 
//             type="default" 
//             icon={<SafetyCertificateOutlined />}
//             onClick={checkESP32Connection}
//           >
//             Kiểm tra ESP32
//           </Button>
//         </div>

//         <Table
//           columns={columns}
//           dataSource={attendances}
//           loading={loading}
//           rowKey="_id"
//           scroll={{ x: 1500 }}
//           pagination={{
//             pageSize: 10,
//             showSizeChanger: true,
//             showQuickJumper: true,
//           }}
//         />
//       </Card>

//       {/* Manual Check-in Modal */}
//       <Modal
//         title="Chấm công thủ công"
//         open={modalVisible}
//         onCancel={() => {
//           setModalVisible(false);
//           form.resetFields();
//           setPreviewData(null);
//         }}
//         footer={null}
//         width={700}
//       >
//         <Form
//           form={form}
//           layout="vertical"
//           onFinish={handleManualSubmit}
//           onValuesChange={(changedValues, allValues) => {
//             // Auto-fill existing data when employee or date changes
//             if (changedValues.employeeId || changedValues.date) {
//               autoFillExistingData(allValues.employeeId, allValues.date);
//             }
//             // Calculate preview when any value changes
//             calculatePreview(allValues);
//           }}
//         >
//           <Form.Item
//             name="employeeId"
//             label="Nhân viên"
//             rules={[{ required: true, message: 'Vui lòng chọn nhân viên' }]}
//           >
//             <Select
//               showSearch
//               placeholder="Tìm theo tên hoặc mã nhân viên"
//               optionFilterProp="children"
//               filterOption={(input, option) => {
//                 const label = option?.children || '';
//                 return label.toLowerCase().includes(input.toLowerCase());
//               }}
//             >
//               {employees.map(emp => (
//                 <Select.Option key={emp._id} value={emp._id}>
//                   {emp.name} ({emp.employeeId}) {emp.fingerprintId ? `[#${emp.fingerprintId}]` : ''}
//                 </Select.Option>
//               ))}
//             </Select>
//           </Form.Item>

//           <Form.Item
//             name="date"
//             label="Ngày chấm công"
//             rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
//             initialValue={moment()}
//           >
//             <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
//           </Form.Item>

//           <Row gutter={16}>
//             <Col span={12}>
//               <Form.Item
//                 name="checkInTime"
//                 label="Giờ vào"
//                 rules={[{ required: true, message: 'Vui lòng chọn giờ vào' }]}
//               >
//                 <TimePicker style={{ width: '100%' }} format="HH:mm" />
//               </Form.Item>
//             </Col>
//             <Col span={12}>
//               <Form.Item
//                 name="checkOutTime"
//                 label="Giờ ra"
//                 rules={[{ required: true, message: 'Vui lòng chọn giờ ra' }]}
//               >
//                 <TimePicker style={{ width: '100%' }} format="HH:mm" />
//               </Form.Item>
//             </Col>
//           </Row>

//           {/* Overnight Shift Info */}
//           <Alert
//             message="Hỗ trợ ca qua đêm"
//             description="Hệ thống tự động nhận diện ca qua đêm. Ví dụ: Vào 22:00, Ra 06:00 → Hệ thống sẽ tự hiểu giờ ra là 06:00 ngày hôm sau."
//             type="info"
//             showIcon
//             style={{ marginBottom: 16 }}
//           />

//           {/* Preview Section */}
//           {previewData && (
//             <>
//               <Divider>Xem trước kết quả</Divider>
//               <Card size="small" style={{ backgroundColor: '#f5f5f5', marginBottom: 16 }}>
//                 <Row gutter={[16, 12]}>
//                   <Col span={12}>
//                     <Typography.Text strong>Tổng giờ làm:</Typography.Text>
//                     <div style={{ fontSize: 16, fontWeight: 'bold' }}>{previewData.workingHours}h</div>
//                   </Col>
//                   <Col span={12}>
//                     <Typography.Text strong>Giờ OT:</Typography.Text>
//                     <div style={{ fontSize: 16, fontWeight: 'bold', color: previewData.overtimeHours > 0 ? '#52c41a' : 'inherit' }}>
//                       {previewData.overtimeHours}h (x{previewData.overtimeRate})
//                     </div>
//                   </Col>
//                   <Col span={12}>
//                     <Typography.Text strong>Số phút muộn:</Typography.Text>
//                     <div style={{ fontSize: 16, fontWeight: 'bold', color: previewData.lateMinutes > 0 ? '#ff4d4f' : 'inherit' }}>
//                       {previewData.lateMinutes} phút
//                     </div>
//                   </Col>
//                   <Col span={12}>
//                     <Typography.Text strong>Tiền phạt:</Typography.Text>
//                     <div style={{ fontSize: 16, fontWeight: 'bold', color: '#ff4d4f' }}>
//                       -{formatCurrency(previewData.actualPenalty)} đ
//                     </div>
//                   </Col>
//                   <Col span={12}>
//                     <Typography.Text strong>Tiền OT:</Typography.Text>
//                     <div style={{ fontSize: 16, fontWeight: 'bold', color: '#52c41a' }}>
//                       +{formatCurrency(previewData.estimatedOTSalary)} đ
//                     </div>
//                   </Col>
//                   <Col span={12}>
//                     <Typography.Text strong>Trạng thái:</Typography.Text>
//                     <div>
//                       <Tag color={previewData.status === 'present' ? 'green' : previewData.status === 'half-day' ? 'orange' : 'red'}>
//                         {previewData.status === 'present' ? 'Có mặt' : previewData.status === 'half-day' ? 'Nửa công' : 'Vắng mặt'}
//                       </Tag>
//                     </div>
//                   </Col>
//                 </Row>
//               </Card>
//             </>
//           )}

//           {previewLoading && (
//             <Alert message="Đang tính toán..." type="info" showIcon style={{ marginBottom: 16 }} />
//           )}

//           <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 16 }}>
//             <Space>
//               <Button onClick={() => {
//                 setModalVisible(false);
//                 form.resetFields();
//                 setPreviewData(null);
//               }}>
//                 Hủy
//               </Button>
//               <Button type="primary" htmlType="submit" loading={loading}>
//                 Chấm công
//               </Button>
//             </Space>
//           </Form.Item>
//         </Form>
//       </Modal>
//     </div>
//   );
// };

// export default AttendanceManagement;

import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  DatePicker, 
  Card, 
  Typography,
  Tag,
  message,
  Modal,
  Form,
  Row,
  Col,
  Statistic,
  TimePicker,
  Divider,
  Alert,
  Select
} from 'antd';
import { 
  ClockCircleOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  WifiOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { getESP32Url, getAPIUrl } from '../../utils/configManager';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const AttendanceManagement = () => {
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([moment().subtract(7, 'days'), moment()]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [esp32Connected, setEsp32Connected] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    fetchAttendances();
    checkESP32Connection();
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const fetchEmployees = async () => {
    try {
      const API_URL = getAPIUrl();
      const response = await axios.get(`${API_URL}/employees`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.data.success) {
        setEmployees(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const checkESP32Connection = async () => {
    try {
      const esp32Url = getESP32Url();
      const response = await axios.get(`${esp32Url}/healthz`);
      setEsp32Connected(response.status === 200);
    } catch (error) {
      setEsp32Connected(false);
    }
  };

  const fetchAttendances = async () => {
    setLoading(true);
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      if (!token) {
        message.error('Chưa đăng nhập. Vui lòng đăng nhập lại.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
        return;
      }
      
      // Check if token might be expired
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000;
        if (Date.now() >= exp) {
          message.error('Token đã hết hạn. Vui lòng đăng nhập lại.');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
          return;
        }
      } catch (e) {
        console.warn('Could not parse token:', e);
      }
      
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');
      
      console.log('📤 Fetching attendances:', { API_URL, startDate, endDate, hasToken: !!token });
      
      const response = await axios.get(`${API_URL}/attendance`, {
        params: { startDate, endDate },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('✅ Attendance response:', response.data);
      
      if (response.data.success) {
        setAttendances(response.data.data || []);
      } else {
        message.error(response.data.message || 'Lỗi khi tải dữ liệu');
      }
    } catch (error) {
      console.error('Error fetching attendances:', error);
      const errorMessage = error.response?.data?.message || 'Lỗi khi tải dữ liệu chấm công';
      
      if (error.response?.status === 401) {
        message.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      } else {
        message.error(errorMessage);
      }
      
      setAttendances([]);
    } finally {
      setLoading(false);
    }
  };

  const handleManualCheckIn = () => {
    setModalVisible(true);
  };

  // Auto-fill existing attendance data when employee and date are selected
  const autoFillExistingData = async (employeeId, date) => {
    if (!employeeId || !date) return;
    
    try {
      const dateStr = moment(date).format('YYYY-MM-DD');
      const existingAttendance = attendances.find(att => 
        att.employee?._id === employeeId && 
        moment(att.date).format('YYYY-MM-DD') === dateStr
      );
      
      if (existingAttendance) {
        console.log('Found existing attendance, auto-filling:', existingAttendance);
        
        const formValues = {
          employeeId: employeeId,
          date: date
        };
        
        if (existingAttendance.checkIn?.time) {
          formValues.checkInTime = moment(existingAttendance.checkIn.time);
        }
        
        if (existingAttendance.checkOut?.time) {
          formValues.checkOutTime = moment(existingAttendance.checkOut.time);
        }
        
        form.setFieldsValue(formValues);
        
        if (formValues.checkInTime && formValues.checkOutTime) {
          calculatePreview(formValues);
        }
      }
    } catch (error) {
      console.error('Error auto-filling existing data:', error);
    }
  };

  // Calculate preview when form values change
  const calculatePreview = async (values) => {
    if (!values.date || !values.checkInTime || !values.checkOutTime || !values.employeeId) {
      setPreviewData(null);
      return;
    }
    
    if (!moment(values.checkInTime).isValid() || !moment(values.checkOutTime).isValid()) {
      console.warn('Invalid time values:', { checkInTime: values.checkInTime, checkOutTime: values.checkOutTime });
      setPreviewData(null);
      return;
    }

    // Không hỗ trợ ca qua đêm: giờ ra phải sau giờ vào
    // if (!moment(values.checkOutTime).isAfter(values.checkInTime)) {
    //   message.warning('Giờ ra phải sau giờ vào trong cùng một ngày (không hỗ trợ ca qua đêm)');
    //   setPreviewData(null);
    //   return;
    // }
    
    try {
      setPreviewLoading(true);
      const API_URL = getAPIUrl();
      
      const dateStr = moment(values.date).format('YYYY-MM-DD');
      const checkInTimeStr = moment(values.checkInTime).format('HH:mm');
      const checkOutTimeStr = moment(values.checkOutTime).format('HH:mm');
      
      console.log('Calculating preview:', {
        userId: values.employeeId,
        date: dateStr,
        checkInTime: checkInTimeStr,
        checkOutTime: checkOutTimeStr,
        preview: true
      });
      
      const response = await axios.post(`${API_URL}/attendance/manual`, {
        userId: values.employeeId,
        date: dateStr,
        checkInTime: checkInTimeStr,
        checkOutTime: checkOutTimeStr,
        preview: true
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data.success) {
        setPreviewData(response.data.data);
      }
    } catch (error) {
      console.error('Error calculating preview:', error);
      console.error('Preview error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.response?.data?.message || error.message
      });
      setPreviewData(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleManualSubmit = async (values) => {
    try {
      setLoading(true);
      const API_URL = getAPIUrl();
      
      if (!values.date || !values.checkInTime || !values.checkOutTime || !values.employeeId) {
        message.error('Vui lòng điền đầy đủ thông tin');
        setLoading(false);
        return;
      }
      
      if (!moment(values.checkInTime).isValid() || !moment(values.checkOutTime).isValid()) {
        message.error('Giờ vào/ra không hợp lệ');
        setLoading(false);
        return;
      }

      // // Không hỗ trợ ca qua đêm
      // if (!moment(values.checkOutTime).isAfter(values.checkInTime)) {
      //   message.error('Giờ ra phải sau giờ vào trong cùng một ngày (không hỗ trợ ca qua đêm)');
      //   setLoading(false);
      //   return;
      // }
      
      const dateStr = moment(values.date).format('YYYY-MM-DD');
      const checkInTimeStr = moment(values.checkInTime).format('HH:mm');
      const checkOutTimeStr = moment(values.checkOutTime).format('HH:mm');
      
      console.log('Submitting manual attendance:', {
        userId: values.employeeId,
        date: dateStr,
        checkInTime: checkInTimeStr,
        checkOutTime: checkOutTimeStr
      });
      
      const response = await axios.post(
        `${API_URL}/attendance/manual`,
        {
          userId: values.employeeId,
          date: dateStr,
          checkInTime: checkInTimeStr,
          checkOutTime: checkOutTimeStr,
          preview: false
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (response.data.success) {
        message.success('Chấm công thủ công thành công');
        setModalVisible(false);
        form.resetFields();
        setPreviewData(null);
        fetchAttendances();
      } else {
        const errorMsg = response.data.message || 'Lỗi khi chấm công thủ công';
        message.error(errorMsg);
      }
    } catch (error) {
      console.error('Error submitting manual attendance:', error);
      const errorMessage = error.response?.data?.message || 'Lỗi khi chấm công thủ công';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'green';
      case 'late': return 'orange';
      case 'absent': return 'red';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'present': return 'Có mặt';
      case 'late': return 'Muộn';
      case 'absent': return 'Vắng mặt';
      default: return status;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount || 0);
  };

  const getWorkDayValue = (status) => {
    switch (status) {
      case 'present': return 1.0;
      case 'half-day': return 0.5;
      case 'absent': return 0;
      default: return 0;
    }
  };

  const columns = [
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      render: (date) => moment(date).format('DD/MM/YYYY'),
      sorter: (a, b) => moment(a.date).unix() - moment(b.date).unix(),
      width: 100,
      fixed: 'left',
    },
    {
      title: 'Nhân viên',
      dataIndex: ['employee', 'name'],
      key: 'employeeName',
      width: 150,
      render: (name, record) => (
        <Space>
          {record.employee?.name || 'Không xác định'}
          {record.isManual && (
            <Tag color="blue" size="small">Thủ công</Tag>
          )}
        </Space>
      ),
      fixed: 'left',
    },
    {
      title: 'ID VT',
      dataIndex: ['employee', 'fingerprintId'],
      key: 'fingerprintId',
      render: (id, record) => record.employee?.fingerprintId ? `#${record.employee.fingerprintId}` : '-',
      width: 60,
    },
    {
      title: 'Giờ làm',
      key: 'workingTime',
      width: 130,
      render: (_, record) => {
        const checkInTime = record.checkIn?.time;
        const checkOutTime = record.checkOut?.time;
        const isAutoCheckout = record.autoCheckout;
        
        if (!checkInTime && !checkOutTime) {
          return '-';
        }
        
        const timeStr = `${checkInTime ? moment(checkInTime).format('HH:mm') : '--:--'} - ${checkOutTime ? moment(checkOutTime).format('HH:mm') : '--:--'}`;
        
        return (
          <div>
            <div style={{ color: isAutoCheckout ? '#ff4d4f' : 'inherit' }}>
              {timeStr}
            </div>
            {isAutoCheckout && (
              <Tag color="error" size="small" style={{ marginTop: 4 }}>
                Quên Check-out
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: 'Vi phạm',
      key: 'violations',
      width: 140,
      render: (_, record) => {
        const violations = [];
        
        if (record.lateMinutes > 0) {
          violations.push(
            <div key="late">
              <Tag color="warning">Muộn {record.lateMinutes} phút</Tag>
            </div>
          );
        }
        
        if (record.status === 'half-day') {
          violations.push(
            <div key="halfday">
              <Tag color="orange">Nửa công</Tag>
            </div>
          );
        }
        
        if (record.actualPenalty > 0) {
          violations.push(
            <div key="penalty" style={{ marginTop: 4, color: '#ff4d4f', fontSize: '12px' }}>
              (-{formatCurrency(record.actualPenalty)} đ)
            </div>
          );
        }
        
        return violations.length > 0 ? (
          <div>{violations}</div>
        ) : '-';
      },
    },
    {
      title: 'Làm thêm (OT)',
      key: 'overtime',
      width: 140,
      render: (_, record) => {
        if (record.overtimeHours > 0) {
          return (
            <div>
              <Tag color="blue">
                {record.overtimeHours}h (x{record.overtimeRate || 1.0})
              </Tag>
              {record.estimatedOTSalary > 0 && (
                <div style={{ marginTop: 4, color: '#52c41a', fontSize: '12px' }}>
                  (+{formatCurrency(record.estimatedOTSalary)} đ)
                </div>
              )}
            </div>
          );
        }
        return '-';
      },
    },
    {
      title: 'Tiền OT',
      dataIndex: 'estimatedOTSalary',
      key: 'estimatedOTSalary',
      width: 120,
      render: (amount) => amount > 0 ? (
        <Tag color="success" style={{ color: '#52c41a' }}>
          +{formatCurrency(amount)} đ
        </Tag>
      ) : '-',
      sorter: (a, b) => (a.estimatedOTSalary || 0) - (b.estimatedOTSalary || 0),
    },
    {
      title: 'Tiền phạt',
      dataIndex: 'actualPenalty',
      key: 'actualPenalty',
      width: 120,
      render: (amount) => amount > 0 ? (
        <Tag color="error">
          -{formatCurrency(amount)} đ
        </Tag>
      ) : '-',
      sorter: (a, b) => (a.actualPenalty || 0) - (b.actualPenalty || 0),
    },
    {
      title: 'Công quy đổi',
      key: 'workDay',
      width: 110,
      render: (_, record) => {
        const workDay = getWorkDayValue(record.status);
        let color = 'default';
        if (workDay === 1.0) color = 'success';
        else if (workDay === 0.5) color = 'warning';
        else color = 'error';
        
        return (
          <Tag color={color}>
            {workDay.toFixed(1)}
          </Tag>
        );
      },
      sorter: (a, b) => getWorkDayValue(a.status) - getWorkDayValue(b.status),
    },
    {
      title: 'Số giờ',
      dataIndex: 'workingHours',
      key: 'workingHours',
      render: (hours) => hours ? `${Number(hours).toFixed(1)}h` : '-',
      width: 80,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => (
        <Space direction="vertical" size="small">
          <Tag color={getStatusColor(status)}>
            {getStatusText(status)}
          </Tag>
          {record.isHoliday && (
            <Tag color="purple">Ngày lễ (x{record.holidayRate || 1.0})</Tag>
          )}
          {record.autoCheckout && (
            <Tag color="orange">Auto CO</Tag>
          )}
        </Space>
      ),
      width: 120,
    },
  ];

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>Quản lý chấm công vân tay</Title>
        </div>

        {/* ESP32 Status */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="Trạng thái ESP32"
                value={esp32Connected ? "Kết nối" : "Mất kết nối"}
                prefix={esp32Connected ? <WifiOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                valueStyle={{ color: esp32Connected ? '#52c41a' : '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="Chấm công hôm nay"
                value={attendances.filter(att => moment(att.date).isSame(moment(), 'day')).length}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="Tổng nhân viên"
                value={new Set(attendances.filter(att => att.employee?.name).map(att => att.employee.name)).size}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="Tỷ lệ chấm công"
                value="95%"
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>

        <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            format="DD/MM/YYYY"
          />
          <Button 
            type="primary" 
            icon={<ClockCircleOutlined />}
            onClick={fetchAttendances}
          >
            Tải lại
          </Button>
          <Button 
            type="default" 
            icon={<UserOutlined />}
            onClick={handleManualCheckIn}
          >
            Chấm công thủ công
          </Button>
          <Button 
            type="default" 
            icon={<SafetyCertificateOutlined />}
            onClick={checkESP32Connection}
          >
            Kiểm tra ESP32
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={attendances}
          loading={loading}
          rowKey="_id"
          scroll={{ x: 1500 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
        />
      </Card>

      {/* Manual Check-in Modal */}
      <Modal
        title="Chấm công thủ công"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setPreviewData(null);
        }}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleManualSubmit}
          onValuesChange={(changedValues, allValues) => {
            if (changedValues.employeeId || changedValues.date) {
              autoFillExistingData(allValues.employeeId, allValues.date);
            }
            calculatePreview(allValues);
          }}
        >
          <Form.Item
            name="employeeId"
            label="Nhân viên"
            rules={[{ required: true, message: 'Vui lòng chọn nhân viên' }]}
          >
            <Select
              showSearch
              placeholder="Tìm theo tên hoặc mã nhân viên"
              optionFilterProp="children"
              filterOption={(input, option) => {
                const label = option?.children || '';
                return label.toLowerCase().includes(input.toLowerCase());
              }}
            >
              {employees.map(emp => (
                <Select.Option key={emp._id} value={emp._id}>
                  {emp.name} ({emp.employeeId}) {emp.fingerprintId ? `[#${emp.fingerprintId}]` : ''}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="date"
            label="Ngày chấm công"
            rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
            initialValue={moment()}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="checkInTime"
                label="Giờ vào"
                rules={[{ required: true, message: 'Vui lòng chọn giờ vào' }]}
              >
                <TimePicker style={{ width: '100%' }} format="HH:mm" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="checkOutTime"
                label="Giờ ra"
                rules={[{ required: true, message: 'Vui lòng chọn giờ ra' }]}
              >
                <TimePicker style={{ width: '100%' }} format="HH:mm" />
              </Form.Item>
            </Col>
          </Row>

          {/* Preview Section */}
          {previewData && (
            <>
              <Divider>Xem trước kết quả</Divider>
              <Card size="small" style={{ backgroundColor: '#f5f5f5', marginBottom: 16 }}>
                <Row gutter={[16, 12]}>
                  <Col span={12}>
                    <Typography.Text strong>Tổng giờ làm:</Typography.Text>
                    <div style={{ fontSize: 16, fontWeight: 'bold' }}>{previewData.workingHours}h</div>
                  </Col>
                  <Col span={12}>
                    <Typography.Text strong>Giờ OT:</Typography.Text>
                    <div style={{ fontSize: 16, fontWeight: 'bold', color: previewData.overtimeHours > 0 ? '#52c41a' : 'inherit' }}>
                      {previewData.overtimeHours}h (x{previewData.overtimeRate})
                    </div>
                  </Col>
                  <Col span={12}>
                    <Typography.Text strong>Số phút muộn:</Typography.Text>
                    <div style={{ fontSize: 16, fontWeight: 'bold', color: previewData.lateMinutes > 0 ? '#ff4d4f' : 'inherit' }}>
                      {previewData.lateMinutes} phút
                    </div>
                  </Col>
                  <Col span={12}>
                    <Typography.Text strong>Tiền phạt:</Typography.Text>
                    <div style={{ fontSize: 16, fontWeight: 'bold', color: '#ff4d4f' }}>
                      -{formatCurrency(previewData.actualPenalty)} đ
                    </div>
                  </Col>
                  <Col span={12}>
                    <Typography.Text strong>Tiền OT:</Typography.Text>
                    <div style={{ fontSize: 16, fontWeight: 'bold', color: '#52c41a' }}>
                      +{formatCurrency(previewData.estimatedOTSalary)} đ
                    </div>
                  </Col>
                  <Col span={12}>
                    <Typography.Text strong>Trạng thái:</Typography.Text>
                    <div>
                      <Tag color={previewData.status === 'present' ? 'green' : previewData.status === 'half-day' ? 'orange' : 'red'}>
                        {previewData.status === 'present' ? 'Có mặt' : previewData.status === 'half-day' ? 'Nửa công' : 'Vắng mặt'}
                      </Tag>
                    </div>
                  </Col>
                </Row>
              </Card>
            </>
          )}

          {previewLoading && (
            <Alert message="Đang tính toán..." type="info" showIcon style={{ marginBottom: 16 }} />
          )}

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
                setPreviewData(null);
              }}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Chấm công
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AttendanceManagement;
