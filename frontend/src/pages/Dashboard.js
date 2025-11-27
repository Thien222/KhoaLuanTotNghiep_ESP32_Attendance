import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Space,
  Spin,
  Alert,
  List,
  Progress,
  Tag,
  Avatar,
  Empty,
  Divider,
  Badge
} from 'antd';
import {
  UserOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  CalendarOutlined,
  MedicineBoxOutlined,
  HomeOutlined,
  HeartOutlined,
  FileTextOutlined,
  TeamOutlined,
  RiseOutlined,
  FallOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  PieChartOutlined
} from '@ant-design/icons';
import {
  PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar
} from 'recharts';
import axios from 'axios';
import moment from 'moment';
import { getAPIUrl } from '../utils/configManager';

const { Title, Text } = Typography;

// Color Palette
const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#2f54eb'];

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setUserRole(parsed.role);
      } catch (e) {
        console.error('Error parsing user data', e);
      }
    }
    fetchDashboardStats();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchDashboardStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Chưa đăng nhập');
        setLoading(false);
        return;
      }
      
      const response = await axios.get(`${API_URL}/dashboard/stats`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setStats(response.data.data);
        setError(null);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setError(error.response?.data?.message || 'Không thể tải dữ liệu dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#f0f2f5' 
      }}>
        <Spin size="large" tip="Đang tải dữ liệu..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert message="Lỗi" description={error} type="error" showIcon />
      </div>
    );
  }

  // Prepare Data for Charts
  const deptData = stats?.departmentStats?.map((d, index) => ({
    name: d._id || 'Khác',
    value: d.count,
    color: COLORS[index % COLORS.length]
  })) || [];

  const trendData = stats?.attendanceTrend?.map(d => ({
    name: moment(d._id).format('DD/MM'),
    fullDate: d._id,
    present: d.present,
    late: d.late
  })) || [];

  const onTimeData = [
    { name: 'Đúng giờ', value: stats?.todayAttendance?.details?.ontime || 0, color: '#52c41a' },
    { name: 'Đi muộn', value: stats?.todayAttendance?.details?.late || 0, color: '#f5222d' },
  ].filter(d => d.value > 0);

  const isManager = userRole === 'manager';

  const cardStyle = {
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    border: 'none',
    height: '100%'
  };

  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Dashboard Tổng Quan</Title>
        <Text type="secondary">
          Cập nhật lần cuối: {moment().format('HH:mm DD/MM/YYYY')}
        </Text>
      </div>
      
      {/* Key Metrics Row */}
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle} bodyStyle={{ padding: '20px 24px' }}>
            <Statistic
              title={<Text type="secondary"><TeamOutlined /> Tổng Nhân Viên</Text>}
              value={stats?.totalEmployees || 0}
              valueStyle={{ color: '#1890ff', fontWeight: 'bold', fontSize: 32 }}
            />
            {stats?.turnoverRate !== undefined && (
              <div style={{ marginTop: 8 }}>
                <Tag color={parseFloat(stats.turnoverRate) > 5 ? 'error' : 'success'}>
                  Biến động: {stats.turnoverRate}%
                </Tag>
              </div>
            )}
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle} bodyStyle={{ padding: '20px 24px' }}>
            <Statistic
              title={<Text type="secondary"><ClockCircleOutlined /> Chấm Công Hôm Nay</Text>}
              value={stats?.todayAttendance?.count || 0}
              suffix={<span style={{ fontSize: 14, color: '#999' }}>/ {stats?.totalEmployees}</span>}
              valueStyle={{ color: '#52c41a', fontWeight: 'bold', fontSize: 32 }}
            />
            <div style={{ marginTop: 8 }}>
              <Progress 
                percent={stats?.todayAttendance?.percentage || 0} 
                strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
                showInfo={false}
                size="small"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Tỷ lệ: {stats?.todayAttendance?.percentage}%</Text>
              </div>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle} bodyStyle={{ padding: '20px 24px' }}>
            <Statistic
              title={<Text type="secondary"><DollarOutlined /> Tổng Lương (Tạm tính)</Text>}
              value={stats?.totalSalary || 0}
              valueStyle={{ color: '#722ed1', fontWeight: 'bold', fontSize: 24 }}
              formatter={(value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)}
            />
             <div style={{ marginTop: 8 }}>
               <Text type="secondary" style={{ fontSize: 12 }}>Tháng {moment().format('MM/YYYY')}</Text>
             </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle} bodyStyle={{ padding: '20px 24px' }}>
            <Statistic
              title={<Text type="secondary"><FileTextOutlined /> Yêu Cầu Nghỉ Phép</Text>}
              value={stats?.pendingLeaveRequests || 0}
              valueStyle={{ color: '#faad14', fontWeight: 'bold', fontSize: 32 }}
            />
            <div style={{ marginTop: 8 }}>
              <Tag color={stats?.pendingLeaveRequests > 0 ? 'warning' : 'default'}>
                {stats?.pendingLeaveRequests > 0 ? 'Cần duyệt ngay' : 'Không có yêu cầu'}
              </Tag>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Charts Row (Manager Only) */}
      {isManager && (
        <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
          {/* Attendance Trend */}
          <Col xs={24} lg={16}>
            <Card title="Xu hướng chấm công (7 ngày qua)" style={cardStyle}>
              {trendData.length > 0 ? (
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1890ff" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#1890ff" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="present" 
                        name="Đi làm"
                        stroke="#1890ff" 
                        fillOpacity={1} 
                        fill="url(#colorPresent)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="late" 
                        name="Đi muộn"
                        stroke="#ff4d4f" 
                        fill="none" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <Empty description="Chưa có dữ liệu xu hướng" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </Col>

          {/* Department Distribution & On-Time */}
          <Col xs={24} lg={8}>
            <Space direction="vertical" size={24} style={{ width: '100%' }}>
              <Card title="Nhân sự theo phòng ban" style={cardStyle}>
                {deptData.length > 0 ? (
                  <div style={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={deptData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {deptData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend layout="vertical" verticalAlign="middle" align="right" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <Empty description="Chưa có dữ liệu phòng ban" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Card>

              <Card title="Tỷ lệ đúng giờ hôm nay" style={cardStyle}>
                {onTimeData.length > 0 ? (
                  <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={onTimeData}
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                          dataKey="value"
                          label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                        >
                          {onTimeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                   <div style={{ textAlign: 'center', padding: 20 }}>
                     <Text type="secondary">Chưa có dữ liệu chấm công hôm nay</Text>
                   </div>
                )}
              </Card>
            </Space>
          </Col>
        </Row>
      )}

      {/* Activity & Personal Stats */}
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={isManager ? 24 : 12}>
          <Card title="Hoạt động gần đây" style={cardStyle}>
            <List
              itemLayout="horizontal"
              dataSource={stats?.recentActivities || []}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />}
                    title={<Text strong>{item.employee?.name || 'Nhân viên'}</Text>}
                    description={
                      <Space>
                        <Tag color={item.checkIn?.time ? 'blue' : 'default'}>
                          {item.checkIn?.time ? 'Check-in' : 'Check-out'}
                        </Tag>
                        <Text type="secondary">
                          {moment(item.updatedAt).format('HH:mm:ss DD/MM/YYYY')}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: 'Không có hoạt động nào gần đây' }}
            />
          </Card>
        </Col>

        {!isManager && stats?.leaveStats && (
          <Col xs={24} lg={12}>
             <Card title="Thông tin nghỉ phép của bạn" style={cardStyle}>
               <Row gutter={[16, 16]}>
                 <Col span={12}>
                   <Statistic 
                     title="Phép năm còn lại"
                     value={stats.leaveStats.annual.remaining}
                     suffix={`/ ${stats.leaveStats.annual.total}`}
                     valueStyle={{ color: '#1890ff' }}
                   />
                   <Progress percent={stats.leaveStats.annual.percentage} size="small" showInfo={false} />
                 </Col>
                 <Col span={12}>
                   <Statistic 
                     title="Nghỉ ốm (giờ)"
                     value={stats.leaveStats.sick.remainingHours}
                     suffix={`/ ${stats.leaveStats.sick.totalHours}`}
                     valueStyle={{ color: '#ff4d4f' }}
                   />
                   <Progress percent={stats.leaveStats.sick.percentage} status="exception" size="small" showInfo={false} />
                 </Col>
               </Row>
             </Card>
          </Col>
        )}
      </Row>
    </div>
  );
};

export default Dashboard;