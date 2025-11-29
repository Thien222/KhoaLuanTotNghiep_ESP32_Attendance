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
  Select,
  Popconfirm
} from 'antd';
import { 
  ClockCircleOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  WifiOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { getESP32Url, getAPIUrl } from '../../utils/configManager';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const AttendanceManagement = () => {
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([moment().subtract(7, 'days'), moment()]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();
  const [esp32Connected, setEsp32Connected] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    fetchAttendances();
    checkESP32Connection();
    fetchEmployees();
  }, [dateRange]);

  const fetchEmployees = async () => {
    try {
      const API_URL = getAPIUrl();
      const response = await axios.get(`${API_URL}/employees`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
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
      const response = await axios.get(`${esp32Url}/healthz`, { timeout: 2000 });
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
        message.error('Chưa đăng nhập');
        window.location.href = '/login';
        return;
      }
      
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');
      
      const response = await axios.get(`${API_URL}/attendance`, {
        params: { startDate, endDate },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setAttendances(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching attendances:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else {
        message.error('Lỗi tải dữ liệu');
      }
      setAttendances([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (record = null) => {
    setEditingRecord(record);
    if (record) {
      form.setFieldsValue({
        employeeId: record.employee?._id,
        date: moment(record.date),
        checkInTime: record.checkIn?.time ? moment(record.checkIn.time) : null,
        checkOutTime: record.checkOut?.time ? moment(record.checkOut.time) : null
      });
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      const API_URL = getAPIUrl();
      const response = await axios.delete(`${API_URL}/attendance/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.data.success) {
        message.success('Đã xóa bản ghi');
        fetchAttendances();
      }
    } catch (error) {
      console.error('Error deleting attendance:', error);
      message.error('Lỗi khi xóa');
    }
  };

  const calculatePreview = async (values) => {
    if (!values.date || !values.checkInTime || !values.checkOutTime || !values.employeeId) {
      setPreviewData(null);
      return;
    }
    
    try {
      setPreviewLoading(true);
      const API_URL = getAPIUrl();
      
      const dateStr = moment(values.date).format('YYYY-MM-DD');
      const checkInTimeStr = moment(values.checkInTime).format('HH:mm');
      const checkOutTimeStr = moment(values.checkOutTime).format('HH:mm');
      
      const response = await axios.post(`${API_URL}/attendance/manual`, {
        userId: values.employeeId,
        date: dateStr,
        checkInTime: checkInTimeStr,
        checkOutTime: checkOutTimeStr,
        preview: true
      }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.data.success) {
        setPreviewData(response.data.data);
      }
    } catch (error) {
      console.error('Error calculating preview:', error);
      setPreviewData(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      const API_URL = getAPIUrl();
      
      const dateStr = moment(values.date).format('YYYY-MM-DD');
      const checkInTimeStr = moment(values.checkInTime).format('HH:mm');
      const checkOutTimeStr = moment(values.checkOutTime).format('HH:mm');
      
      const response = await axios.post(`${API_URL}/attendance/manual`, {
        userId: values.employeeId,
        date: dateStr,
        checkInTime: checkInTimeStr,
        checkOutTime: checkOutTimeStr,
        preview: false
      }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.data.success) {
        message.success(editingRecord ? 'Đã cập nhật' : 'Đã thêm');
        setModalVisible(false);
        form.resetFields();
        setPreviewData(null);
        setEditingRecord(null);
        fetchAttendances();
      }
    } catch (error) {
      console.error('Error submitting:', error);
      message.error(error.response?.data?.message || 'Lỗi');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN').format(amount || 0);

  const getStatusColor = (status) => {
    const map = { present: 'green', late: 'orange', absent: 'red' };
    return map[status] || 'default';
  };

  const getStatusText = (status) => {
    const map = { present: 'Có mặt', late: 'Muộn', absent: 'Vắng' };
    return map[status] || status;
  };

  const columns = [
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      render: (date) => moment(date).format('DD/MM/YYYY'),
      sorter: (a, b) => moment(a.date).unix() - moment(b.date).unix(),
      width: 100,
      fixed: 'left'
    },
    {
      title: 'Nhân viên',
      key: 'employee',
      width: 150,
      fixed: 'left',
      render: (_, record) => (
        <div>
          <Text strong>{record.employee?.name || 'N/A'}</Text>
          {record.isManual && <Tag color="blue" style={{ marginLeft: 4 }}>Thủ công</Tag>}
        </div>
      )
    },
    {
      title: 'Giờ vào',
      key: 'checkIn',
      width: 80,
      render: (_, record) => {
        if (!record.checkIn?.time) return '-';
        const status = record.checkIn?.status;
        const color = status === 'late' ? '#ff4d4f' : '#52c41a';
        return <Text style={{ color }}>{moment(record.checkIn.time).format('HH:mm')}</Text>;
      }
    },
    {
      title: 'Giờ ra',
      key: 'checkOut',
      width: 80,
      render: (_, record) => {
        if (!record.checkOut?.time) return '-';
        const color = record.autoCheckout ? '#ff4d4f' : '#52c41a';
        return (
          <div>
            <Text style={{ color }}>{moment(record.checkOut.time).format('HH:mm')}</Text>
            {record.autoCheckout && <Tag color="error" size="small">Auto</Tag>}
          </div>
        );
      }
    },
    {
      title: 'Số giờ',
      dataIndex: 'workingHours',
      key: 'workingHours',
      width: 70,
      render: (hours) => hours ? `${Number(hours).toFixed(1)}h` : '-'
    },
    {
      title: 'Trễ',
      dataIndex: 'lateMinutes',
      key: 'lateMinutes',
      width: 70,
      render: (mins) => mins > 0 ? <Tag color="warning">{mins}p</Tag> : '-'
    },
    {
      title: 'OT',
      key: 'ot',
      width: 100,
      render: (_, record) => {
        if (!record.overtimeHours || record.overtimeHours <= 0) return '-';
        return (
          <div>
            <Tag color="blue">{record.overtimeHours}h</Tag>
            {record.estimatedOTSalary > 0 && (
              <Text style={{ color: '#52c41a', fontSize: 11 }}>
                +{formatCurrency(record.estimatedOTSalary)}đ
              </Text>
            )}
          </div>
        );
      }
    },
    {
      title: 'Phạt',
      dataIndex: 'actualPenalty',
      key: 'penalty',
      width: 100,
      render: (amount) => amount > 0 ? (
        <Tag color="error">-{formatCurrency(amount)}đ</Tag>
      ) : '-'
    },
    {
      title: 'TT',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) => <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            size="small"
            onClick={() => handleOpenModal(record)}
          />
          <Popconfirm
            title="Xóa bản ghi này?"
            onConfirm={() => handleDelete(record._id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      )
    }
  ];

  const todayCount = attendances.filter(a => moment(a.date).isSame(moment(), 'day')).length;
  const totalEmployees = new Set(attendances.filter(a => a.employee?.name).map(a => a.employee._id)).size;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Title level={4} style={{ margin: '0 0 16px 0' }}>
        <ClockCircleOutlined style={{ marginRight: 8 }} />
        Quản lý Chấm công
      </Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card size="small">
            <Statistic
              title="ESP32"
              value={esp32Connected ? "Online" : "Offline"}
              prefix={esp32Connected ? <WifiOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: esp32Connected ? '#52c41a' : '#ff4d4f', fontSize: 14 }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card size="small">
            <Statistic
              title="Hôm nay"
              value={todayCount}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff', fontSize: 14 }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card size="small">
            <Statistic
              title="Nhân viên"
              value={totalEmployees}
              prefix={<UserOutlined />}
              valueStyle={{ fontSize: 14 }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card size="small">
            <Statistic
              title="Bản ghi"
              value={attendances.length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a', fontSize: 14 }}
            />
          </Card>
        </Col>
      </Row>

      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <RangePicker
          value={dateRange}
          onChange={setDateRange}
          format="DD/MM/YYYY"
          size="small"
        />
        <Button size="small" onClick={fetchAttendances}>Tải lại</Button>
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
          Thêm thủ công
        </Button>
        <Button size="small" icon={<SafetyCertificateOutlined />} onClick={checkESP32Connection}>
          Test ESP32
        </Button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <Table
          columns={columns}
          dataSource={attendances}
          loading={loading}
          rowKey="_id"
          scroll={{ x: 1200 }}
          size="small"
          pagination={{ pageSize: 15, size: 'small', showSizeChanger: false }}
        />
      </div>

      {/* Modal */}
      <Modal
        title={editingRecord ? 'Sửa chấm công' : 'Thêm chấm công thủ công'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setPreviewData(null);
          setEditingRecord(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          onValuesChange={(_, allValues) => calculatePreview(allValues)}
        >
          <Form.Item
            name="employeeId"
            label="Nhân viên"
            rules={[{ required: true, message: 'Chọn nhân viên' }]}
          >
            <Select
              showSearch
              placeholder="Tìm nhân viên"
              optionFilterProp="children"
              disabled={!!editingRecord}
            >
              {employees.map(emp => (
                <Select.Option key={emp._id} value={emp._id}>
                  {emp.name} ({emp.employeeId})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="date"
            label="Ngày"
            rules={[{ required: true, message: 'Chọn ngày' }]}
            initialValue={moment()}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="checkInTime"
                label="Giờ vào"
                rules={[{ required: true, message: 'Chọn giờ' }]}
              >
                <TimePicker style={{ width: '100%' }} format="HH:mm" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="checkOutTime"
                label="Giờ ra"
                rules={[{ required: true, message: 'Chọn giờ' }]}
              >
                <TimePicker style={{ width: '100%' }} format="HH:mm" />
              </Form.Item>
            </Col>
          </Row>

          {previewData && (
            <>
              <Divider>Xem trước</Divider>
              <Card size="small" style={{ backgroundColor: '#fafafa', marginBottom: 16 }}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Text type="secondary">Giờ làm:</Text>
                    <div><Text strong>{previewData.workingHours}h</Text></div>
                  </Col>
                  <Col span={8}>
                    <Text type="secondary">Giờ OT:</Text>
                    <div><Text strong style={{ color: '#52c41a' }}>{previewData.overtimeHours}h</Text></div>
                  </Col>
                  <Col span={8}>
                    <Text type="secondary">Trễ:</Text>
                    <div><Text strong style={{ color: '#ff4d4f' }}>{previewData.lateMinutes}p</Text></div>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Tiền OT:</Text>
                    <div><Text strong style={{ color: '#52c41a' }}>+{formatCurrency(previewData.estimatedOTSalary)}đ</Text></div>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Phạt:</Text>
                    <div><Text strong style={{ color: '#ff4d4f' }}>-{formatCurrency(previewData.actualPenalty)}đ</Text></div>
                  </Col>
                </Row>
              </Card>
            </>
          )}

          {previewLoading && <Alert message="Đang tính..." type="info" showIcon style={{ marginBottom: 16 }} />}

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
                setPreviewData(null);
                setEditingRecord(null);
              }}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingRecord ? 'Cập nhật' : 'Thêm'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AttendanceManagement;
