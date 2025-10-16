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

const { Header, Sider, Content } = AntLayout;
const { Text } = Typography;

const MainLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Mock user data for demo
  const user = {
    email: 'demo@company.com',
    role: 'manager'
  };
  
  const logout = () => {
    console.log('Logout clicked');
  };

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
      roles: ['employee', 'accountant', 'manager']
    },
    {
      key: '/attendance',
      icon: <ClockCircleOutlined />,
      label: 'Chấm công',
      roles: ['employee', 'accountant', 'manager']
    },
    {
      key: '/employees',
      icon: <TeamOutlined />,
      label: 'Quản lý nhân sự',
      roles: ['manager']
    },
    {
      key: '/leave-requests',
      icon: <FileTextOutlined />,
      label: 'Nghỉ phép',
      roles: ['employee', 'accountant', 'manager']
    },
    {
      key: '/payroll',
      icon: <DollarOutlined />,
      label: 'Bảng lương',
      roles: ['accountant', 'manager']
    },
    {
      key: '/reports',
      icon: <BarChartOutlined />,
      label: 'Báo cáo',
      roles: ['manager']
    },
    {
      key: '/chatbot',
      icon: <RobotOutlined />,
      label: 'ChatBot',
      roles: ['employee', 'accountant', 'manager']
    },
    {
      key: '/esp32',
      icon: <WifiOutlined />,
      label: 'Quản lý ESP32',
      roles: ['manager']
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Cài đặt',
      roles: ['manager']
    }
  ];

  // Show all menu items for demo
  const filteredMenuItems = menuItems;

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenu = (
    <Menu>
      <Menu.Item key="profile" icon={<UserOutlined />}>
        Thông tin cá nhân
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
        Đăng xuất
      </Menu.Item>
    </Menu>
  );

  const notificationMenu = (
    <Menu>
      <Menu.Item key="1">Thông báo 1</Menu.Item>
      <Menu.Item key="2">Thông báo 2</Menu.Item>
    </Menu>
  );

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
            
            <Dropdown menu={{ items: userMenu }} trigger={['click']}>
              <Button type="text" style={{ height: 'auto', padding: '4px 8px' }}>
                <Space>
                  <Avatar size="small" icon={<UserOutlined />} />
                  <Text>{user?.email}</Text>
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
          minHeight: 'calc(100vh - 112px)'
        }}>
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default MainLayout;
