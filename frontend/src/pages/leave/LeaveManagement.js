<<<<<<< HEAD
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
  Badge,
  Row,
  Col,
  Statistic,
  Alert,
  Tooltip,
  Calendar,
  Divider
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined,
  CalendarOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { getAPIUrl } from '../../utils/configManager';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Option } = Select;

const LeaveManagement = () => {
  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [holidayModalVisible, setHolidayModalVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [editingLeave, setEditingLeave] = useState(null);
  const [reviewingLeave, setReviewingLeave] = useState(null);
  const [reviewStatus, setReviewStatus] = useState(null); // 'approved' or 'rejected'
  const [form] = Form.useForm();
  const [reviewForm] = Form.useForm();
  const [userRole, setUserRole] = useState(null);
  const [lastFetchedLeaves, setLastFetchedLeaves] = useState([]);

  useEffect(() => {
    // Get user role from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUserRole(user.role);
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    
    fetchLeaves();
    fetchHolidays();
    // Only fetch leave balance for employees
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user.role === 'employee') {
          fetchLeaveBalance();
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, []);

  // Check for status changes and show notifications
  useEffect(() => {
    if (userRole === 'employee' && leaves.length > 0 && lastFetchedLeaves.length > 0) {
      leaves.forEach(leave => {
        const lastLeave = lastFetchedLeaves.find(l => l._id === leave._id);
        if (lastLeave && lastLeave.status !== leave.status) {
          // Status changed - show notification
          if (leave.status === 'approved') {
            message.success({
              content: `Đơn nghỉ phép của bạn đã được duyệt! Từ ${moment(leave.startDate).format('DD/MM/YYYY')} đến ${moment(leave.endDate).format('DD/MM/YYYY')}`,
              duration: 5,
            });
          } else if (leave.status === 'rejected') {
            message.error({
              content: `Đơn nghỉ phép của bạn đã bị từ chối. Lý do: ${leave.reviewComment || 'Không có lý do'}`,
              duration: 5,
            });
          }
        }
      });
    }
    setLastFetchedLeaves(leaves);
  }, [leaves, userRole]);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      if (!token) {
        message.error('Chưa đăng nhập');
        return;
      }
      
      const response = await axios.get(`${API_URL}/leave`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        const newLeaves = response.data.data || [];
        setLeaves(newLeaves);
        
        // For employees, check if there are newly reviewed leaves
        if (userRole === 'employee' && newLeaves.length > 0) {
          newLeaves.forEach(leave => {
            // Check if this leave was just reviewed (has reviewedAt and status is approved/rejected)
            if (leave.reviewedAt && (leave.status === 'approved' || leave.status === 'rejected')) {
              // Check if this is a new review (reviewedAt is recent, within last 5 minutes)
              const reviewedTime = moment(leave.reviewedAt);
              const now = moment();
              if (now.diff(reviewedTime, 'minutes') < 5) {
                // This is a newly reviewed leave - show notification
                if (leave.status === 'approved') {
                  message.success({
                    content: (
                      <div>
                        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                          ✅ Đơn nghỉ phép đã được duyệt!
                        </div>
                        <div>Thời gian: {moment(leave.startDate).format('DD/MM/YYYY')} - {moment(leave.endDate).format('DD/MM/YYYY')}</div>
                        {leave.reviewComment && <div>Ghi chú: {leave.reviewComment}</div>}
                      </div>
                    ),
                    duration: 8,
                  });
                } else if (leave.status === 'rejected') {
                  message.error({
                    content: (
                      <div>
                        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                          ❌ Đơn nghỉ phép đã bị từ chối
                        </div>
                        <div>Lý do: {leave.reviewComment || 'Không có lý do'}</div>
                      </div>
                    ),
                    duration: 8,
                  });
                }
              }
            }
          });
        }
      }
    } catch (error) {
      console.error('Error fetching leaves:', error);
      message.error(error.response?.data?.message || 'Lỗi khi tải danh sách nghỉ phép');
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchHolidays = async () => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_URL}/holidays`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setHolidays(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching holidays:', error);
    }
  };

  const fetchLeaveBalance = async () => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      if (!userData) return;
      
      const user = JSON.parse(userData);
      
      // Get employee ID from user object
      const employeeId = user.employee?._id || user.employeeId || user._id;
      
      if (!employeeId) {
        console.warn('No employee ID found in user data');
        return;
      }
      
      const response = await axios.get(`${API_URL}/employees/${employeeId}/leave-balance`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setLeaveBalance(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching leave balance:', error);
    }
  };

  const handleAdd = () => {
    if (leaveBalance && leaveBalance.remainingDays <= 0) {
      message.error('Bạn đã hết ngày nghỉ phép!');
      return;
    }
    setEditingLeave(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (leave) => {
    setEditingLeave(leave);
    form.setFieldsValue({
      ...leave,
      dateRange: [moment(leave.startDate), moment(leave.endDate)],
      type: leave.type
    });
    setModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      const { dateRange, ...otherValues } = values;
      const data = {
        leaveType: otherValues.type || 'annual',
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        reason: otherValues.reason
      };

      if (editingLeave) {
        const response = await axios.put(
          `${API_URL}/leave/${editingLeave._id}`,
          data,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        
        if (response.data.success) {
          message.success('Cập nhật yêu cầu nghỉ phép thành công');
          fetchLeaves();
          fetchLeaveBalance();
        }
      } else {
        const response = await axios.post(
          `${API_URL}/leave`,
          data,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        
        if (response.data.success) {
          message.success('Gửi yêu cầu nghỉ phép thành công');
          fetchLeaves();
          fetchLeaveBalance();
        }
      }
      setModalVisible(false);
    } catch (error) {
      console.error('Error submitting leave:', error);
      message.error(error.response?.data?.message || 'Lỗi khi lưu yêu cầu nghỉ phép');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'approved': return 'green';
      case 'rejected': return 'red';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Chờ duyệt';
      case 'approved': return 'Đã duyệt';
      case 'rejected': return 'Từ chối';
      default: return status;
    }
  };

  const getLeaveTypeText = (type) => {
    const types = {
      annual: 'Nghỉ phép năm',
      sick: 'Nghỉ ốm',
      personal: 'Nghỉ cá nhân',
      other: 'Khác'
    };
    return types[type] || type;
  };

  const getLeaveTypeColor = (type) => {
    const colors = {
      annual: 'blue',
      sick: 'red',
      personal: 'orange',
      other: 'default'
    };
    return colors[type] || 'default';
  };

  const handleReviewClick = (leave, status) => {
    setReviewingLeave(leave);
    setReviewStatus(status);
    reviewForm.resetFields();
    setReviewModalVisible(true);
  };

  const handleReviewSubmit = async (values) => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      const reviewComment = values.comment || '';
      
      // If rejecting, comment is required
      if (reviewStatus === 'rejected' && !reviewComment.trim()) {
        message.error('Vui lòng nhập lý do từ chối');
        return;
      }
      
      const response = await axios.put(
        `${API_URL}/leave/${reviewingLeave._id}/review`,
        { 
          status: reviewStatus, 
          reviewComment: reviewComment.trim() 
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        message.success(reviewStatus === 'approved' ? 'Đã duyệt đơn nghỉ phép' : 'Đã từ chối đơn nghỉ phép');
        setReviewModalVisible(false);
        setReviewingLeave(null);
        setReviewStatus(null);
        reviewForm.resetFields();
        fetchLeaves();
        // Refresh leave balance for employees (in case they're viewing the page)
        if (userRole === 'employee') {
          fetchLeaveBalance();
        }
      } else {
        message.error(response.data.message || 'Lỗi khi duyệt đơn nghỉ phép');
      }
    } catch (error) {
      console.error('Error reviewing leave:', error);
      message.error(error.response?.data?.message || 'Lỗi khi duyệt đơn nghỉ phép');
    }
  };

  const columns = [
    // Show employee name column for admin
    ...(userRole === 'manager' || userRole === 'admin' ? [{
      title: 'Nhân viên',
      dataIndex: ['employee', 'name'],
      key: 'employeeName',
      width: 200,
      render: (name, record) => {
        const employee = record.employee;
        if (!employee) return 'Không xác định';
        return (
          <div>
            <div>{employee.name || 'Không xác định'}</div>
            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>Mã: {employee.employeeId || '-'}</div>
          </div>
        );
      },
    }] : []),
    {
      title: 'Loại nghỉ',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={getLeaveTypeColor(type)}>
          {getLeaveTypeText(type)}
        </Tag>
      ),
      width: 120,
    },
    {
      title: 'Từ ngày',
      dataIndex: 'startDate',
      key: 'startDate',
      render: (date) => moment(date).format('DD/MM/YYYY'),
      width: 110,
    },
    {
      title: 'Đến ngày',
      dataIndex: 'endDate',
      key: 'endDate',
      render: (date) => moment(date).format('DD/MM/YYYY'),
      width: 110,
    },
    {
      title: 'Số ngày',
      key: 'days',
      render: (_, record) => {
        const days = moment(record.endDate).diff(moment(record.startDate), 'days') + 1;
        return `${days} ngày`;
      },
      width: 80,
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
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
      width: 110,
    },
    {
      title: 'Phản hồi',
      dataIndex: 'reviewComment',
      key: 'reviewComment',
      render: (comment, record) => {
        // Support both reviewComment and reviewNote (backward compatibility)
        const response = comment || record.reviewNote || record.responseNote || '-';
        return response !== '-' ? (
          <Tooltip title={response}>
            <Text ellipsis style={{ maxWidth: 150 }}>{response}</Text>
          </Tooltip>
        ) : '-';
      },
      ellipsis: true,
      width: 200,
    },
    // Show reviewed by and reviewed at for admin
    ...(userRole === 'manager' || userRole === 'admin' ? [
      {
        title: 'Người duyệt',
        dataIndex: ['reviewedBy', 'username'],
        key: 'reviewedBy',
        render: (username) => username || '-',
        width: 120,
      },
      {
        title: 'Ngày duyệt',
        dataIndex: 'reviewedAt',
        key: 'reviewedAt',
        render: (date) => date ? moment(date).format('DD/MM/YYYY HH:mm') : '-',
        width: 150,
      },
    ] : []),
    {
      title: 'Hành động',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          {/* Admin/Manager: Review buttons */}
          {(userRole === 'manager' || userRole === 'admin') && record.status === 'pending' && (
            <>
              <Button 
                type="primary" 
                size="small" 
                icon={<CheckCircleOutlined />}
                onClick={() => handleReviewClick(record, 'approved')}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                Duyệt
              </Button>
              <Button 
                danger
                size="small" 
                icon={<CloseCircleOutlined />}
                onClick={() => handleReviewClick(record, 'rejected')}
              >
                Từ chối
              </Button>
            </>
          )}
          {/* Employee: Edit button (only for pending leaves) */}
          {userRole === 'employee' && record.status === 'pending' && (
            <Button 
              type="link" 
              size="small" 
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              Sửa
            </Button>
          )}
        </Space>
      ),
      width: userRole === 'manager' || userRole === 'admin' ? 150 : 80,
    },
  ];

  // Calendar cell render for holidays
  const dateCellRender = (value) => {
    const dateStr = value.format('YYYY-MM-DD');
    const holiday = holidays.find(h => moment(h.date).format('YYYY-MM-DD') === dateStr);
    
    if (holiday) {
      return (
        <Tooltip title={`${holiday.name} (x${holiday.workRate})`}>
          <Badge status="error" text={holiday.name} style={{ fontSize: 11 }} />
        </Tooltip>
      );
    }
    return null;
  };

  const remainingDays = leaveBalance?.remainingDays || 0;
  const usedDays = leaveBalance?.usedLeaveDays || 0;
  const totalDays = leaveBalance?.annualLeaveDays || 12;
  const isQuotaExhausted = remainingDays <= 0;

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>
            {userRole === 'manager' || userRole === 'admin' ? 'Duyệt đơn nghỉ phép' : 'Quản lý nghỉ phép'}
          </Title>
        </div>

        {/* Leave Balance Statistics - Only for employees */}
        {(userRole === 'employee') && (
          <>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={8}>
                <Card size="small">
                  <Statistic
                    title="Tổng ngày phép/năm"
                    value={totalDays}
                    suffix="ngày"
                    prefix={<CalendarOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card size="small">
                  <Statistic
                    title="Đã sử dụng"
                    value={usedDays}
                    suffix="ngày"
                    prefix={<CheckCircleOutlined />}
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card size="small">
                  <Statistic
                    title={
                      <Space>
                        <span>Còn lại</span>
                        {remainingDays <= 3 && remainingDays > 0 && (
                          <Tag color="warning">Sắp hết</Tag>
                        )}
                        {isQuotaExhausted && (
                          <Tag color="error">Hết quota</Tag>
                        )}
                      </Space>
                    }
                    value={remainingDays}
                    suffix="ngày"
                    prefix={<CalendarOutlined />}
                    valueStyle={{ 
                      color: isQuotaExhausted ? '#ff4d4f' : remainingDays <= 3 ? '#faad14' : '#52c41a',
                      fontWeight: 'bold'
                    }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Warning if quota exhausted */}
            {isQuotaExhausted && (
              <Alert
                message="Hết ngày nghỉ phép"
                description="Bạn đã sử dụng hết số ngày nghỉ phép năm. Vui lòng liên hệ quản lý nếu cần nghỉ thêm."
                type="warning"
                showIcon
                icon={<InfoCircleOutlined />}
                style={{ marginBottom: 16 }}
                closable
              />
            )}
          </>
        )}

        <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Only show "Xin nghỉ phép" button for employees */}
          {(userRole === 'employee') && (
            <Tooltip title={isQuotaExhausted ? 'Bạn đã hết ngày nghỉ phép' : 'Gửi yêu cầu nghỉ phép'}>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleAdd}
                disabled={isQuotaExhausted}
              >
                Xin nghỉ phép
              </Button>
            </Tooltip>
          )}
          <Button 
            icon={<CalendarOutlined />}
            onClick={() => setHolidayModalVisible(true)}
          >
            Xem lịch nghỉ lễ ({holidays.length})
          </Button>
          <Button onClick={fetchLeaves}>
            Tải lại
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={leaves}
          loading={loading}
          rowKey="_id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Tổng ${total} yêu cầu`
          }}
        />
      </Card>

      {/* Leave Request Modal */}
      <Modal
        title={editingLeave ? 'Sửa yêu cầu nghỉ phép' : 'Xin nghỉ phép'}
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
            name="type"
            label="Loại nghỉ"
            rules={[{ required: true, message: 'Vui lòng chọn loại nghỉ' }]}
            initialValue="annual"
          >
            <Select>
              <Option value="annual">Nghỉ phép năm</Option>
              <Option value="sick">Nghỉ ốm</Option>
              <Option value="personal">Nghỉ cá nhân</Option>
              <Option value="other">Khác</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="dateRange"
            label="Thời gian nghỉ"
            rules={[{ required: true, message: 'Vui lòng chọn thời gian nghỉ' }]}
          >
            <RangePicker 
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
            />
          </Form.Item>

          <Form.Item
            name="reason"
            label="Lý do"
            rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}
          >
            <TextArea 
              rows={4} 
              placeholder="Nhập lý do xin nghỉ phép..."
            />
          </Form.Item>

          <Alert
            message={`Bạn còn ${remainingDays}/${totalDays} ngày phép`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit">
                {editingLeave ? 'Cập nhật' : 'Gửi yêu cầu'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Holiday Calendar Modal */}
      <Modal
        title="Lịch nghỉ lễ"
        open={holidayModalVisible}
        onCancel={() => setHolidayModalVisible(false)}
        footer={null}
        width={800}
      >
        <Alert
          message="Lưu ý"
          description="Ngày lễ quốc gia không tính vào quota nghỉ phép năm. Nếu làm việc vào ngày lễ, lương sẽ được tính x2 hoặc x3."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Calendar 
          fullscreen={false}
          dateCellRender={dateCellRender}
        />

        <Divider>Danh sách ngày lễ</Divider>
        
        <Table
          size="small"
          dataSource={holidays}
          rowKey="_id"
          pagination={false}
          columns={[
            {
              title: 'Ngày',
              dataIndex: 'date',
              key: 'date',
              render: (date) => moment(date).format('DD/MM/YYYY'),
              width: 120,
            },
            {
              title: 'Tên ngày lễ',
              dataIndex: 'name',
              key: 'name',
            },
            {
              title: 'Loại',
              dataIndex: 'type',
              key: 'type',
              render: (type) => {
                const colors = { national: 'blue', tet: 'red', custom: 'green' };
                const labels = { national: 'Quốc gia', tet: 'Tết', custom: 'Tùy chỉnh' };
                return <Tag color={colors[type]}>{labels[type] || type}</Tag>;
              },
              width: 100,
            },
            {
              title: 'Hệ số lương',
              dataIndex: 'workRate',
              key: 'workRate',
              render: (rate) => <Tag color="purple">x{rate}</Tag>,
              width: 110,
            },
          ]}
        />
      </Modal>

      {/* Review Leave Modal */}
      <Modal
        title={
          reviewStatus === 'approved' 
            ? 'Duyệt đơn nghỉ phép' 
            : 'Từ chối đơn nghỉ phép'
        }
        open={reviewModalVisible}
        onCancel={() => {
          setReviewModalVisible(false);
          setReviewingLeave(null);
          setReviewStatus(null);
          reviewForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        {reviewingLeave && (
          <>
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
              <Text strong>Thông tin đơn nghỉ phép:</Text>
              <div style={{ marginTop: 8 }}>
                <Text>Nhân viên: {reviewingLeave.employee?.name || 'Không xác định'}</Text>
                <br />
                <Text>Loại nghỉ: {getLeaveTypeText(reviewingLeave.type || reviewingLeave.leaveType)}</Text>
                <br />
                <Text>
                  Thời gian: {moment(reviewingLeave.startDate).format('DD/MM/YYYY')} - {moment(reviewingLeave.endDate).format('DD/MM/YYYY')}
                </Text>
                <br />
                <Text>Lý do: {reviewingLeave.reason}</Text>
              </div>
            </div>

            <Form
              form={reviewForm}
              layout="vertical"
              onFinish={handleReviewSubmit}
            >
              <Form.Item
                name="comment"
                label={reviewStatus === 'approved' ? 'Ghi chú (tùy chọn)' : 'Lý do từ chối'}
                rules={
                  reviewStatus === 'rejected' 
                    ? [{ required: true, message: 'Vui lòng nhập lý do từ chối' }]
                    : []
                }
              >
                <TextArea 
                  rows={4} 
                  placeholder={
                    reviewStatus === 'approved' 
                      ? 'Nhập ghi chú (nếu có)...' 
                      : 'Nhập lý do từ chối đơn nghỉ phép...'
                  }
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => {
                    setReviewModalVisible(false);
                    setReviewingLeave(null);
                    setReviewStatus(null);
                    reviewForm.resetFields();
                  }}>
                    Hủy
                  </Button>
                  <Button 
                    type="primary" 
                    htmlType="submit"
                    style={
                      reviewStatus === 'approved' 
                        ? { backgroundColor: '#52c41a', borderColor: '#52c41a' }
                        : {}
                    }
                    danger={reviewStatus === 'rejected'}
                  >
                    {reviewStatus === 'approved' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
};

export default LeaveManagement;
=======
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
  Tag
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Option } = Select;

const LeaveManagement = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLeave, setEditingLeave] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      // Mock data for demo
      const mockLeaves = [
        {
          _id: '1',
          employee: { name: 'Nguyễn Văn A' },
          startDate: '2024-01-20',
          endDate: '2024-01-22',
          reason: 'Nghỉ phép cá nhân',
          status: 'pending'
        },
        {
          _id: '2',
          employee: { name: 'Trần Thị B' },
          startDate: '2024-01-25',
          endDate: '2024-01-25',
          reason: 'Khám bệnh',
          status: 'approved'
        },
        {
          _id: '3',
          employee: { name: 'Lê Văn C' },
          startDate: '2024-01-30',
          endDate: '2024-02-02',
          reason: 'Nghỉ lễ Tết',
          status: 'rejected'
        }
      ];
      setLeaves(mockLeaves);
    } catch (error) {
      message.error('Lỗi khi tải danh sách nghỉ phép');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingLeave(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (leave) => {
    setEditingLeave(leave);
    form.setFieldsValue({
      ...leave,
      dateRange: [moment(leave.startDate), moment(leave.endDate)]
    });
    setModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      const { dateRange, ...otherValues } = values;
      const data = {
        ...otherValues,
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD')
      };

      if (editingLeave) {
        // Mock update
        message.success('Cập nhật yêu cầu nghỉ phép thành công');
      } else {
        // Mock add
        const newLeave = {
          _id: Date.now().toString(),
          ...data,
          employee: { name: 'Nguyễn Văn Demo' },
          status: 'pending'
        };
        setLeaves(prev => [...prev, newLeave]);
        message.success('Gửi yêu cầu nghỉ phép thành công');
      }
      setModalVisible(false);
    } catch (error) {
      message.error('Lỗi khi lưu yêu cầu nghỉ phép');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'approved': return 'green';
      case 'rejected': return 'red';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Chờ duyệt';
      case 'approved': return 'Đã duyệt';
      case 'rejected': return 'Từ chối';
      default: return status;
    }
  };

  const columns = [
    {
      title: 'Nhân viên',
      dataIndex: ['employee', 'name'],
      key: 'employeeName',
    },
    {
      title: 'Từ ngày',
      dataIndex: 'startDate',
      key: 'startDate',
      render: (date) => moment(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Đến ngày',
      dataIndex: 'endDate',
      key: 'endDate',
      render: (date) => moment(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Số ngày',
      key: 'days',
      render: (_, record) => {
        const start = moment(record.startDate);
        const end = moment(record.endDate);
        return end.diff(start, 'days') + 1;
      },
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
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
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>Quản lý nghỉ phép</Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            Gửi yêu cầu nghỉ phép
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={leaves}
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
        title={editingLeave ? 'Sửa yêu cầu nghỉ phép' : 'Gửi yêu cầu nghỉ phép'}
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
            name="dateRange"
            label="Thời gian nghỉ"
            rules={[{ required: true, message: 'Vui lòng chọn thời gian nghỉ' }]}
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="reason"
            label="Lý do nghỉ"
            rules={[{ required: true, message: 'Vui lòng nhập lý do nghỉ' }]}
          >
            <TextArea rows={4} placeholder="Nhập lý do nghỉ phép..." />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit">
                {editingLeave ? 'Cập nhật' : 'Gửi yêu cầu'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LeaveManagement;
>>>>>>> 03f3fc8ca695fadb2e80e46e5549b7e9db5477cf
