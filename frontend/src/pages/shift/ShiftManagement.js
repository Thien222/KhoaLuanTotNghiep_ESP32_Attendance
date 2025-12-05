import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Card,
  Typography,
  Modal,
  Form,
  Input,
  TimePicker,
  InputNumber,
  Switch,
  Select,
  message,
  Tag,
  Popconfirm,
  Row,
  Col,
  DatePicker
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserAddOutlined,
  ClockCircleOutlined,
  UserOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { getAPIUrl } from '../../utils/configManager';

const { Title, Text } = Typography;
const { Option } = Select;

const ShiftManagement = () => {
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [shiftModalVisible, setShiftModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [viewAssignmentsModalVisible, setViewAssignmentsModalVisible] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [employeeShifts, setEmployeeShifts] = useState([]);
  const [selectedDate, setSelectedDate] = useState(moment());
  const [form] = Form.useForm();
  const [assignForm] = Form.useForm();

  useEffect(() => {
    fetchShifts();
    fetchEmployees();
  }, []);

  const fetchShifts = async () => {
    setLoading(true);
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_URL}/shifts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setShifts(response.data.data);
      }
    } catch (error) {
      message.error('Lỗi khi tải danh sách ca làm việc');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_URL}/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setEmployees(response.data.data.filter(emp => emp.status === 'active'));
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleCreateShift = () => {
    setEditingShift(null);
    form.resetFields();
    setShiftModalVisible(true);
  };

  const handleEditShift = (shift) => {
    setEditingShift(shift);
    form.setFieldsValue({
      name: shift.name,
      startTime: moment(shift.startTime, 'HH:mm'),
      endTime: moment(shift.endTime, 'HH:mm'),
      gracePeriod: shift.gracePeriod,
      isHoliday: shift.isHoliday,
      description: shift.description
    });
    setShiftModalVisible(true);
  };

  const handleDeleteShift = async (id) => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      const response = await axios.delete(`${API_URL}/shifts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        message.success('Xóa ca làm việc thành công');
        fetchShifts();
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi khi xóa ca làm việc');
    }
  };

  const handleSubmitShift = async (values) => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      const data = {
        name: values.name,
        startTime: values.startTime.format('HH:mm'),
        endTime: values.endTime.format('HH:mm'),
        gracePeriod: values.gracePeriod,
        isHoliday: values.isHoliday,
        description: values.description
      };

      let response;
      if (editingShift) {
        response = await axios.put(`${API_URL}/shifts/${editingShift._id}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        response = await axios.post(`${API_URL}/shifts`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      if (response.data.success) {
        message.success(editingShift ? 'Cập nhật ca làm việc thành công' : 'Tạo ca làm việc thành công');
        setShiftModalVisible(false);
        form.resetFields();
        fetchShifts();
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi khi lưu ca làm việc');
    }
  };

  const handleAssignShift = () => {
    assignForm.resetFields();
    setAssignModalVisible(true);
  };

  const handleSubmitAssign = async (values) => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      const response = await axios.post(`${API_URL}/shifts/assign`, {
        employeeIds: values.employeeIds,
        shiftId: values.shiftId,
        startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : moment().format('YYYY-MM-DD')
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        message.success(`Đã gán ca làm việc cho ${values.employeeIds.length} nhân viên`);
        setAssignModalVisible(false);
        assignForm.resetFields();
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi khi gán ca làm việc');
    }
  };

  const handleViewAssignments = () => {
    setSelectedDate(moment());
    setViewAssignmentsModalVisible(true);
    fetchEmployeeShifts(moment());
  };

  const fetchEmployeeShifts = async (date) => {
    try {
      setLoading(true);
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_URL}/shifts/assignments`, {
        params: { date: date.format('YYYY-MM-DD') },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setEmployeeShifts(response.data.data || []);
      }
    } catch (error) {
      message.error('Lỗi khi tải lịch gán ca');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    fetchEmployeeShifts(date);
  };

  const handleDeleteAssignment = async (assignmentId) => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      const response = await axios.delete(`${API_URL}/shifts/assignment/${assignmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        message.success('Đã xóa lịch gán ca thành công');
        // Reload the list
        fetchEmployeeShifts(selectedDate);
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi khi xóa lịch gán ca');
    }
  };

  const columns = [
    {
      title: 'Tên ca',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Text strong>{text}</Text>
          {record.isHoliday && <Tag color="orange">Ngày lễ</Tag>}
        </Space>
      )
    },
    {
      title: 'Giờ bắt đầu',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (time) => <Tag color="blue">{time}</Tag>
    },
    {
      title: 'Giờ kết thúc',
      dataIndex: 'endTime',
      key: 'endTime',
      render: (time) => <Tag color="green">{time}</Tag>
    },
    {
      title: 'Thời gian cho phép (phút)',
      dataIndex: 'gracePeriod',
      key: 'gracePeriod',
      render: (period) => `${period} phút`
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditShift(record)}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Bạn có chắc muốn xóa ca làm việc này?"
            onConfirm={() => handleDeleteShift(record._id)}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
            >
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0 }}>
            <ClockCircleOutlined style={{ marginRight: 8 }} />
            Quản lý Ca làm việc
          </Title>
          <Space>
            <Button
              icon={<ClockCircleOutlined />}
              onClick={handleViewAssignments}
            >
              Xem Lịch Gán Ca
            </Button>
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={handleAssignShift}
            >
              Gán Ca
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateShift}
            >
              Tạo Ca mới
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={shifts}
          loading={loading}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Create/Edit Shift Modal */}
      <Modal
        title={editingShift ? 'Sửa ca làm việc' : 'Tạo ca làm việc mới'}
        open={shiftModalVisible}
        onCancel={() => {
          setShiftModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitShift}
          initialValues={{
            gracePeriod: 15,
            isHoliday: false
          }}
        >
          <Form.Item
            name="name"
            label="Tên ca"
            rules={[{ required: true, message: 'Vui lòng nhập tên ca' }]}
          >
            <Input placeholder="Ví dụ: Ca Hành Chính, Ca Sáng, Ca Tối" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="startTime"
                label="Giờ bắt đầu"
                rules={[{ required: true, message: 'Vui lòng chọn giờ bắt đầu' }]}
              >
                <TimePicker
                  format="HH:mm"
                  style={{ width: '100%' }}
                  placeholder="Chọn giờ"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="endTime"
                label="Giờ kết thúc"
                rules={[{ required: true, message: 'Vui lòng chọn giờ kết thúc' }]}
              >
                <TimePicker
                  format="HH:mm"
                  style={{ width: '100%' }}
                  placeholder="Chọn giờ"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="gracePeriod"
            label="Thời gian cho phép (phút)"
            rules={[{ required: true, message: 'Vui lòng nhập thời gian cho phép' }]}
          >
            <InputNumber
              min={0}
              max={60}
              style={{ width: '100%' }}
              placeholder="Ví dụ: 15"
            />
          </Form.Item>

          <Form.Item
            name="isHoliday"
            label="Là ngày lễ"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả"
          >
            <Input.TextArea rows={3} placeholder="Mô tả về ca làm việc này" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setShiftModalVisible(false);
                form.resetFields();
              }}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit">
                {editingShift ? 'Cập nhật' : 'Tạo mới'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Assign Shift Modal */}
      <Modal
        title="Gán Ca làm việc cho Nhân viên"
        open={assignModalVisible}
        onCancel={() => {
          setAssignModalVisible(false);
          assignForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={assignForm}
          layout="vertical"
          onFinish={handleSubmitAssign}
        >
          <Form.Item
            name="shiftId"
            label="Chọn Ca làm việc"
            rules={[{ required: true, message: 'Vui lòng chọn ca làm việc' }]}
          >
            <Select placeholder="Chọn ca làm việc">
              {shifts.map(shift => (
                <Option key={shift._id} value={shift._id}>
                  {shift.name} ({shift.startTime} - {shift.endTime})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="employeeIds"
            label="Chọn Nhân viên"
            rules={[{ required: true, message: 'Vui lòng chọn ít nhất một nhân viên' }]}
          >
            <Select
              mode="multiple"
              placeholder="Chọn nhân viên"
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {employees.map(emp => (
                <Option key={emp._id} value={emp._id}>
                  {emp.name} ({emp.employeeId}) - {emp.department}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="startDate"
            label="Ngày bắt đầu"
          >
            <DatePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              placeholder="Chọn ngày (mặc định: hôm nay)"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setAssignModalVisible(false);
                assignForm.resetFields();
              }}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit">
                Gán Ca
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Assignments Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClockCircleOutlined style={{ color: '#722ed1', fontSize: '20px' }} />
            <span>Lịch Gán Ca Làm Việc</span>
          </div>
        }
        open={viewAssignmentsModalVisible}
        onCancel={() => setViewAssignmentsModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setViewAssignmentsModalVisible(false)}>
            Đóng
          </Button>
        ]}
        width={1200}
        style={{ top: 20 }}
      >
        <div style={{ 
          marginBottom: 16, 
          padding: '12px 16px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Text strong style={{ fontSize: '15px' }}>Chọn ngày:</Text>
          <DatePicker
            value={selectedDate}
            onChange={handleDateChange}
            format="DD/MM/YYYY"
            placeholder="Chọn ngày"
            style={{ width: 200 }}
              allowClear={false}
          />
          </div>
          <div>
            <Text type="secondary">
              Tổng số: <Text strong style={{ color: '#722ed1' }}>{employeeShifts.length}</Text> lịch gán ca
            </Text>
          </div>
        </div>

        <Table
          columns={[
            {
              title: 'Ngày bắt đầu',
              dataIndex: 'startDate',
              key: 'startDate',
              width: 120,
              fixed: 'left',
              sorter: (a, b) => moment(a.startDate).unix() - moment(b.startDate).unix(),
              render: (date) => (
                <Text strong style={{ color: '#1890ff' }}>
                  {moment(date).format('DD/MM/YYYY')}
                </Text>
              )
            },
            {
              title: 'Nhân viên',
              key: 'employeeName',
              width: 180,
              fixed: 'left',
              render: (_, record) => (
                <div>
                <Space>
                    <UserOutlined style={{ color: '#722ed1' }} />
                    <div>
                      <Text strong style={{ display: 'block' }}>
                        {record.employee?.name || record.employee?.employeeId || 'N/A'}
                      </Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {record.employee?.employeeId || ''}
                      </Text>
                    </div>
                </Space>
                </div>
              )
            },
            {
              title: 'Phòng ban',
              dataIndex: ['employee', 'department'],
              key: 'department',
              width: 120,
              render: (dept) => dept ? <Tag color="blue">{dept}</Tag> : '-'
            },
            {
              title: 'Ca làm việc',
              key: 'shiftInfo',
              width: 200,
              render: (_, record) => (
                <div>
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Space>
                      <Tag 
                        color={record.isOvertimeShift ? 'purple' : 'blue'}
                        style={{ fontSize: '13px', padding: '4px 8px' }}
                      >
                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                        {record.shift?.name || 'N/A'}
                      </Tag>
                      {record.isOvertimeShift && (
                        <Tag color="purple" style={{ fontSize: '12px' }}>OT</Tag>
                      )}
                    </Space>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {record.shift?.startTime || '--:--'} - {record.shift?.endTime || '--:--'}
                </Text>
                  </Space>
                </div>
              )
            },
            {
              title: 'Trạng thái',
              dataIndex: 'isActive',
              key: 'isActive',
              width: 130,
              align: 'center',
              filters: [
                { text: 'Đang hoạt động', value: true },
                { text: 'Đã hủy', value: false }
              ],
              onFilter: (value, record) => record.isActive === value,
              render: (isActive) => (
                <Tag color={isActive ? 'green' : 'red'} style={{ fontSize: '13px' }}>
                  {isActive ? 'Đang hoạt động' : 'Đã hủy'}
                </Tag>
              )
            },
            {
              title: 'Thao tác',
              key: 'action',
              width: 100,
              fixed: 'right',
              align: 'center',
              render: (_, record) => (
                <Popconfirm
                  title="Xóa lịch gán ca?"
                  description={
                    <div>
                      <p>Bạn có chắc muốn xóa lịch gán ca cho:</p>
                      <p><strong>{record.employee?.name}</strong> - {record.shift?.name}?</p>
                    </div>
                  }
                  onConfirm={() => handleDeleteAssignment(record._id)}
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                  icon={<DeleteOutlined style={{ color: '#ff4d4f' }} />}
                >
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    disabled={!record.isActive}
                    size="small"
                  >
                    Xóa
                  </Button>
                </Popconfirm>
              )
            }
          ]}
          dataSource={employeeShifts}
          loading={loading}
          rowKey="_id"
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} lịch gán ca`,
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          scroll={{ x: 1000 }}
          locale={{ emptyText: 'Không có nhân viên nào được gán ca trong ngày này' }}
          size="middle"
        />
      </Modal>
    </div>
  );
};

export default ShiftManagement;

