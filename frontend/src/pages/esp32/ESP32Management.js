import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Button, 
  Space, 
  Row, 
  Col, 
  Statistic,
  message,
  Modal,
  Form,
  Input,
  Table,
  Tag,
  Progress
} from 'antd';
import { 
  WifiOutlined, 
  SafetyCertificateOutlined,
  SyncOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title } = Typography;

const ESP32Management = () => {
  const [esp32Status, setEsp32Status] = useState({
    connected: false,
    ip: '192.168.2.52',
    lastSeen: null,
    enrolledFingerprints: 0,
    totalCapacity: 300
  });
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    checkESP32Status();
    const interval = setInterval(checkESP32Status, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkESP32Status = async () => {
    try {
      const response = await axios.get(`http://${esp32Status.ip}/healthz`, {
        timeout: 5000
      });
      
      if (response.status === 200) {
        setEsp32Status(prev => ({
          ...prev,
          connected: true,
          lastSeen: new Date()
        }));
      }
    } catch (error) {
      setEsp32Status(prev => ({
        ...prev,
        connected: false
      }));
    }
  };

  const handleEnrollFingerprint = async (values) => {
    setLoading(true);
    try {
      const { fingerprintId, employeeName } = values;
      
      message.loading('Đang kết nối đến ESP32...', 2);
      
      // Call ESP32 enroll endpoint
      const response = await axios.get(`http://${esp32Status.ip}/enroll`, {
        params: { id: fingerprintId },
        timeout: 10000
      });
      
      if (response.status === 200) {
        message.success('Đã gửi lệnh đăng ký vân tay. Vui lòng đặt ngón tay lên cảm biến.');
      }
    } catch (error) {
      message.error('Lỗi khi kết nối đến ESP32');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncData = async () => {
    setLoading(true);
    try {
      message.loading('Đang đồng bộ dữ liệu...', 3);
      
      // Mock sync process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      message.success('Đồng bộ dữ liệu thành công!');
    } catch (error) {
      message.error('Lỗi khi đồng bộ dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    try {
      const response = await axios.get(`http://${esp32Status.ip}/wipe-all`, {
        timeout: 10000
      });
      
      if (response.status === 200) {
        message.success('Đã xóa tất cả dữ liệu vân tay trên ESP32');
        checkESP32Status();
      }
    } catch (error) {
      message.error('Lỗi khi xóa dữ liệu');
    }
  };

  const enrolledData = [
    { id: 1, name: 'Nguyễn Văn A', fingerprintId: 1, enrolledDate: '2024-01-15' },
    { id: 2, name: 'Trần Thị B', fingerprintId: 2, enrolledDate: '2024-01-16' },
    { id: 3, name: 'Lê Văn C', fingerprintId: 3, enrolledDate: '2024-01-17' },
  ];

  const columns = [
    {
      title: 'ID Vân tay',
      dataIndex: 'fingerprintId',
      key: 'fingerprintId',
      render: (id) => `#${id}`,
    },
    {
      title: 'Tên nhân viên',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Ngày đăng ký',
      dataIndex: 'enrolledDate',
      key: 'enrolledDate',
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: () => (
        <Tag color="green">Hoạt động</Tag>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0 }}>
            <SettingOutlined /> Quản lý thiết bị ESP32
          </Title>
        </div>

        {/* ESP32 Status */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="Trạng thái kết nối"
                value={esp32Status.connected ? "Kết nối" : "Mất kết nối"}
                prefix={esp32Status.connected ? <WifiOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                valueStyle={{ color: esp32Status.connected ? '#52c41a' : '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="IP ESP32"
                value={esp32Status.ip}
                prefix={<WifiOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="Vân tay đã đăng ký"
                value={esp32Status.enrolledFingerprints}
                prefix={<SafetyCertificateOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="Dung lượng sử dụng"
                value={`${esp32Status.enrolledFingerprints}/${esp32Status.totalCapacity}`}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Progress Bar */}
        <Card size="small" style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 8 }}>
            <strong>Dung lượng lưu trữ vân tay</strong>
          </div>
          <Progress 
            percent={Math.round((esp32Status.enrolledFingerprints / esp32Status.totalCapacity) * 100)} 
            status={esp32Status.enrolledFingerprints > esp32Status.totalCapacity * 0.8 ? 'exception' : 'active'}
          />
        </Card>

        {/* Action Buttons */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col>
            <Button 
              type="primary" 
              icon={<SafetyCertificateOutlined />}
              onClick={() => setModalVisible(true)}
              disabled={!esp32Status.connected}
            >
              Đăng ký vân tay mới
            </Button>
          </Col>
          <Col>
            <Button 
              type="default" 
              icon={<SyncOutlined />}
              onClick={handleSyncData}
              loading={loading}
              disabled={!esp32Status.connected}
            >
              Đồng bộ dữ liệu
            </Button>
          </Col>
          <Col>
            <Button 
              type="default" 
              icon={<WifiOutlined />}
              onClick={checkESP32Status}
            >
              Kiểm tra kết nối
            </Button>
          </Col>
          <Col>
            <Button 
              type="primary" 
              danger
              icon={<CloseCircleOutlined />}
              onClick={handleClearAll}
              disabled={!esp32Status.connected}
            >
              Xóa tất cả vân tay
            </Button>
          </Col>
        </Row>

        {/* Enrolled Fingerprints Table */}
        <Card title="Danh sách vân tay đã đăng ký" size="small">
        <Table
          columns={columns}
          dataSource={enrolledData}
          pagination={false}
          size="small"
          rowKey="id"
        />
        </Card>
      </Card>

      {/* Enroll Fingerprint Modal */}
      <Modal
        title="Đăng ký vân tay mới"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEnrollFingerprint}
        >
          <Form.Item
            name="fingerprintId"
            label="ID Vân tay"
            rules={[{ required: true, message: 'Vui lòng nhập ID vân tay' }]}
          >
            <Input type="number" placeholder="Nhập ID vân tay (1-300)" />
          </Form.Item>

          <Form.Item
            name="employeeName"
            label="Tên nhân viên"
            rules={[{ required: true, message: 'Vui lòng nhập tên nhân viên' }]}
          >
            <Input placeholder="Nhập tên nhân viên" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Bắt đầu đăng ký
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ESP32Management;
