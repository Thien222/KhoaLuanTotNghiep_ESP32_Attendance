import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Modal, 
  Form, 
  Input, 
  Select, 
  message, 
  Popconfirm,
  Typography,
  Card,
  Tag,
  Row,
  Col,
  Statistic
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SafetyCertificateOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { API_URL } from '../../services/api';

const { Title } = Typography;
const { Option } = Select;

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [form] = Form.useForm();
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      // Call real API from backend
      const response = await axios.get(`http://192.168.2.28:3000/api/debug/employees`);
      if (response.data.success) {
        setEmployees(response.data.data);
      } else {
        message.error(response.data.message || 'Lỗi khi tải danh sách nhân viên');
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      message.error('Lỗi kết nối đến server');
      // Set empty array if API fails
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingEmployee(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    form.setFieldsValue(employee);
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      // Mock delete
      setEmployees(prev => prev.filter(emp => emp._id !== id));
      message.success('Xóa nhân viên thành công');
    } catch (error) {
      message.error('Lỗi khi xóa nhân viên');
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingEmployee) {
        // TODO: Implement update API
        message.success('Cập nhật nhân viên thành công');
      } else {
        // Call real API to add employee
        const response = await axios.post(`http://192.168.2.28:3000/api/debug/employees`, {
          ...values,
          fingerprintId: employees.length + 1,
          fingerprintEnrolled: false
        });
        
        if (response.data.success) {
          const newEmployee = response.data.data;
          setEmployees(prev => [...prev, newEmployee]);
          message.success('Thêm nhân viên thành công');
          
          // Don't auto enroll - let user do it manually
          message.info('Nhân viên đã được thêm. Vui lòng click "Đăng ký vân tay" để đăng ký vân tay cho nhân viên này.');
        } else {
          message.error(response.data.message || 'Lỗi khi thêm nhân viên');
        }
      }
      setModalVisible(false);
    } catch (error) {
      console.error('Error saving employee:', error);
      message.error('Lỗi khi lưu nhân viên');
    }
  };

  const handleEnrollFingerprint = async (employee) => {
    setEnrolling(true);
    try {
      message.loading('Đang gửi lệnh đăng ký vân tay đến ESP32...', 3);
      
      // Call backend API to forward to ESP32
      const response = await axios.get(`http://192.168.2.28:3000/api/enroll`, {
        params: { id: employee.fingerprintId }
      });
      
      if (response.data.success) {
        // Update employee status immediately
        setEmployees(prev => prev.map(emp => 
          emp._id === employee._id 
            ? { ...emp, fingerprintEnrolled: true }
            : emp
        ));
        
        message.success('Đã gửi lệnh đăng ký vân tay! Vui lòng đặt ngón tay lên cảm biến ESP32 và giữ nguyên cho đến khi có thông báo thành công.');
        
        // Refresh data from server after a short delay to ensure consistency
        setTimeout(() => {
          fetchEmployees();
        }, 2000);
      } else {
        const errorMsg = response.data.error || response.data.message || 'Lỗi khi đăng ký vân tay';
        if (errorMsg.includes('Quet khong thanh cong')) {
          message.error('Quét vân tay không thành công! Vui lòng thử lại và đảm bảo ngón tay được đặt đúng vị trí trên cảm biến.');
        } else {
          message.error(errorMsg);
        }
      }
    } catch (error) {
      console.error('Enrollment error:', error);
      message.error('Lỗi kết nối đến ESP32 hoặc backend');
    } finally {
      setEnrolling(false);
    }
  };

  const handleSyncESP32 = async () => {
    try {
      message.loading('Đang đồng bộ dữ liệu với ESP32...', 3);
      
      // Simulate sync delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const enrolledCount = employees.filter(emp => emp.fingerprintEnrolled).length;
      message.success(`Đã đồng bộ ${enrolledCount} nhân viên với ESP32!`);
    } catch (error) {
      message.error('Lỗi khi đồng bộ dữ liệu');
    }
  };

  const columns = [
    {
      title: 'Tên',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Mã NV',
      dataIndex: 'employeeId',
      key: 'employeeId',
    },
    {
      title: 'ID Vân tay',
      dataIndex: 'fingerprintId',
      key: 'fingerprintId',
      render: (id) => id ? `#${id}` : '-',
    },
    {
      title: 'Chức vụ',
      dataIndex: 'position',
      key: 'position',
    },
    {
      title: 'Phòng ban',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Vân tay',
      dataIndex: 'fingerprintEnrolled',
      key: 'fingerprintEnrolled',
      render: (enrolled) => (
        <Tag color={enrolled ? 'green' : 'red'}>
          {enrolled ? 'Đã đăng ký' : 'Chưa đăng ký'}
        </Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
        </Tag>
      ),
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="primary" 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Sửa
          </Button>
          <Button 
            type="default" 
            size="small" 
            icon={<SafetyCertificateOutlined />}
            onClick={() => handleEnrollFingerprint(record)}
            loading={enrolling}
            disabled={record.fingerprintEnrolled}
          >
            {record.fingerprintEnrolled ? 'Đã đăng ký' : 'Đăng ký vân tay'}
          </Button>
          <Popconfirm
            title="Bạn có chắc muốn xóa nhân viên này?"
            onConfirm={() => handleDelete(record._id)}
            okText="Có"
            cancelText="Không"
          >
            <Button 
              type="primary" 
              danger 
              size="small" 
              icon={<DeleteOutlined />}
            >
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const enrolledCount = employees.filter(emp => emp.fingerprintEnrolled).length;
  const totalCount = employees.length;

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>Quản lý nhân sự & Vân tay</Title>
          <Space>
            <Button 
              type="default" 
              icon={<SafetyCertificateOutlined />}
              onClick={handleSyncESP32}
            >
              Đồng bộ ESP32
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              Thêm nhân viên
            </Button>
          </Space>
        </div>

        {/* Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="Tổng nhân viên"
                value={totalCount}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="Đã đăng ký vân tay"
                value={enrolledCount}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="Chưa đăng ký"
                value={totalCount - enrolledCount}
                prefix={<CloseCircleOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="Tỷ lệ đăng ký"
                value={totalCount > 0 ? Math.round((enrolledCount / totalCount) * 100) : 0}
                suffix="%"
                prefix={<SafetyCertificateOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={employees}
          loading={loading}
          rowKey="_id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
        />
      </Card>

      <Modal
        title={editingEmployee ? 'Sửa nhân viên' : 'Thêm nhân viên'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Tên nhân viên"
            rules={[{ required: true, message: 'Vui lòng nhập tên nhân viên' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="position"
            label="Chức vụ"
            rules={[{ required: true, message: 'Vui lòng chọn chức vụ' }]}
          >
            <Select>
              <Option value="Nhân viên">Nhân viên</Option>
              <Option value="Trưởng phòng">Trưởng phòng</Option>
              <Option value="Giám đốc">Giám đốc</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="department"
            label="Phòng ban"
            rules={[{ required: true, message: 'Vui lòng chọn phòng ban' }]}
          >
            <Select>
              <Option value="IT">IT</Option>
              <Option value="HR">HR</Option>
              <Option value="Finance">Finance</Option>
              <Option value="Marketing">Marketing</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' }
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Số điện thoại"
            rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="status"
            label="Trạng thái"
            initialValue="active"
          >
            <Select>
              <Option value="active">Hoạt động</Option>
              <Option value="inactive">Không hoạt động</Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit">
                {editingEmployee ? 'Cập nhật' : 'Thêm'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EmployeeManagement;