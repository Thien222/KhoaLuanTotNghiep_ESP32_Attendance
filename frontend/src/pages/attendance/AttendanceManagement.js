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
      const response = await axios.get('http://192.168.2.52/healthz');
      setEsp32Connected(response.status === 200);
    } catch (error) {
      setEsp32Connected(false);
    }
  };

  const fetchAttendances = async () => {
    setLoading(true);
    try {
      // Mock data for demo
      const mockAttendances = [
        {
          _id: '1',
          date: new Date('2024-01-15'),
          employee: { name: 'Nguyễn Văn A', fingerprintId: 1 },
          checkIn: { time: new Date('2024-01-15T08:30:00') },
          checkOut: { time: new Date('2024-01-15T17:30:00') },
          workingHours: 8.5,
          status: 'present'
        },
        {
          _id: '2',
          date: new Date('2024-01-15'),
          employee: { name: 'Trần Thị B', fingerprintId: 2 },
          checkIn: { time: new Date('2024-01-15T09:15:00') },
          checkOut: { time: new Date('2024-01-15T18:00:00') },
          workingHours: 8.25,
          status: 'late'
        },
        {
          _id: '3',
          date: new Date('2024-01-16'),
          employee: { name: 'Lê Văn C', fingerprintId: 3 },
          checkIn: { time: new Date('2024-01-16T08:00:00') },
          checkOut: null,
          workingHours: null,
          status: 'present'
        }
      ];
      setAttendances(mockAttendances);
    } catch (error) {
      message.error('Lỗi khi tải dữ liệu chấm công');
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

  const columns = [
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      render: (date) => moment(date).format('DD/MM/YYYY'),
      sorter: (a, b) => moment(a.date).unix() - moment(b.date).unix(),
    },
    {
      title: 'Nhân viên',
      dataIndex: ['employee', 'name'],
      key: 'employeeName',
    },
    {
      title: 'ID Vân tay',
      dataIndex: ['employee', 'fingerprintId'],
      key: 'fingerprintId',
      render: (id) => id ? `#${id}` : '-',
    },
    {
      title: 'Giờ vào',
      dataIndex: ['checkIn', 'time'],
      key: 'checkIn',
      render: (time) => time ? moment(time).format('HH:mm:ss') : '-',
    },
    {
      title: 'Giờ ra',
      dataIndex: ['checkOut', 'time'],
      key: 'checkOut',
      render: (time) => time ? moment(time).format('HH:mm:ss') : '-',
    },
    {
      title: 'Số giờ làm',
      dataIndex: 'workingHours',
      key: 'workingHours',
      render: (hours) => hours ? `${hours}h` : '-',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
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
                value={new Set(attendances.map(att => att.employee.name)).size}
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