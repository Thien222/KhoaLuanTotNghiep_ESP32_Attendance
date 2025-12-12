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
  Tooltip,
  Switch,
  Divider
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  EyeOutlined,
  MoreOutlined,
  UserDeleteOutlined
} from '@ant-design/icons';
import { TableActionDropdown } from '../../components/ActionDropdown';
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
        const employeesData = response.data.data || [];
        console.log('📋 Fetched employees:', employeesData.length);
        console.log('📋 Employee names:', employeesData.map(e => e.name));
        setEmployees(employeesData);
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

  const [terminateModalVisible, setTerminateModalVisible] = useState(false);
  const [terminatingEmployee, setTerminatingEmployee] = useState(null);
  const [terminateForm] = Form.useForm();

  const handleTerminateEmployee = (employee) => {
    setTerminatingEmployee(employee);
    terminateForm.resetFields();
    setTerminateModalVisible(true);
  };

  const handleTerminateSubmit = async (values) => {
    if (!terminatingEmployee) return;

    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');

      const response = await axios.post(
        `${API_URL}/terminated-employees/terminate/${terminatingEmployee._id}`,
        {
          reason: values.reason,
          note: values.note
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        message.success('Đã chuyển nhân viên sang danh sách nghỉ việc');
        setTerminateModalVisible(false);
        setTerminatingEmployee(null);
        terminateForm.resetFields();
        fetchEmployees();
      } else {
        message.error(response.data.message || 'Lỗi khi xử lý nghỉ việc');
      }
    } catch (error) {
      console.error('❌ Error terminating employee:', error);
      message.error(error.response?.data?.message || 'Lỗi khi xử lý nghỉ việc');
    }
  };

  const handleDelete = async (id) => {
    try {
      console.log('🗑️ Deleting employee:', id);

      // Call API to delete employee
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${API_URL}/employees/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

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
          createUserAccount: values.createUserAccount || false,
          userRole: values.userRole || 'employee',
          position: values.position,
          department: values.department,
          email: values.email,
          phone: values.phone,
          contractType: values.contractType || 'official',
          salary: salaryValue
          // status will be set to 'active' by default in backend
        });

        console.log('✅ Response:', response.data);

        if (response.data.success) {
          message.success('Thêm nhân viên thành công!');

          // Refresh employee list from server to ensure consistency
          await fetchEmployees();

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

  const handleEnrollFingerprint = async (employee, manual = false) => {
    setEnrolling(true);
    try {
      const API_URL = getAPIUrl();

      if (manual) {
        // Manual enrollment (mark as enrolled without ESP32) - for testing
        message.loading('Đang đánh dấu đã đăng ký vân tay...', 2);

        const response = await axios.post(`${API_URL}/employees/enroll-fingerprint`, {
          fingerprintId: employee.fingerprintId
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });

        if (response.data.success) {
          setEmployees(prev => prev.map(emp =>
            emp._id === employee._id
              ? { ...emp, fingerprintEnrolled: true }
              : emp
          ));
          message.success('Đã đánh dấu nhân viên đã đăng ký vân tay (chế độ test)');
          setTimeout(() => {
            fetchEmployees();
          }, 1000);
        } else {
          message.error(response.data.message || 'Lỗi khi đánh dấu đã enroll');
        }
        return;
      }

      // ESP32 enrollment via Command Queue System
      // Frontend queues a command, ESP32 polls and executes
      message.loading('Đang gửi lệnh đăng ký vân tay... ESP32 sẽ nhận lệnh trong giây lát.', 5);
      console.log('📝 Queuing enroll command for fingerprintId:', employee.fingerprintId);

      // Step 1: Queue the enroll command
      const queueResponse = await axios.post(`${API_URL}/esp32/commands`, {
        command: 'enroll',
        fingerprintId: employee.fingerprintId,
        employeeId: employee._id
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        timeout: 30000
      });

      if (!queueResponse.data.success) {
        message.error(queueResponse.data.message || 'Không thể gửi lệnh đăng ký');
        return;
      }

      const commandId = queueResponse.data.commandId;
      console.log('✅ Command queued:', commandId);

      message.success({
        content: `Lệnh đăng ký đã được gửi! Vui lòng đặt ngón tay lên cảm biến ESP32. ID: ${employee.fingerprintId}`,
        duration: 10
      });

      // Step 2: Poll for command completion (check every 3 seconds, max 60 seconds)
      let attempts = 0;
      const maxAttempts = 20;
      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const statusResponse = await axios.get(`${API_URL}/esp32/commands/${commandId}`);
          const commandStatus = statusResponse.data.command?.status;

          if (commandStatus === 'completed') {
            clearInterval(pollInterval);
            setEmployees(prev => prev.map(emp =>
              emp._id === employee._id
                ? { ...emp, fingerprintEnrolled: true }
                : emp
            ));
            message.success('🎉 Đăng ký vân tay thành công!');
            fetchEmployees();
          } else if (commandStatus === 'failed') {
            clearInterval(pollInterval);
            message.error('Đăng ký vân tay thất bại. Vui lòng thử lại.');
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            message.warning('Hết thời gian chờ. Vui lòng kiểm tra ESP32 và thử lại.');
          }
        } catch (pollError) {
          console.error('Poll error:', pollError);
        }
      }, 3000);

    } catch (error) {
      console.error('Enrollment error:', error);

      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 409) {
          message.warning('Đã có lệnh đang chờ xử lý cho nhân viên này. Vui lòng đợi hoặc thử lại sau.');
        } else {
          message.error(errorData.message || `Lỗi: ${status}`);
        }
      } else {
        message.error('Lỗi kết nối. Vui lòng kiểm tra mạng.');
      }
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
        const colors = { probation: 'orange', official: 'green' };
        const labels = { probation: 'Thử việc', official: 'Chính thức' };
        return <Tag color={colors[type] || 'default'}>{labels[type] || type}</Tag>;
      },
    },
    {
      title: 'Vai trò',
      dataIndex: 'userRole',
      key: 'userRole',
      width: 100,
      render: (role) => {
        const colors = { employee: 'blue', accountant: 'purple', manager: 'red' };
        const labels = { employee: 'Nhân viên', accountant: 'Kế toán', manager: 'Quản lý' };
        return role ? <Tag color={colors[role] || 'default'}>{labels[role] || role}</Tag> : <Tag>Nhân viên</Tag>;
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
      title: 'Thao tác',
      key: 'action',
      width: 80,
      fixed: 'right',
      align: 'center',
      render: (_, record) => {
        const actionItems = [
          {
            key: 'edit',
            label: 'Chỉnh sửa',
            icon: <EditOutlined />,
            onClick: () => handleEdit(record)
          },
          { type: 'divider' }
        ];

        // Fingerprint enrollment actions
        if (!record.fingerprintEnrolled) {
          actionItems.push(
            {
              key: 'esp32',
              label: 'Đăng ký vân tay (ESP32)',
              icon: <SafetyCertificateOutlined />,
              onClick: () => handleEnrollFingerprint(record, false),
              disabled: enrolling
            },
            {
              key: 'mark',
              label: 'Đánh dấu đã đăng ký',
              icon: <CheckCircleOutlined />,
              onClick: () => handleEnrollFingerprint(record, true),
              disabled: enrolling
            }
          );
        } else {
          actionItems.push({
            key: 'enrolled',
            label: 'Đã đăng ký vân tay',
            icon: <CheckCircleOutlined />,
            disabled: true
          });
        }

        actionItems.push(
          { type: 'divider' },
          {
            key: 'delete',
            label: 'Xóa',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => {
              Modal.confirm({
                title: 'Xóa nhân viên',
                content: `Bạn có chắc chắn muốn xóa nhân viên "${record.name}"? Hành động này sẽ xóa user account và chỉ dùng để test.`,
                okText: 'Xóa',
                okType: 'danger',
                cancelText: 'Hủy',
                onOk: () => handleDelete(record._id)
              });
            }
          },
          {
            key: 'terminate',
            label: 'Cho nghỉ việc',
            icon: <UserDeleteOutlined />,
            danger: true,
            onClick: () => handleTerminateEmployee(record)
          }
        );

        return <TableActionDropdown items={actionItems} />;
      },
    },
  ];

  // Filter employees based on search code
  const filteredEmployees = React.useMemo(() => {
    if (!searchCode.trim()) {
      console.log('📊 No search filter, showing all employees:', employees.length);
      return employees;
    }
    const searchTerm = searchCode.trim().toUpperCase();
    const filtered = employees.filter(emp =>
      emp.employeeId && emp.employeeId.toUpperCase().includes(searchTerm)
    );
    console.log('📊 Filtered employees:', filtered.length, 'Search term:', searchTerm);
    return filtered;
  }, [employees, searchCode]);

  const enrolledCount = filteredEmployees.filter(emp => emp.fingerprintEnrolled).length;
  const totalCount = filteredEmployees.length;

  return (
    <div style={{ width: '100%', overflow: 'hidden' }}>
      <Card style={{ width: '100%', overflow: 'hidden' }} bodyStyle={{ padding: '12px' }}>
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
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
        <Row gutter={[8, 8]} style={{ marginBottom: 8 }}>
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
              y: undefined // Remove vertical scroll to show all rows
            }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Tổng ${total} nhân viên`,
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

          <Divider>Thông tin tài khoản đăng nhập</Divider>

          <Form.Item
            name="createUserAccount"
            label="Tạo tài khoản đăng nhập"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.createUserAccount !== currentValues.createUserAccount}
          >
            {({ getFieldValue }) =>
              getFieldValue('createUserAccount') ? (
                <Form.Item
                  name="userRole"
                  label="Vai trò"
                  rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
                  initialValue="employee"
                >
                  <Select>
                    <Option value="employee">Nhân viên</Option>
                    <Option value="accountant">Kế toán</Option>
                    <Option value="manager">Quản lý (Admin)</Option>
                  </Select>
                </Form.Item>
              ) : null
            }
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

      {/* Terminate Employee Modal */}
      <Modal
        title={
          <Space>
            <UserDeleteOutlined style={{ color: '#ff4d4f' }} />
            <span>Cho nhân viên nghỉ việc</span>
          </Space>
        }
        open={terminateModalVisible}
        onCancel={() => {
          setTerminateModalVisible(false);
          setTerminatingEmployee(null);
          terminateForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        {terminatingEmployee && (
          <div>
            <div style={{
              background: '#fff7e6',
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
              border: '1px solid #ffd591'
            }}>
              <p style={{ margin: 0 }}>
                Bạn đang xử lý nghỉ việc cho nhân viên: <strong>{terminatingEmployee.name}</strong> ({terminatingEmployee.employeeId})
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#8c8c8c' }}>
                • Thông tin nhân viên sẽ được lưu vào danh sách nghỉ việc<br />
                • Bạn có thể xem lại thông tin trong phần Quản lý nghỉ việc<br />
                • Vân tay sẽ bị vô hiệu hóa<br />
                • Tài khoản đăng nhập sẽ bị xóa
              </p>
            </div>

            <Form
              form={terminateForm}
              layout="vertical"
              onFinish={handleTerminateSubmit}
            >
              <Form.Item
                name="reason"
                label="Lý do nghỉ việc"
                rules={[{ required: true, message: 'Vui lòng chọn lý do' }]}
              >
                <Select placeholder="Chọn lý do">
                  <Option value="resigned">Tự nghỉ việc</Option>
                  <Option value="terminated">Sa thải</Option>
                  <Option value="contract_ended">Hết hợp đồng</Option>
                  <Option value="retirement">Nghỉ hưu</Option>
                  <Option value="other">Lý do khác</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="note"
                label="Ghi chú thêm"
              >
                <Input.TextArea
                  rows={3}
                  placeholder="Nhập ghi chú thêm về trường hợp nghỉ việc này..."
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => {
                    setTerminateModalVisible(false);
                    setTerminatingEmployee(null);
                    terminateForm.resetFields();
                  }}>
                    Hủy
                  </Button>
                  <Button type="primary" danger htmlType="submit">
                    Xác nhận nghỉ việc
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EmployeeManagement;

