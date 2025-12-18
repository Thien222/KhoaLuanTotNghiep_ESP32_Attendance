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
  Empty,
  Popconfirm,
  Alert,
  Spin
} from 'antd';
import {
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
  CalendarOutlined,
  FieldTimeOutlined,
  DeleteOutlined,
  FileTextOutlined,
  LoadingOutlined,
  ClockCircleOutlined
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
  const [activeTab, setActiveTab] = useState(() => {
    // Admin mặc định vào tab "pending", nhân viên vào tab "my-requests"
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.role === 'manager' ? 'pending' : 'my-requests';
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
    return 'my-requests';
  });
  const [otPreview, setOtPreview] = useState(null); // NEW: Preview OT timeframe from shift
  const [previewLoading, setPreviewLoading] = useState(false);
  const [filterDate, setFilterDate] = useState(null); // Filter by month/date
  const [filterType, setFilterType] = useState('month'); // 'month' or 'date'

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

  // NEW: Fetch OT preview when date is selected
  const fetchOTPreview = async (date) => {
    if (!date) {
      setOtPreview(null);
      return;
    }

    setPreviewLoading(true);
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/overtime/preview/${date.format('YYYY-MM-DD')}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setOtPreview(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching OT preview:', error);
      setOtPreview(null);
    } finally {
      setPreviewLoading(false);
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
        // OT request with manual time selection
        const payload = {
          date: values.date.format('YYYY-MM-DD'),
          startTime: values.startTime,
          endTime: values.endTime,
          reason: values.reason
        };

        const response = await axios.post(`${API_URL}/overtime/request`, payload, { headers });
        if (response.data.success) {
          message.success(response.data.message || 'Đã gửi đơn đăng ký OT!');
        }
      }

      setModalVisible(false);
      form.resetFields();
      setOtPreview(null);
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
        // Encode ID để tránh lỗi với ký tự đặc biệt
        const encodedId = encodeURIComponent(id);
        await axios.delete(`${API_URL}/overtime/request/${encodedId}`, { headers });
      }

      message.success('Đã hủy đơn!');
      fetchAllData();
    } catch (error) {
      console.error('Error canceling request:', error);
      const errorMessage = error.response?.data?.message || 'Lỗi khi hủy đơn';
      message.error(errorMessage);
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
        return (
          <Space direction="vertical" size={0}>
            <Text>{moment(record.date).format('DD/MM/YYYY')}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.shiftName && `${record.shiftName}: `}{record.startTime} - {record.endTime}
            </Text>
          </Space>
        );
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
        return (
          <Space direction="vertical" size={0}>
            <Text>{moment(record.date).format('DD/MM/YYYY')}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.shiftName && `${record.shiftName}: `}{record.startTime}-{record.endTime}
            </Text>
          </Space>
        );
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
      width: 250,
      align: 'center',
      render: (_, record) => (
        <Space size={8} style={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => handleApprove(record, record.requestType)}
            size="small"
            style={{
              borderRadius: 6,
              minWidth: 70,
              background: '#22c55e',
              borderColor: '#22c55e'
            }}
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
            style={{ borderRadius: 6, minWidth: 70 }}
          >
            Từ chối
          </Button>
          <Popconfirm
            title="Xóa đơn này?"
            description="Bạn có chắc muốn xóa đơn này không?"
            onConfirm={() => handleCancel(record._id, record.requestType)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const pendingLeaveCount = pendingLeaves.length;
  const pendingOTCount = pendingOTs.length;
  const myPendingCount = myRequests.filter(r => r.status === 'pending').length;

  // Separate pending and history requests
  const myPendingRequests = myRequests.filter(r => r.status === 'pending');
  let myHistoryRequests = myRequests.filter(r => r.status !== 'pending');

  // Filter by date/month
  if (filterDate) {
    if (filterType === 'month') {
      // Filter by month
      const filterMonth = moment(filterDate).format('YYYY-MM');
      myHistoryRequests = myHistoryRequests.filter(r => {
        if (r.requestType === 'leave') {
          const startMonth = moment(r.startDate).format('YYYY-MM');
          const endMonth = moment(r.endDate).format('YYYY-MM');
          return startMonth === filterMonth || endMonth === filterMonth;
        } else {
          return moment(r.date).format('YYYY-MM') === filterMonth;
        }
      });
    } else {
      // Filter by date
      const filterDateStr = moment(filterDate).format('YYYY-MM-DD');
      myHistoryRequests = myHistoryRequests.filter(r => {
        if (r.requestType === 'leave') {
          const startDate = moment(r.startDate).format('YYYY-MM-DD');
          const endDate = moment(r.endDate).format('YYYY-MM-DD');
          return moment(filterDateStr).isBetween(startDate, endDate, null, '[]');
        } else {
          return moment(r.date).format('YYYY-MM-DD') === filterDateStr;
        }
      });
    }
  }

  const approvedCount = myHistoryRequests.filter(r => r.status === 'approved').length;
  const rejectedCount = myHistoryRequests.filter(r => r.status === 'rejected').length;

  const historyColumns = [
    {
      title: 'Tên NV',
      key: 'employeeName',
      width: 150,
      render: (_, record) => (
        <Text strong>{record.employee?.name || record.user?.name || 'N/A'}</Text>
      )
    },
    {
      title: 'Mã NV',
      key: 'employeeId',
      width: 100,
      render: (_, record) => (
        <Text>{record.employee?.employeeId || record.user?.employeeId || 'N/A'}</Text>
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
          return `${moment(record.startDate).format('DD/MM')} - ${moment(record.endDate).format('DD/MM/YYYY')}`;
        }
        return (
          <Space direction="vertical" size={0}>
            <Text>{moment(record.date).format('DD/MM/YYYY')}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.shiftName && `${record.shiftName}: `}{record.startTime} - {record.endTime}
            </Text>
          </Space>
        );
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
      width: 180
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: getStatusTag
    },
    {
      title: 'Ngày duyệt',
      key: 'reviewedAt',
      width: 140,
      render: (_, record) => record.reviewedAt
        ? moment(record.reviewedAt).format('DD/MM/YYYY HH:mm')
        : '-'
    },
    {
      title: 'Ghi chú',
      key: 'comment',
      width: 150,
      ellipsis: true,
      render: (_, record) => record.reviewComment || record.comment || '-'
    }
  ];

  const tabItems = [];

  // Chỉ thêm tab "Đơn chờ duyệt" cho nhân viên, không cho admin
  if (userRole !== 'manager') {
    tabItems.push({
      key: 'my-requests',
      label: (
        <span>
          <FileTextOutlined /> Đơn chờ duyệt {myPendingCount > 0 && <Tag color="orange">{myPendingCount}</Tag>}
        </span>
      ),
      children: (
        <div style={{ height: 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 8 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalVisible(true)}
              style={{ borderRadius: 6 }}
            >
              Gửi yêu cầu
            </Button>
          </div>

          <div style={{ flex: 1, overflow: 'auto' }}>
            {myPendingRequests.length > 0 ? (
              <Table
                columns={myRequestColumns}
                dataSource={myPendingRequests}
                rowKey="_id"
                loading={loading}
                pagination={{ pageSize: 10, size: 'small' }}
                size="small"
                bordered
                rowClassName={(_, index) => index % 2 === 0 ? 'table-row-light' : 'table-row-dark'}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 8,
                  overflow: 'hidden'
                }}
                components={{
                  header: {
                    cell: (props) => (
                      <th {...props} style={{
                        ...props.style,
                        backgroundColor: '#f0f2f5',
                        fontWeight: 600,
                        borderBottom: '2px solid #d9d9d9'
                      }} />
                    )
                  }
                }}
              />
            ) : (
              <Empty description="Không có đơn chờ duyệt" />
            )}
          </div>
        </div>
      )
    });
  }

  // Tab "Lịch sử đơn" cho tất cả
  tabItems.push({
    key: 'my-history',
    label: (
      <span>
        📋 Lịch sử đơn {myHistoryRequests.length > 0 && (
          <Space size={4}>
            {approvedCount > 0 && <Tag color="green" style={{ marginLeft: 4 }}>{approvedCount} ✓</Tag>}
            {rejectedCount > 0 && <Tag color="red">{rejectedCount} ✗</Tag>}
          </Space>
        )}
      </span>
    ),
    children: (
      <div style={{ height: 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: 8 }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalVisible(true)}
            style={{ borderRadius: 6 }}
          >
            Gửi yêu cầu
          </Button>
        </div>
        {/* Filter Section */}
        <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Select
            value={filterType}
            onChange={setFilterType}
            style={{ width: 120 }}
          >
            <Option value="month">Theo tháng</Option>
            <Option value="date">Theo ngày</Option>
          </Select>
          {filterType === 'month' ? (
            <DatePicker
              picker="month"
              value={filterDate}
              onChange={setFilterDate}
              placeholder="Chọn tháng"
              format="MM/YYYY"
              allowClear
              style={{ width: 150 }}
            />
          ) : (
            <DatePicker
              value={filterDate}
              onChange={setFilterDate}
              placeholder="Chọn ngày"
              format="DD/MM/YYYY"
              allowClear
              style={{ width: 150 }}
            />
          )}
          {filterDate && (
            <Button
              size="small"
              onClick={() => setFilterDate(null)}
              style={{ marginLeft: 8 }}
            >
              Xóa lọc
            </Button>
          )}
        </div>

        {/* Summary */}
        <Row gutter={8} style={{ marginBottom: 8 }}>
          <Col span={8}>
            <Card size="small" style={{ borderRadius: 8 }}>
              <Statistic
                title="Tổng đơn đã xử lý"
                value={myHistoryRequests.length}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={{ borderRadius: 8 }}>
              <Statistic
                title="Đã duyệt"
                value={approvedCount}
                valueStyle={{ color: '#22c55e' }}
                prefix="✓"
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={{ borderRadius: 8 }}>
              <Statistic
                title="Từ chối"
                value={rejectedCount}
                valueStyle={{ color: '#ef4444' }}
                prefix="✗"
              />
            </Card>
          </Col>
        </Row>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {myHistoryRequests.length > 0 ? (
            <Table
              columns={historyColumns}
              dataSource={myHistoryRequests}
              rowKey="_id"
              loading={loading}
              pagination={{ pageSize: 10, size: 'small' }}
              size="small"
              bordered
              rowClassName={(_, index) => index % 2 === 0 ? 'table-row-light' : 'table-row-dark'}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 8,
                overflow: 'hidden'
              }}
              components={{
                header: {
                  cell: (props) => (
                    <th {...props} style={{
                      ...props.style,
                      backgroundColor: '#f0f2f5',
                      fontWeight: 600,
                      borderBottom: '2px solid #d9d9d9'
                    }} />
                  )
                }
              }}
            />
          ) : (
            <Empty description="Chưa có lịch sử đơn" />
          )}
        </div>
      </div>
    )
  });

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
          <Row gutter={8} style={{ marginBottom: 8 }}>
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
                bordered
                rowClassName={(_, index) => index % 2 === 0 ? 'table-row-light' : 'table-row-dark'}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 8,
                  overflow: 'hidden'
                }}
                components={{
                  header: {
                    cell: (props) => (
                      <th {...props} style={{
                        ...props.style,
                        backgroundColor: '#f0f2f5',
                        fontWeight: 600,
                        borderBottom: '2px solid #d9d9d9'
                      }} />
                    )
                  }
                }}
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
          setOtPreview(null);
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
                  onChange={(date) => fetchOTPreview(date)}
                />
              </Form.Item>

              {/* Cho nhân viên tự chọn giờ OT */}
              <Form.Item
                name="startTime"
                label="Giờ bắt đầu OT"
                rules={[{ required: true, message: 'Chọn giờ bắt đầu' }]}
              >
                <Select placeholder="Chọn giờ bắt đầu">
                  <Option value="17:30">17:30</Option>
                  <Option value="18:00">18:00</Option>
                  <Option value="18:30">18:30</Option>
                  <Option value="19:00">19:00</Option>
                  <Option value="19:30">19:30</Option>
                  <Option value="20:00">20:00</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="endTime"
                label="Giờ kết thúc OT"
                rules={[{ required: true, message: 'Chọn giờ kết thúc' }]}
              >
                <Select placeholder="Chọn giờ kết thúc">
                  <Option value="19:00">19:00</Option>
                  <Option value="19:30">19:30</Option>
                  <Option value="20:00">20:00</Option>
                  <Option value="20:30">20:30</Option>
                  <Option value="21:00">21:00</Option>
                  <Option value="21:30">21:30</Option>
                  <Option value="22:00">22:00</Option>
                  <Option value="22:30">22:30</Option>
                  <Option value="23:00">23:00</Option>
                  <Option value="23:30">23:30</Option>
                </Select>
              </Form.Item>

              {/* Gợi ý từ ca làm việc (nếu có) */}
              {previewLoading && (
                <div style={{ textAlign: 'center', padding: '12px' }}>
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 20 }} spin />} />
                  <Text type="secondary" style={{ marginLeft: 8 }}>Đang tải thông tin ca...</Text>
                </div>
              )}

              {otPreview && !previewLoading && (
                <Alert
                  type="info"
                  showIcon
                  icon={<ClockCircleOutlined />}
                  style={{ marginBottom: 8 }}
                  message={
                    <Space direction="vertical" size={0}>
                      <Text type="secondary">
                        Gợi ý: Ca <Tag color="blue">{otPreview.shiftName}</Tag>
                        kết thúc lúc {otPreview.shiftEndTime || '17:30'}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        OT nên bắt đầu sau giờ tan ca
                      </Text>
                    </Space>
                  }
                />
              )}
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

