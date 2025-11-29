import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Modal, 
  Form, 
  DatePicker, 
  Input, 
  Select, 
  message, 
  Card,
  Typography,
  Tag,
  Row,
  Col,
  Statistic,
  Tabs,
  TimePicker,
  Empty,
  Popconfirm
} from 'antd';
import { 
  PlusOutlined, 
  CheckOutlined, 
  CloseOutlined,
  CalendarOutlined,
  FieldTimeOutlined,
  DeleteOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { getAPIUrl } from '../../utils/configManager';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Option } = Select;

const RequestManagement = () => {
  const [loading, setLoading] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [otRequests, setOtRequests] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [pendingOTs, setPendingOTs] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [requestType, setRequestType] = useState('leave'); // 'leave' or 'overtime'
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [form] = Form.useForm();
  const [userRole, setUserRole] = useState('employee');
  const [activeTab, setActiveTab] = useState('my-requests');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setUserRole(user.role || 'employee');
    }
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch my leave requests
      const leaveRes = await axios.get(`${API_URL}/leave`, { headers });
      if (leaveRes.data.success) {
        setLeaveRequests(leaveRes.data.data || []);
      }

      // Fetch my OT requests
      const otRes = await axios.get(`${API_URL}/overtime/my-requests`, { headers });
      if (otRes.data.success) {
        setOtRequests(otRes.data.data || []);
      }

      // If manager, fetch pending requests
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        if (user.role === 'manager') {
          // Pending leaves
          const pendingLeaveRes = await axios.get(`${API_URL}/leave?status=pending`, { headers });
          if (pendingLeaveRes.data.success) {
            setPendingLeaves((pendingLeaveRes.data.data || []).filter(l => l.status === 'pending'));
          }

          // Pending OTs
          const pendingOTRes = await axios.get(`${API_URL}/overtime/pending`, { headers });
          if (pendingOTRes.data.success) {
            setPendingOTs(pendingOTRes.data.data || []);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (requestType === 'leave') {
        const payload = {
          leaveType: values.leaveType,
          startDate: values.dateRange[0].format('YYYY-MM-DD'),
          endDate: values.dateRange[1].format('YYYY-MM-DD'),
          reason: values.reason
        };

        const response = await axios.post(`${API_URL}/leave`, payload, { headers });
        if (response.data.success) {
          message.success('Đã gửi đơn nghỉ phép!');
        }
      } else {
        const payload = {
          date: values.date.format('YYYY-MM-DD'),
          startTime: values.startTime.format('HH:mm'),
          endTime: values.endTime.format('HH:mm'),
          reason: values.reason
        };

        const response = await axios.post(`${API_URL}/overtime/request`, payload, { headers });
        if (response.data.success) {
          message.success('Đã gửi đơn đăng ký OT!');
        }
      }

      setModalVisible(false);
      form.resetFields();
      fetchAllData();
    } catch (error) {
      console.error('Error submitting request:', error);
      message.error(error.response?.data?.message || 'Lỗi khi gửi đơn');
    }
  };

  const handleApprove = async (request, type) => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (type === 'leave') {
        await axios.put(`${API_URL}/leave/${request._id}/review`, {
          status: 'approved'
        }, { headers });
      } else {
        await axios.put(`${API_URL}/overtime/approve/${request._id}`, {}, { headers });
      }

      message.success('Đã duyệt đơn!');
      fetchAllData();
    } catch (error) {
      message.error('Lỗi khi duyệt đơn');
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (selectedRequest.type === 'leave') {
        await axios.put(`${API_URL}/leave/${selectedRequest._id}/review`, {
          status: 'rejected',
          reviewComment: rejectReason
        }, { headers });
      } else {
        await axios.put(`${API_URL}/overtime/reject/${selectedRequest._id}`, {
          comment: rejectReason
        }, { headers });
      }

      message.success('Đã từ chối đơn!');
      setReviewModalVisible(false);
      setRejectReason('');
      fetchAllData();
    } catch (error) {
      message.error('Lỗi khi từ chối đơn');
    }
  };

  const handleCancel = async (id, type) => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (type === 'leave') {
        await axios.delete(`${API_URL}/leave/${id}`, { headers });
      } else {
        await axios.delete(`${API_URL}/overtime/request/${id}`, { headers });
      }

      message.success('Đã hủy đơn!');
      fetchAllData();
    } catch (error) {
      message.error('Lỗi khi hủy đơn');
    }
  };

  const getStatusTag = (status) => {
    const map = {
      pending: { color: 'orange', text: 'Chờ duyệt' },
      approved: { color: 'green', text: 'Đã duyệt' },
      rejected: { color: 'red', text: 'Từ chối' },
      cancelled: { color: 'gray', text: 'Đã hủy' }
    };
    const s = map[status] || { color: 'default', text: status };
    return <Tag color={s.color}>{s.text}</Tag>;
  };

  const getLeaveTypeText = (type) => {
    const map = {
      annual: 'Nghỉ phép năm',
      sick: 'Nghỉ ốm',
      unpaid: 'Nghỉ không lương',
      maternity: 'Thai sản',
      other: 'Khác'
    };
    return map[type] || type;
  };

  // Combine all my requests
  const myRequests = [
    ...leaveRequests.map(l => ({ ...l, requestType: 'leave' })),
    ...otRequests.map(o => ({ ...o, requestType: 'overtime' }))
  ].sort((a, b) => moment(b.createdAt).unix() - moment(a.createdAt).unix());

  // All pending for admin
  const allPending = [
    ...pendingLeaves.map(l => ({ ...l, requestType: 'leave' })),
    ...pendingOTs.map(o => ({ ...o, requestType: 'overtime' }))
  ].sort((a, b) => moment(b.createdAt).unix() - moment(a.createdAt).unix());

  const myRequestColumns = [
    {
      title: 'Loại đơn',
      key: 'type',
      width: 120,
      render: (_, record) => (
        record.requestType === 'leave' 
          ? <Tag color="blue" icon={<CalendarOutlined />}>Nghỉ phép</Tag>
          : <Tag color="purple" icon={<FieldTimeOutlined />}>OT</Tag>
      )
    },
    {
      title: 'Thời gian',
      key: 'time',
      render: (_, record) => {
        if (record.requestType === 'leave') {
          return `${moment(record.startDate).format('DD/MM')} - ${moment(record.endDate).format('DD/MM/YYYY')}`;
        }
        return `${moment(record.date).format('DD/MM/YYYY')} (${record.startTime} - ${record.endTime})`;
      }
    },
    {
      title: 'Chi tiết',
      key: 'detail',
      render: (_, record) => {
        if (record.requestType === 'leave') {
          return <Text>{getLeaveTypeText(record.leaveType)}</Text>;
        }
        return <Text>{record.estimatedHours}h OT</Text>;
      }
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      width: 200
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: getStatusTag
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 100,
      render: (_, record) => (
        record.status === 'pending' && (
          <Popconfirm
            title="Hủy đơn này?"
            onConfirm={() => handleCancel(record._id, record.requestType)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        )
      )
    }
  ];

  const adminColumns = [
    {
      title: 'Nhân viên',
      key: 'employee',
      render: (_, record) => (
        <div>
          <Text strong>{record.employee?.name || 'N/A'}</Text>
          <br />
          <Text type="secondary">{record.employee?.department || ''}</Text>
        </div>
      )
    },
    {
      title: 'Loại đơn',
      key: 'type',
      width: 120,
      render: (_, record) => (
        record.requestType === 'leave' 
          ? <Tag color="blue" icon={<CalendarOutlined />}>Nghỉ phép</Tag>
          : <Tag color="purple" icon={<FieldTimeOutlined />}>OT</Tag>
      )
    },
    {
      title: 'Thời gian',
      key: 'time',
      render: (_, record) => {
        if (record.requestType === 'leave') {
          return `${moment(record.startDate).format('DD/MM')} - ${moment(record.endDate).format('DD/MM')}`;
        }
        return `${moment(record.date).format('DD/MM')} (${record.startTime}-${record.endTime})`;
      }
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      width: 180
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="primary" 
            icon={<CheckOutlined />}
            onClick={() => handleApprove(record, record.requestType)}
            size="small"
          >
            Duyệt
          </Button>
          <Button 
            danger 
            icon={<CloseOutlined />}
            onClick={() => {
              setSelectedRequest({ ...record, type: record.requestType });
              setReviewModalVisible(true);
            }}
            size="small"
          >
            Từ chối
          </Button>
        </Space>
      )
    }
  ];

  const pendingLeaveCount = pendingLeaves.length;
  const pendingOTCount = pendingOTs.length;
  const myPendingCount = myRequests.filter(r => r.status === 'pending').length;

  const tabItems = [
    {
      key: 'my-requests',
      label: (
        <span>
          <FileTextOutlined /> Đơn của tôi {myPendingCount > 0 && <Tag color="orange">{myPendingCount}</Tag>}
        </span>
      ),
      children: (
        <div style={{ height: 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 16 }}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setModalVisible(true)}
            >
              Gửi yêu cầu
            </Button>
          </div>
          
          <div style={{ flex: 1, overflow: 'auto' }}>
            {myRequests.length > 0 ? (
              <Table
                columns={myRequestColumns}
                dataSource={myRequests}
                rowKey="_id"
                loading={loading}
                pagination={{ pageSize: 10, size: 'small' }}
                size="small"
              />
            ) : (
              <Empty description="Bạn chưa có đơn yêu cầu nào" />
            )}
          </div>
        </div>
      )
    }
  ];

  // Add admin tab
  if (userRole === 'manager') {
    tabItems.push({
      key: 'pending',
      label: (
        <span>
          Chờ duyệt {(pendingLeaveCount + pendingOTCount) > 0 && 
            <Tag color="red">{pendingLeaveCount + pendingOTCount}</Tag>
          }
        </span>
      ),
      children: (
        <div style={{ height: 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column' }}>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card size="small">
                <Statistic 
                  title="Nghỉ phép chờ duyệt" 
                  value={pendingLeaveCount} 
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic 
                  title="OT chờ duyệt" 
                  value={pendingOTCount} 
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic 
                  title="Tổng" 
                  value={pendingLeaveCount + pendingOTCount} 
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
          </Row>
          
          <div style={{ flex: 1, overflow: 'auto' }}>
            {allPending.length > 0 ? (
              <Table
                columns={adminColumns}
                dataSource={allPending}
                rowKey="_id"
                loading={loading}
                pagination={{ pageSize: 10, size: 'small' }}
                size="small"
              />
            ) : (
              <Empty description="Không có đơn nào cần duyệt" />
            )}
          </div>
        </div>
      )
    });
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Title level={3} style={{ margin: '0 0 16px 0' }}>
        <FileTextOutlined style={{ marginRight: 8 }} />
        Quản lý Đơn từ
      </Title>
      
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={tabItems}
          style={{ height: '100%' }}
        />
      </div>

      {/* Create Request Modal */}
      <Modal
        title="Gửi yêu cầu mới"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ requestType: 'leave' }}
        >
          <Form.Item
            name="requestType"
            label="Loại đơn"
            rules={[{ required: true }]}
          >
            <Select onChange={(val) => setRequestType(val)}>
              <Option value="leave">
                <CalendarOutlined /> Xin nghỉ phép
              </Option>
              <Option value="overtime">
                <FieldTimeOutlined /> Đăng ký OT
              </Option>
            </Select>
          </Form.Item>

          {requestType === 'leave' ? (
            <>
              <Form.Item
                name="leaveType"
                label="Loại nghỉ"
                rules={[{ required: true, message: 'Chọn loại nghỉ phép' }]}
              >
                <Select placeholder="Chọn loại nghỉ phép">
                  <Option value="annual">Nghỉ phép năm</Option>
                  <Option value="sick">Nghỉ ốm</Option>
                  <Option value="unpaid">Nghỉ không lương</Option>
                  <Option value="other">Khác</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="dateRange"
                label="Thời gian nghỉ"
                rules={[{ required: true, message: 'Chọn thời gian nghỉ' }]}
              >
                <RangePicker 
                  style={{ width: '100%' }} 
                  format="DD/MM/YYYY"
                />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item
                name="date"
                label="Ngày làm OT"
                rules={[{ required: true, message: 'Chọn ngày' }]}
              >
                <DatePicker 
                  style={{ width: '100%' }} 
                  format="DD/MM/YYYY"
                  // Cho phép chọn bất kỳ ngày nào (để test/demo)
                  // Trong thực tế có thể thêm: disabledDate={(current) => current && current < moment().startOf('day')}
                />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="startTime"
                    label="Giờ bắt đầu"
                    rules={[{ required: true, message: 'Chọn giờ' }]}
                  >
                    <TimePicker 
                      style={{ width: '100%' }} 
                      format="HH:mm"
                      minuteStep={15}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="endTime"
                    label="Giờ kết thúc"
                    rules={[{ required: true, message: 'Chọn giờ' }]}
                  >
                    <TimePicker 
                      style={{ width: '100%' }} 
                      format="HH:mm"
                      minuteStep={15}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          <Form.Item
            name="reason"
            label="Lý do"
            rules={[{ required: true, message: 'Nhập lý do' }]}
          >
            <TextArea rows={3} placeholder="Nhập lý do..." />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit">
                Gửi đơn
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Reject Modal */}
      <Modal
        title="Từ chối đơn"
        open={reviewModalVisible}
        onCancel={() => {
          setReviewModalVisible(false);
          setRejectReason('');
        }}
        onOk={handleReject}
        okText="Từ chối"
        okButtonProps={{ danger: true }}
        cancelText="Hủy"
      >
        <p>Bạn chắc chắn muốn từ chối đơn của <strong>{selectedRequest?.employee?.name}</strong>?</p>
        <Input.TextArea
          placeholder="Nhập lý do từ chối (không bắt buộc)"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={3}
        />
      </Modal>
    </div>
  );
};

export default RequestManagement;

