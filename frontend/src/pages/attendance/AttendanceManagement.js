import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  DatePicker, 
  Select, 
  Card, 
  Typography,
  Tag,
  message,
  Modal,
  Form,
  Input,
  Row,
  Col,
  Statistic
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
const { Option } = Select;

const AttendanceManagement = () => {
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([moment().subtract(7, 'days'), moment()]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [esp32Connected, setEsp32Connected] = useState(false);

  useEffect(() => {
    fetchAttendances();
    checkESP32Connection();
  }, [dateRange]);

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
        // Token format invalid, try anyway
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
      
      // If 401, token is invalid or expired
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
      
      setAttendances([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleManualCheckIn = () => {
    setModalVisible(true);
  };

  const handleManualSubmit = async (values) => {
    try {
      // Mock manual check-in
      const newAttendance = {
        _id: Date.now().toString(),
        date: new Date(),
        employee: { name: values.employeeName, fingerprintId: values.fingerprintId },
        checkIn: { time: new Date() },
        checkOut: null,
        workingHours: null,
        status: 'present'
      };
      setAttendances(prev => [newAttendance, ...prev]);
      message.success('Chấm công thủ công thành công');
      setModalVisible(false);
      form.resetFields();
    } catch (error) {
      message.error('Lỗi khi chấm công thủ công');
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
      render: (name, record) => record.employee?.name || 'Không xác định',
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
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleManualSubmit}
        >
          <Form.Item
            name="employeeName"
            label="Tên nhân viên"
            rules={[{ required: true, message: 'Vui lòng nhập tên nhân viên' }]}
          >
            <Input placeholder="Nhập tên nhân viên" />
          </Form.Item>

          <Form.Item
            name="fingerprintId"
            label="ID Vân tay"
            rules={[{ required: true, message: 'Vui lòng nhập ID vân tay' }]}
          >
            <Input type="number" placeholder="Nhập ID vân tay" />
          </Form.Item>

          <Form.Item
            name="action"
            label="Hành động"
            rules={[{ required: true, message: 'Vui lòng chọn hành động' }]}
          >
            <Select placeholder="Chọn hành động">
              <Option value="checkin">Check-in (Vào)</Option>
              <Option value="checkout">Check-out (Ra)</Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit">
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

