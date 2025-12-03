import React, { useState } from 'react';
import { Layout as AntLayout, Menu, Button, Avatar, Dropdown, Space, Typography, Badge, Tooltip, Tag } from 'antd';
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
  BarChartOutlined,
  UserDeleteOutlined,
  CalendarOutlined,
  CrownOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import TimeControl from './TimeControl';
import { useViewMode } from '../contexts/ViewModeContext';

const { Header, Sider, Content } = AntLayout;
const { Text } = Typography;

const MainLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { 
    canSwitchMode, 
    isPersonalMode,
    isAdminMode,
    isAccountantMode,
    getCurrentModeInfo,
    toggleMode
  } = useViewMode();
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
  
  // Menu cho mode Admin (quản lý toàn bộ hệ thống)
  const adminMenuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard'
    },
    {
      key: '/attendance',
      icon: <ClockCircleOutlined />,
      label: 'Quản lý chấm công'
    },
    {
      key: '/employees',
      icon: <TeamOutlined />,
      label: 'Quản lý nhân sự'
    },
    {
      key: '/resignations',
      icon: <UserDeleteOutlined />,
      label: 'Quản lý nghỉ việc'
    },
    {
      key: '/requests',
      icon: <FileTextOutlined />,
      label: 'Duyệt đơn'
    },
    {
      key: '/payroll',
      icon: <DollarOutlined />,
      label: 'Bảng lương (Toàn bộ)'
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

  // Menu cho mode Cá nhân (nhân viên, admin khi ở mode cá nhân)
  const personalMenuItems = [
    {
      key: '/my-attendance',
      icon: <CalendarOutlined />,
      label: 'Lịch chấm công'
    },
    {
      key: '/my-payroll',
      icon: <DollarOutlined />,
      label: 'Bảng lương của tôi'
    },
    {
      key: '/requests',
      icon: <FileTextOutlined />,
      label: 'Gửi đơn'
    },
    {
      key: '/chatbot',
      icon: <RobotOutlined />,
      label: 'ChatBot AI'
    }
  ];

  // Menu cho mode Kế toán (xem/sửa bảng lương toàn bộ)
  const accountantModeMenuItems = [
    {
      key: '/payroll',
      icon: <DollarOutlined />,
      label: 'Bảng lương (Toàn bộ)'
    }
  ];

  // Get menu items based on role and view mode
  const getMenuItems = () => {
    if (isAccountant) {
      // Kế toán: mode accountant = xem toàn bộ lương, mode personal = menu cá nhân
      return isAccountantMode ? accountantModeMenuItems : personalMenuItems;
    }
    
    if (isAdmin) {
      // Admin: mode admin = quản lý, mode personal = cá nhân
      return isAdminMode ? adminMenuItems : personalMenuItems;
    }
    
    // Nhân viên: chỉ menu cá nhân
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

  // Use toggleMode from context
  const handleToggleMode = () => {
    toggleMode();
  };

  const getModeButtonStyle = () => {
    const modeInfo = getCurrentModeInfo();
    return {
      borderRadius: 8,
      fontWeight: 500,
      border: 'none',
      background: modeInfo.color,
      color: '#fff'
    };
  };

  const siderWidth = collapsed ? 80 : 200;

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      {/* Fixed Sidebar */}
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        width={200}
        collapsedWidth={80}
        style={{
          background: '#ffffff',
          boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          overflow: 'auto',
          borderRight: '1px solid #f0f0f0'
        }}
        className="fixed-sidebar"
      >
        <div style={{ 
          height: '56px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderBottom: '1px solid #f0f0f0',
          background: '#fafafa',
          padding: '0 8px'
        }}>
          <Text strong style={{ 
            fontSize: collapsed ? '20px' : '14px', 
            color: '#1890ff',
            fontWeight: 600,
            letterSpacing: '-0.5px'
          }}>
            {collapsed ? 'HR' : 'HR Management System'}
          </Text>
        </div>
        
        <Menu
          mode="inline"
          theme="light"
          selectedKeys={[location.pathname]}
          items={getMenuItems()}
          onClick={handleMenuClick}
          style={{ 
            borderRight: 0, 
            background: 'transparent',
            padding: '4px 0'
          }}
        />
      </Sider>
      
      {/* Main content area with margin for fixed sidebar */}
      <AntLayout style={{ 
        marginLeft: siderWidth,
        minHeight: '100vh',
        transition: 'margin-left 0.2s ease',
        width: `calc(100% - ${siderWidth}px)`
      }}>
        {/* Fixed Header */}
        <Header style={{ 
          padding: '0 12px', 
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          height: 56,
          lineHeight: '56px',
          borderBottom: '1px solid #f0f0f0',
          position: 'fixed',
          top: 0,
          left: siderWidth,
          right: 0,
          zIndex: 99,
          transition: 'left 0.2s ease'
        }}
        className="fixed-header"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: '16px' }}
            />
            
            {/* View Mode Toggle - Admin/Accountant can switch modes */}
            {canSwitchMode && (
              <Tooltip title={`Chuyển chế độ xem (hiện tại: ${getCurrentModeInfo().label})`}>
                <Button 
                  icon={
                    isPersonalMode ? <UserOutlined /> : 
                    isAccountantMode ? <DollarOutlined /> : 
                    <CrownOutlined />
                  }
                  onClick={handleToggleMode}
                  size="small"
                  style={getModeButtonStyle()}
                >
                  {getCurrentModeInfo().label}
                </Button>
              </Tooltip>
            )}
            
            {/* Show current mode badge */}
            {!canSwitchMode && (
              <Tag color="blue" icon={<UserOutlined />}>
                Cá nhân
              </Tag>
            )}
          </div>
          
          <Space size="middle">
            {/* Time Machine - for Admin only */}
            {isAdmin && <TimeControl />}
            
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
              <Button type="text" style={{ 
                height: 'auto', 
                padding: '4px 12px',
                borderRadius: 8,
                border: '1px solid #f0f0f0'
              }}>
                <Space size={8}>
                  <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                  <Text style={{ fontWeight: 500 }}>{user?.name || user?.employee?.name || user?.email || 'User'}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    ({user?.role === 'manager' ? 'Admin' : user?.role === 'accountant' ? 'Kế toán' : 'NV'})
                  </Text>
                </Space>
              </Button>
            </Dropdown>
          </Space>
        </Header>
        
        {/* Content area with margin-top for fixed header - Modern scrolling approach */}
        <Content style={{ 
          marginTop: 56,
          padding: '16px 12px 16px 8px',
          background: '#f5f7fa',
          minHeight: 'calc(100vh - 56px)',
          width: '100%'
          /* Removed overflow:auto - let browser handle scrolling naturally */
        }}
        className="main-content-area"
        >
          {/* Removed white wrapper div - content now uses full width */}
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default MainLayout;
