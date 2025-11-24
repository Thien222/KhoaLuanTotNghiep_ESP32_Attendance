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
  Tag
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
  FileTextOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { getAPIUrl } from '../utils/configManager';

const { Title, Text } = Typography;

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardStats();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardStats();
    }, 30000);
    
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
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin 
          size="large"
          indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
        />
        <div style={{ marginTop: 16 }}>Đang tải dữ liệu dashboard...</div>
      </div>
    );
  }

  if (error) {
    return <Alert message="Lỗi" description={error} type="error" showIcon />;
  }

  return (
    <div>
      <Title level={2}>
        Dashboard
        {loading && <Spin style={{ marginLeft: 16 }} />}
      </Title>
      
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng nhân viên"
              value={stats?.totalEmployees || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Đã chấm công hôm nay"
              value={stats?.todayAttendance?.count || 0}
              suffix={`/ ${stats?.totalEmployees || 0}`}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Tỷ lệ: {stats?.todayAttendance?.percentage || 0}%
            </Text>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng lương tháng này"
              value={stats?.totalSalary || 0}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#cf1322' }}
              formatter={(value) => new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
              }).format(value)}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Yêu cầu nghỉ phép"
              value={stats?.pendingLeaveRequests || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Detailed Leave Statistics - Only for employees */}
      {(() => {
        const userData = localStorage.getItem('user');
        const userRole = userData ? JSON.parse(userData).role : null;
        const isEmployee = userRole === 'employee';
        
        if (!isEmployee || !stats?.leaveStats) return null;
        
        return (
          <>
            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
              <Col span={24}>
                <Title level={4}>Thống kê nghỉ phép</Title>
              </Col>
            </Row>
            
            <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
              {/* Nghỉ phép năm */}
              <Col xs={24} sm={12} lg={6}>
                <Card size="small">
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong>
                        <CalendarOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                        Nghỉ phép năm
                      </Text>
                    </div>
                    <Statistic
                      value={stats.leaveStats.annual.used}
                      suffix={`/ ${stats.leaveStats.annual.total} ngày`}
                      valueStyle={{ fontSize: 20, fontWeight: 'bold', color: '#1890ff' }}
                    />
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Còn lại: <Text strong>{stats.leaveStats.annual.remaining} ngày</Text>
                      </Text>
                    </div>
                    <Progress 
                      percent={stats.leaveStats.annual.percentage} 
                      size="small"
                      strokeColor={{
                        '0%': '#108ee9',
                        '100%': '#87d068',
                      }}
                      showInfo={false}
                    />
                  </Space>
                </Card>
              </Col>

              {/* Nghỉ ốm */}
              <Col xs={24} sm={12} lg={6}>
                <Card size="small">
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong>
                        <MedicineBoxOutlined style={{ marginRight: 8, color: '#ff7875' }} />
                        Nghỉ ốm
                      </Text>
                    </div>
                    <Statistic
                      value={stats.leaveStats.sick.usedHours}
                      suffix={`/ ${stats.leaveStats.sick.totalHours} giờ`}
                      valueStyle={{ fontSize: 20, fontWeight: 'bold', color: '#ff7875' }}
                    />
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Đã dùng: <Text strong>{stats.leaveStats.sick.usedDays} ngày</Text>
                        {' '}({stats.leaveStats.sick.remainingHours} giờ còn lại)
                      </Text>
                    </div>
                    <Progress 
                      percent={stats.leaveStats.sick.percentage} 
                      size="small"
                      strokeColor="#ff7875"
                      showInfo={false}
                    />
                  </Space>
                </Card>
              </Col>

              {/* Làm việc tại nhà (WFH) */}
              <Col xs={24} sm={12} lg={6}>
                <Card size="small">
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong>
                        <HomeOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                        Làm việc tại nhà
                      </Text>
                    </div>
                    <Statistic
                      value={stats.leaveStats.wfh.usedDays}
                      suffix={stats.leaveStats.wfh.totalDays > 0 ? ` / ${stats.leaveStats.wfh.totalDays} ngày` : ' ngày'}
                      valueStyle={{ fontSize: 20, fontWeight: 'bold', color: '#52c41a' }}
                    />
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {stats.leaveStats.wfh.remainingDays === -1 ? (
                          <Text strong>Không giới hạn</Text>
                        ) : (
                          <>Còn lại: <Text strong>{stats.leaveStats.wfh.remainingDays} ngày</Text></>
                        )}
                      </Text>
                    </div>
                    {stats.leaveStats.wfh.totalDays > 0 && (
                      <Progress 
                        percent={stats.leaveStats.wfh.percentage} 
                        size="small"
                        strokeColor="#52c41a"
                        showInfo={false}
                      />
                    )}
                  </Space>
                </Card>
              </Col>

              {/* Nghỉ thai sản */}
              <Col xs={24} sm={12} lg={6}>
                <Card size="small">
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong>
                        <HeartOutlined style={{ marginRight: 8, color: '#ff85c0' }} />
                        Nghỉ thai sản
                      </Text>
                    </div>
                    <Statistic
                      value={stats.leaveStats.maternity.usedDays}
                      suffix={`/ ${stats.leaveStats.maternity.totalDays} ngày`}
                      valueStyle={{ fontSize: 20, fontWeight: 'bold', color: '#ff85c0' }}
                    />
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Còn lại: <Text strong>{stats.leaveStats.maternity.remainingDays} ngày</Text>
                      </Text>
                    </div>
                    <Progress 
                      percent={stats.leaveStats.maternity.percentage} 
                      size="small"
                      strokeColor="#ff85c0"
                      showInfo={false}
                    />
                  </Space>
                </Card>
              </Col>
            </Row>

            {/* Additional leave types row */}
            <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
              {/* Nghỉ không lương */}
              <Col xs={24} sm={12} lg={6}>
                <Card size="small">
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong>
                        <FileTextOutlined style={{ marginRight: 8, color: '#faad14' }} />
                        Nghỉ không lương
                      </Text>
                    </div>
                    <Statistic
                      value={stats.leaveStats.unpaid.usedDays}
                      suffix=" ngày"
                      valueStyle={{ fontSize: 20, fontWeight: 'bold', color: '#faad14' }}
                    />
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        <Text strong>Không giới hạn</Text>
                      </Text>
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>
          </>
        );
      })()}
      
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card 
            title="Hoạt động gần đây" 
            size="small"
            extra={<Text type="secondary">Cập nhật mỗi 30s</Text>}
          >
            {stats?.recentActivities && stats.recentActivities.length > 0 ? (
              <List
                size="small"
                dataSource={stats.recentActivities.slice(0, 10)}
                renderItem={(activity) => (
                  <List.Item>
                    <Text>• {activity.message}</Text>
                    <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                      {new Date(activity.timestamp).toLocaleTimeString('vi-VN')}
                    </Text>
                  </List.Item>
                )}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Text type="secondary">Chưa có hoạt động nào</Text>
              </div>
            )}
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card title="Thống kê tuần này" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text>• Số ngày làm việc: </Text>
                <Text strong>
                  {stats?.weekStats?.workingDays || 0}/{stats?.weekStats?.totalWorkingDays || 5}
                </Text>
              </div>
              <div>
                <Text>• Tỷ lệ chấm công đúng giờ: </Text>
                <Text strong>{stats?.weekStats?.onTimePercentage || 0}%</Text>
              </div>
              <div>
                <Text>• Số yêu cầu nghỉ phép: </Text>
                <Text strong>{stats?.weekStats?.leaveRequests || 0}</Text>
              </div>
              {stats?.weekStats?.totalLateMinutes !== undefined && (
                <div>
                  <Text>• Tổng phút đi muộn: </Text>
                  <Text strong type="warning">{stats.weekStats.totalLateMinutes} phút</Text>
                </div>
              )}
              {stats?.weekStats?.totalOvertimeHours !== undefined && (
                <div>
                  <Text>• Tổng giờ làm thêm: </Text>
                  <Text strong type="success">{stats.weekStats.totalOvertimeHours} giờ</Text>
                </div>
              )}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
