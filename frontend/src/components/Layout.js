import React, { useState } from 'react';
import { Layout as AntLayout, Menu, Button, Avatar, Dropdown, Space, Typography, Badge } from 'antd';
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
  BarChartOutlined,
  RobotOutlined,
  SettingOutlined,
  WifiOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import TimeControl from './TimeControl';

const { Header, Sider, Content } = AntLayout;
const { Text } = Typography;

const MainLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
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
    return null; // Will redirect to login
  }
  
  const logout = () => {
    console.log('Logout clicked');
  };

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
      roles: ['manager'] // Only admin
    },
    {
      key: '/attendance',
      icon: <ClockCircleOutlined />,
      label: 'Chấm công',
      roles: ['manager'] // Only admin
    },
    {
      key: '/employees',
      icon: <TeamOutlined />,
      label: 'Quản lý nhân sự',
      roles: ['manager'] // Only admin
    },
    {
      key: '/leave-requests',
      icon: <FileTextOutlined />,
      label: 'Nghỉ phép',
      roles: ['employee', 'manager'] // User và admin
    },
    {
      key: '/payroll',
      icon: <DollarOutlined />,
      label: 'Bảng lương',
      roles: ['employee', 'manager', 'accountant'] // User, admin và kế toán
    },
    {
      key: '/reports',
      icon: <BarChartOutlined />,
      label: 'Báo cáo',
      roles: ['manager'] // Only admin
    },
    {
      key: '/chatbot',
      icon: <RobotOutlined />,
      label: 'ChatBot',
      roles: ['employee', 'manager'] // User và admin
    },
    {
      key: '/esp32',
      icon: <WifiOutlined />,
      label: 'Quản lý ESP32',
      roles: ['manager'] // Only admin
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Cài đặt',
      roles: ['manager'] // Only admin
    },
    {
      key: '/shifts',
      icon: <ClockCircleOutlined />,
      label: 'Quản lý ca làm việc',
      roles: ['manager'] // Only admin
    }
  ];

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => {
    if (!user || !user.role) return false;
    return item.roles.includes(user.role);
  });

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    logout();
    navigate('/');
    // Reload page to clear state
    window.location.href = '/';
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        style={{
          background: '#fff',
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ 
          height: '64px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <Text strong style={{ fontSize: collapsed ? '16px' : '18px', color: '#1890ff' }}>
            {collapsed ? 'HR' : 'HR Management'}
          </Text>
        </div>
        
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={filteredMenuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </Sider>
      
      <AntLayout>
        <Header style={{ 
          padding: '0 24px', 
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          
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
                  onClick: handleLogout
                }
              ]
            }} trigger={['click']}>
              <Button type="text" style={{ height: 'auto', padding: '4px 8px' }}>
                <Space>
                  <Avatar size="small" icon={<UserOutlined />} />
                  <Text>{user?.name || user?.employee?.name || user?.email || user?.username || 'User'}</Text>
                </Space>
              </Button>
            </Dropdown>
          </Space>
        </Header>
        
        <Content style={{ 
          margin: '24px 16px',
          padding: 24,
          background: '#fff',
          borderRadius: '8px',
          minHeight: 'calc(100vh - 112px)',
          position: 'relative' // Thêm relative để định vị con
        }}>
          {children}
          
          {/* Time Control Component */}
          <TimeControl />
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default MainLayout;
