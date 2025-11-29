import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  DatePicker, 
  TimePicker, 
  Tag, 
  Space, 
  Typography, 
  Tabs,
  message,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Empty
} from 'antd';
import { 
  PlusOutlined, 
  CheckOutlined, 
  CloseOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  FieldTimeOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { getAPIUrl } from '../../utils/configManager';

const { Title, Text } = Typography;
const { TextArea } = Input;

const OvertimeManagement = () => {
  const [loading, setLoading] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
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
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      if (!token) {
        message.error('Chưa đăng nhập');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      // Fetch my requests
      const myRes = await axios.get(`${API_URL}/overtime/my-requests`, { headers });
      if (myRes.data.success) {
        setMyRequests(myRes.data.data || []);
      }

      // If manager, fetch pending and all requests
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        if (user.role === 'manager') {
          const pendingRes = await axios.get(`${API_URL}/overtime/pending`, { headers });
          if (pendingRes.data.success) {
            setPendingRequests(pendingRes.data.data || []);
          }

          const allRes = await axios.get(`${API_URL}/overtime/all`, { headers });
          if (allRes.data.success) {
            setAllRequests(allRes.data.data || []);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching OT data:', error);
      message.error('Lỗi khi tải dữ liệu OT');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      const payload = {
        date: values.date.format('YYYY-MM-DD'),
        startTime: values.startTime.format('HH:mm'),
        endTime: values.endTime.format('HH:mm'),
        reason: values.reason
      };

      const response = await axios.post(`${API_URL}/overtime/request`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        message.success('Đã gửi đơn đăng ký OT thành công!');
        setModalVisible(false);
        form.resetFields();
        fetchData();
      }
    } catch (error) {
      console.error('Error submitting OT request:', error);
      message.error(error.response?.data?.message || 'Lỗi khi gửi đơn OT');
    }
  };

  const handleCancel = async (id) => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      const response = await axios.delete(`${API_URL}/overtime/request/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        message.success('Đã hủy đơn OT');
        fetchData();
      }
    } catch (error) {
      console.error('Error canceling OT request:', error);
      message.error(error.response?.data?.message || 'Lỗi khi hủy đơn OT');
    }
  };

  const handleApprove = async (id) => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      const response = await axios.put(`${API_URL}/overtime/approve/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        message.success('Đã duyệt đơn OT');
        fetchData();
      }
    } catch (error) {
      console.error('Error approving OT request:', error);
      message.error(error.response?.data?.message || 'Lỗi khi duyệt đơn OT');
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      const response = await axios.put(`${API_URL}/overtime/reject/${selectedRequest._id}`, {
        comment: rejectReason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        message.success('Đã từ chối đơn OT');
        setRejectModalVisible(false);
        setRejectReason('');
        setSelectedRequest(null);
        fetchData();
      }
    } catch (error) {
      console.error('Error rejecting OT request:', error);
      message.error(error.response?.data?.message || 'Lỗi khi từ chối đơn OT');
    }
  };

  const getStatusTag = (status) => {
    const statusMap = {
      pending: { color: 'orange', text: 'Chờ duyệt' },
      approved: { color: 'green', text: 'Đã duyệt' },
      rejected: { color: 'red', text: 'Từ chối' }
    };
    const s = statusMap[status] || { color: 'default', text: status };
    return <Tag color={s.color}>{s.text}</Tag>;
  };

  const myRequestColumns = [
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      render: (date) => moment(date).format('DD/MM/YYYY'),
      sorter: (a, b) => moment(a.date).unix() - moment(b.date).unix()
    },
    {
      title: 'Thời gian OT',
      key: 'time',
      render: (_, record) => `${record.startTime} - ${record.endTime}`
    },
    {
      title: 'Số giờ',
      dataIndex: 'estimatedHours',
      key: 'hours',
      render: (hours) => `${hours}h`
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: getStatusTag
    },
    {
      title: 'Ngày gửi',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => moment(date).format('DD/MM/YYYY HH:mm')
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, record) => (
        record.status === 'pending' && (
          <Popconfirm
            title="Bạn chắc chắn muốn hủy đơn này?"
            onConfirm={() => handleCancel(record._id)}
            okText="Hủy đơn"
            cancelText="Không"
          >
            <Button type="text" danger icon={<DeleteOutlined />}>
              Hủy
            </Button>
          </Popconfirm>
        )
      )
    }
  ];

  const adminColumns = [
    {
      title: 'Nhân viên',
      dataIndex: ['employee', 'name'],
      key: 'employee',
      render: (name, record) => (
        <div>
          <Text strong>{name}</Text>
          <br />
          <Text type="secondary">{record.employee?.employeeId}</Text>
        </div>
      )
    },
    {
      title: 'Phòng ban',
      dataIndex: ['employee', 'department'],
      key: 'department'
    },
    {
      title: 'Ngày OT',
      dataIndex: 'date',
      key: 'date',
      render: (date) => moment(date).format('DD/MM/YYYY'),
      sorter: (a, b) => moment(a.date).unix() - moment(b.date).unix()
    },
    {
      title: 'Thời gian',
      key: 'time',
      render: (_, record) => `${record.startTime} - ${record.endTime}`
    },
    {
      title: 'Số giờ',
      dataIndex: 'estimatedHours',
      key: 'hours',
      render: (hours) => <Tag color="blue">{hours}h</Tag>
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
      render: (_, record) => (
        record.status === 'pending' && (
          <Space>
            <Button 
              type="primary" 
              icon={<CheckOutlined />}
              onClick={() => handleApprove(record._id)}
              size="small"
            >
              Duyệt
            </Button>
            <Button 
              danger 
              icon={<CloseOutlined />}
              onClick={() => {
                setSelectedRequest(record);
                setRejectModalVisible(true);
              }}
              size="small"
            >
              Từ chối
            </Button>
          </Space>
        )
      )
    }
  ];

  const pendingCount = pendingRequests.length;
  const approvedCount = allRequests.filter(r => r.status === 'approved').length;
  const myPendingCount = myRequests.filter(r => r.status === 'pending').length;

  const tabItems = [
    {
      key: 'my-requests',
      label: (
        <span>
          <FieldTimeOutlined /> Đơn OT của tôi {myPendingCount > 0 && <Tag color="orange">{myPendingCount}</Tag>}
        </span>
      ),
      children: (
        <Card>
          <div style={{ marginBottom: 16 }}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setModalVisible(true)}
            >
              Đăng ký OT
            </Button>
          </div>
          
          {myRequests.length > 0 ? (
            <Table
              columns={myRequestColumns}
              dataSource={myRequests}
              rowKey="_id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          ) : (
            <Empty description="Bạn chưa có đơn đăng ký OT nào" />
          )}
        </Card>
      )
    }
  ];

  // Add admin tabs if manager
  if (userRole === 'manager') {
    tabItems.push({
      key: 'pending',
      label: (
        <span>
          <ClockCircleOutlined /> Chờ duyệt {pendingCount > 0 && <Tag color="red">{pendingCount}</Tag>}
        </span>
      ),
      children: (
        <Card>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Statistic 
                title="Đang chờ duyệt" 
                value={pendingCount} 
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
            <Col span={8}>
              <Statistic 
                title="Đã duyệt tháng này" 
                value={approvedCount} 
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col span={8}>
              <Statistic 
                title="Tổng đơn" 
                value={allRequests.length} 
              />
            </Col>
          </Row>
          
          {pendingRequests.length > 0 ? (
            <Table
              columns={adminColumns}
              dataSource={pendingRequests}
              rowKey="_id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          ) : (
            <Empty description="Không có đơn OT nào cần duyệt" />
          )}
        </Card>
      )
    });

    tabItems.push({
      key: 'all',
      label: 'Tất cả đơn OT',
      children: (
        <Card>
          <Table
            columns={[...adminColumns.slice(0, -1), {
              title: 'Người duyệt',
              dataIndex: ['reviewedBy', 'username'],
              key: 'reviewer',
              render: (username, record) => record.reviewedAt ? (
                <div>
                  <Text>{username || 'Admin'}</Text>
                  <br />
                  <Text type="secondary">{moment(record.reviewedAt).format('DD/MM HH:mm')}</Text>
                </div>
              ) : '-'
            }]}
            dataSource={allRequests}
            rowKey="_id"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      )
    });
  }

  return (
    <div>
      <Title level={2}>
        <FieldTimeOutlined style={{ marginRight: 8 }} />
        Quản lý OT
      </Title>
      
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={tabItems}
      />

      {/* Create OT Request Modal */}
      <Modal
        title="Đăng ký làm thêm giờ (OT)"
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
        >
          <Form.Item
            name="date"
            label="Ngày làm OT"
            rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
          >
            <DatePicker 
              style={{ width: '100%' }} 
              format="DD/MM/YYYY"
              disabledDate={(current) => current && current < moment().startOf('day')}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="startTime"
                label="Giờ bắt đầu"
                rules={[{ required: true, message: 'Vui lòng chọn giờ bắt đầu' }]}
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
                rules={[{ required: true, message: 'Vui lòng chọn giờ kết thúc' }]}
              >
                <TimePicker 
                  style={{ width: '100%' }} 
                  format="HH:mm"
                  minuteStep={15}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="reason"
            label="Lý do làm OT"
            rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}
          >
            <TextArea 
              rows={3} 
              placeholder="Ví dụ: Hoàn thành dự án A, Deadline gấp..."
            />
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
                Gửi đăng ký
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Reject Modal */}
      <Modal
        title="Từ chối đơn OT"
        open={rejectModalVisible}
        onCancel={() => {
          setRejectModalVisible(false);
          setRejectReason('');
          setSelectedRequest(null);
        }}
        onOk={handleReject}
        okText="Từ chối"
        okButtonProps={{ danger: true }}
        cancelText="Hủy"
      >
        <p>Bạn chắc chắn muốn từ chối đơn OT của <strong>{selectedRequest?.employee?.name}</strong>?</p>
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

export default OvertimeManagement;

