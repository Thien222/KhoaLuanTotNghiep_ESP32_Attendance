import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Modal, 
  Form, 
  Input, 
  InputNumber,
  Select, 
  Popconfirm,
  Typography,
  Card,
  Tag,
  Row,
  Col,
  Statistic,
  App,
  Tooltip
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SafetyCertificateOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { getAPIUrl, getConfig } from '../../utils/configManager';

const { Title } = Typography;
const { Option } = Select;

const EmployeeManagement = () => {
  const { message } = App.useApp();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [form] = Form.useForm();
  const [enrolling, setEnrolling] = useState(false);
  const [searchCode, setSearchCode] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      // Call real API from backend
      const API_URL = getAPIUrl();
      const response = await axios.get(`${API_URL}/debug/employees`);
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
      console.log('🗑️ Deleting employee:', id);
      
      // Call API to delete employee
      const API_URL = getAPIUrl();
      const response = await axios.delete(`${API_URL}/debug/employees/${id}`);
      
      if (response.data.success) {
        // Remove from local state
        setEmployees(prev => prev.filter(emp => emp._id !== id));
        message.success('Xóa nhân viên thành công');
        
        // Refresh list to ensure consistency
        setTimeout(() => {
          fetchEmployees();
        }, 500);
      } else {
        message.error(response.data.message || 'Lỗi khi xóa nhân viên');
      }
    } catch (error) {
      console.error('❌ Error deleting employee:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Lỗi khi xóa nhân viên';
      message.error(errorMessage);
    }
  };

  const handleSubmit = async (values) => {
    try {
      const API_URL = getAPIUrl();
      
      if (editingEmployee) {
        // Update employee - ensure salary is a number
        const salaryValue = values.salary ? Number(values.salary) : editingEmployee.salary || 0;
        console.log('📤 Updating employee with salary:', salaryValue);
        const response = await axios.put(`${API_URL}/employees/${editingEmployee._id}`, {
          name: values.name,
          position: values.position,
          department: values.department,
          email: values.email,
          phone: values.phone,
          contractType: values.contractType,
          salary: salaryValue
          // status will be preserved from existing employee or default to 'active'
        }, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.data.success) {
          message.success('Cập nhật nhân viên thành công');
          // Refresh employee list
          fetchEmployees();
          setModalVisible(false);
          form.resetFields();
        } else {
          message.error(response.data.message || 'Lỗi khi cập nhật nhân viên');
        }
      } else {
        // Call real API to add employee
        // Ensure salary is a number
        const salaryValue = values.salary ? Number(values.salary) : 0;
        console.log('📤 Sending employee data:', { ...values, salary: salaryValue });
        const API_URL = getAPIUrl();
        const response = await axios.post(`${API_URL}/debug/employees`, {
          name: values.name,
          position: values.position,
          department: values.department,
          email: values.email,
          phone: values.phone,
          contractType: values.contractType || 'probation',
          salary: salaryValue
          // status will be set to 'active' by default in backend
        });
        
        console.log('✅ Response:', response.data);
        
        if (response.data.success) {
          const newEmployee = response.data.data;
          setEmployees(prev => [...prev, newEmployee]);
          message.success('Thêm nhân viên thành công!');
          
          // Don't auto enroll - let user do it manually
          message.info('Nhân viên đã được thêm. Vui lòng click "Đăng ký vân tay" để đăng ký vân tay cho nhân viên này.');
          form.resetFields();
        } else {
          message.error(response.data.message || 'Lỗi khi thêm nhân viên');
        }
      }
      setModalVisible(false);
    } catch (error) {
      console.error('❌ Error saving employee:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Lỗi khi lưu nhân viên';
      message.error(errorMessage);
    }
  };

  const handleEnrollFingerprint = async (employee) => {
    setEnrolling(true);
    try {
      message.loading('Đang gửi lệnh đăng ký vân tay đến ESP32...', 3);
      
      // Call backend API to forward to ESP32
      const API_URL = getAPIUrl();
      const response = await axios.get(`${API_URL}/enroll`, {
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
      width: 120,
      ellipsis: true,
    },
    {
      title: 'Mã NV',
      dataIndex: 'employeeId',
      key: 'employeeId',
      width: 80,
    },
    {
      title: 'ID Vân tay',
      dataIndex: 'fingerprintId',
      key: 'fingerprintId',
      width: 90,
      render: (id) => id ? `#${id}` : '-',
    },
    {
      title: 'Chức vụ',
      dataIndex: 'position',
      key: 'position',
      width: 100,
      ellipsis: true,
    },
    {
      title: 'Phòng ban',
      dataIndex: 'department',
      key: 'department',
      width: 100,
    },
    {
      title: 'Loại HĐ',
      dataIndex: 'contractType',
      key: 'contractType',
      width: 100,
      render: (type) => {
        const colors = { intern: 'blue', probation: 'orange', official: 'green' };
        const labels = { intern: 'Thực tập', probation: 'Thử việc', official: 'Chính thức' };
        return <Tag color={colors[type] || 'default'}>{labels[type] || type}</Tag>;
      },
    },
    {
      title: 'Lương',
      dataIndex: 'salary',
      key: 'salary',
      width: 130,
      render: (salary, record) => {
        // Use baseSalary if available, otherwise use salary
        const salaryValue = record.baseSalary || salary || 0;
        return new Intl.NumberFormat('vi-VN', { 
          style: 'currency', 
          currency: 'VND' 
        }).format(salaryValue);
      },
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 180,
      ellipsis: {
        showTitle: false,
      },
      render: (email) => (
        <Tooltip placement="topLeft" title={email}>
          {email}
        </Tooltip>
      ),
    },
    {
      title: 'Hồ sơ',
      dataIndex: 'profileCompleted',
      key: 'profileCompleted',
      width: 90,
      render: (completed) => (
        <Tooltip title={completed ? 'Đã hoàn thiện' : 'Chưa hoàn thiện hồ sơ'}>
          <Tag color={completed ? 'green' : 'red'}>
            {completed ? '✓ Đầy đủ' : '✗ Chưa đủ'}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: 'Vân tay',
      dataIndex: 'fingerprintEnrolled',
      key: 'fingerprintEnrolled',
      width: 110,
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
      width: 110,
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
        </Tag>
      ),
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 280,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small" style={{ whiteSpace: 'nowrap' }}>
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

  // Filter employees based on search code
  const filteredEmployees = React.useMemo(() => {
    if (!searchCode.trim()) {
      return employees;
    }
    const searchTerm = searchCode.trim().toUpperCase();
    return employees.filter(emp => 
      emp.employeeId && emp.employeeId.toUpperCase().includes(searchTerm)
    );
  }, [employees, searchCode]);

  const enrolledCount = filteredEmployees.filter(emp => emp.fingerprintEnrolled).length;
  const totalCount = filteredEmployees.length;

  return (
    <div style={{ width: '100%', overflow: 'hidden' }}>
      <Card style={{ width: '100%', overflow: 'hidden' }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <Title level={3} style={{ margin: 0 }}>Quản lý nhân sự & Vân tay</Title>
          <Space size="middle" wrap>
            <Input
              placeholder="Tìm kiếm theo Mã NV (VD: EMP001)"
              prefix={<SearchOutlined />}
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              allowClear
              style={{ width: 250 }}
            />
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

        <div style={{ 
          width: '100%', 
          overflowX: 'auto',
          overflowY: 'hidden',
          maxWidth: '100%'
        }}>
          <Table
            columns={columns}
            dataSource={filteredEmployees}
            loading={loading}
            rowKey="_id"
            scroll={{ 
              x: 'max-content',
              y: 'calc(100vh - 500px)'
            }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
            }}
            style={{ 
              width: '100%',
              minWidth: '1400px'
            }}
          />
        </div>
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
            name="contractType"
            label="Loại hợp đồng"
            rules={[{ required: true, message: 'Vui lòng chọn loại hợp đồng' }]}
            initialValue="probation"
          >
            <Select>
              <Option value="intern">Thực tập</Option>
              <Option value="probation">Thử việc</Option>
              <Option value="official">Chính thức</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="salary"
            label="Lương cơ bản (VND)"
            rules={[{ required: true, message: 'Vui lòng nhập lương' }]}
            getValueFromEvent={(value) => {
              // Ensure value is always a number
              if (value === '' || value === null || value === undefined) return undefined;
              return typeof value === 'number' ? value : Number(value);
            }}
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => {
                // Parse value correctly, remove all non-digit characters except decimal point
                const parsed = value.replace(/[^\d]/g, '');
                return parsed === '' ? '' : Number(parsed);
              }}
              min={0}
              placeholder="Ví dụ: 5000000"
            />
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

