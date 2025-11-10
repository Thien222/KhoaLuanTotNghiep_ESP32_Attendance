<<<<<<< HEAD
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
  List
} from 'antd';
import { 
  UserOutlined, 
  ClockCircleOutlined, 
  DollarOutlined, 
  CheckCircleOutlined,
  LoadingOutlined
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
              value={stats?.todayAttendance?.present || 0}
              suffix={`/ ${stats?.todayAttendance?.total || 0}`}
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
=======
import React from 'react';
import { Card, Row, Col, Statistic, Typography, Space } from 'antd';
import { 
  UserOutlined, 
  ClockCircleOutlined, 
  DollarOutlined, 
  CheckCircleOutlined 
} from '@ant-design/icons';

const { Title } = Typography;

const Dashboard = () => {
  return (
    <div>
      <Title level={2}>Dashboard</Title>
      
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng nhân viên"
              value={1128}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Đã chấm công hôm nay"
              value={93}
              suffix="%"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng lương tháng này"
              value={112893}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Yêu cầu nghỉ phép"
              value={5}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>
      
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Hoạt động gần đây" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>• Nguyễn Văn A đã chấm công vào lúc 08:30</div>
              <div>• Trần Thị B đã gửi yêu cầu nghỉ phép</div>
              <div>• Lê Văn C đã chấm công ra lúc 17:30</div>
            </Space>
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card title="Thống kê tuần này" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>• Số ngày làm việc: 5/5</div>
              <div>• Tỷ lệ chấm công đúng giờ: 95%</div>
              <div>• Số yêu cầu nghỉ phép: 3</div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
>>>>>>> 03f3fc8ca695fadb2e80e46e5549b7e9db5477cf
