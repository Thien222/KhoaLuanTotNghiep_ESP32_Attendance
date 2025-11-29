import React, { useState } from 'react';
import { Layout as AntLayout, Menu, Button, Avatar, Dropdown, Space, Typography, Badge, Switch, Tooltip } from 'antd';
import { 
  MenuFoldOutlined, 
  MenuUnfoldOutlined, 
  UserOutlined, 
  BellOutlined,
  LogoutOutlined,
  DashboardOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  DollarOutlined,
  RobotOutlined,
  SettingOutlined,
  SwapOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import TimeControl from './TimeControl';

const { Header, Sider, Content } = AntLayout;
const { Text } = Typography;

const MainLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState('admin'); // 'admin' or 'personal'
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get user from localStorage
  const getUser = () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        return JSON.parse(userData);
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
    return null;
  };

  const user = getUser();
  
  // Redirect to login if no user
  React.useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);
  
  if (!user) {
    return null;
  }
  
  const isAdmin = user?.role === 'manager';
  const isAccountant = user?.role === 'accountant';
  
  const adminMenuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard'
    },
    {
      key: '/attendance',
      icon: <ClockCircleOutlined />,
      label: 'Chấm công'
    },
    {
      key: '/employees',
      icon: <TeamOutlined />,
      label: 'Quản lý nhân sự'
    },
    {
      key: '/requests',
      icon: <FileTextOutlined />,
      label: 'Duyệt đơn'
    },
    {
      key: '/payroll',
      icon: <DollarOutlined />,
      label: 'Bảng lương'
    },
    {
      key: '/statistics',
      icon: <BarChartOutlined />,
      label: 'Thống kê'
    },
    {
      key: '/chatbot',
      icon: <RobotOutlined />,
      label: 'ChatBot AI'
    },
    {
      key: '/shifts',
      icon: <ClockCircleOutlined />,
      label: 'Ca làm việc'
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Cài đặt'
    }
  ];

  const personalMenuItems = [
    {
      key: '/requests',
      icon: <FileTextOutlined />,
      label: 'Gửi yêu cầu'
    },
    {
      key: '/payroll',
      icon: <DollarOutlined />,
      label: 'Bảng lương'
    },
    {
      key: '/chatbot',
      icon: <RobotOutlined />,
      label: 'ChatBot AI'
    }
  ];

  const accountantMenuItems = [
    {
      key: '/payroll',
      icon: <DollarOutlined />,
      label: 'Bảng lương'
    }
  ];

  // Get menu items based on role and view mode
  const getMenuItems = () => {
    if (isAccountant) {
      return accountantMenuItems;
    }
    
    if (isAdmin) {
      return viewMode === 'admin' ? adminMenuItems : personalMenuItems;
    }
    
    return personalMenuItems;
  };

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'admin' ? 'personal' : 'admin');
  };

  return (
    <AntLayout style={{ height: '100vh', overflow: 'hidden' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        style={{
          background: 'linear-gradient(180deg, #001529 0%, #002140 100%)',
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
          height: '100vh',
          overflow: 'auto'
        }}
      >
        <div style={{ 
          height: '64px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <Text strong style={{ fontSize: collapsed ? '14px' : '16px', color: '#fff' }}>
            {collapsed ? '⏰' : '⏰ ESP32 Attendance'}
          </Text>
        </div>
        
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[location.pathname]}
          items={getMenuItems()}
          onClick={handleMenuClick}
          style={{ borderRight: 0, background: 'transparent' }}
        />
      </Sider>
      
      <AntLayout style={{ height: '100vh', overflow: 'hidden' }}>
        <Header style={{ 
          padding: '0 16px', 
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          height: 56,
          lineHeight: '56px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: '16px' }}
            />
            
            {/* View Mode Toggle for Admin */}
            {isAdmin && (
              <Tooltip title={viewMode === 'admin' ? 'Chuyển sang chế độ cá nhân' : 'Chuyển sang chế độ quản trị'}>
                <Button 
                  type={viewMode === 'admin' ? 'primary' : 'default'}
                  icon={<SwapOutlined />}
                  onClick={toggleViewMode}
                  size="small"
                >
                  {viewMode === 'admin' ? 'Admin' : 'Cá nhân'}
                </Button>
              </Tooltip>
            )}
          </div>
          
          <Space size="middle">
            <Badge count={0} size="small">
              <Button type="text" icon={<BellOutlined />} />
            </Badge>
            
            <Dropdown menu={{ 
              items: [
                {
                  key: 'profile',
                  icon: <UserOutlined />,
                  label: 'Thông tin cá nhân',
                  onClick: () => navigate('/profile')
                },
                {
                  type: 'divider'
                },
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: 'Đăng xuất',
                  onClick: handleLogout,
                  danger: true
                }
              ]
            }} trigger={['click']}>
              <Button type="text" style={{ height: 'auto', padding: '4px 8px' }}>
                <Space>
                  <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                  <Text>{user?.name || user?.employee?.name || user?.email || 'User'}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    ({user?.role === 'manager' ? 'Admin' : user?.role === 'accountant' ? 'Kế toán' : 'NV'})
                  </Text>
                </Space>
              </Button>
            </Dropdown>
          </Space>
        </Header>
        
        <Content style={{ 
          margin: 0,
          padding: 12,
          background: '#f0f2f5',
          height: 'calc(100vh - 56px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ 
            flex: 1, 
            background: '#fff', 
            borderRadius: 6, 
            padding: 12,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            minHeight: 0
          }}>
            {children}
          </div>
          
          {/* Time Control Component - for Admin only */}
          {isAdmin && <TimeControl />}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default MainLayout;
