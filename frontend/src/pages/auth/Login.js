import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, App } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAPIUrl } from '../../utils/configManager';

const { Title, Text } = Typography;

const Login = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        const userRole = user.role;
        const profileCompleted = user.profileCompleted !== false;
        
        // Redirect based on role
        if (userRole === 'manager') {
          navigate('/dashboard');
        } else if (userRole === 'employee') {
          if (!profileCompleted) {
            navigate('/complete-profile');
          } else {
            navigate('/requests');
          }
        } else if (userRole === 'accountant') {
          navigate('/payroll');
        } else {
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        // Clear invalid data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, [navigate]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const API_URL = getAPIUrl();
      console.log('🔐 Attempting login with API_URL:', API_URL);
      
      // Set timeout for axios request
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: values.email,
        password: values.password
      }, {
        timeout: 10000 // 10 seconds timeout
      });

      console.log('✅ Login response:', response.data);

      if (response.data.success) {
        // Store token and user info in localStorage
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        
        message.success('Đăng nhập thành công!');
        
        // Redirect based on role and profile completion
        const userRole = response.data.data.user.role;
        const profileCompleted = response.data.data.user.profileCompleted;
        
        if (userRole === 'manager') {
          navigate('/dashboard');
        } else if (userRole === 'employee') {
          // Check if profile is completed
          if (!profileCompleted) {
            message.warning('Vui lòng hoàn thiện thông tin cá nhân trước khi sử dụng hệ thống');
            navigate('/complete-profile');
          } else {
            navigate('/requests');
          }
        } else {
          navigate('/payroll');
        }
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      
      // Handle different types of errors
      let errorMessage = 'Đăng nhập thất bại.';
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage = 'Kết nối đến server bị timeout. Vui lòng kiểm tra:';
        errorMessage += '\n- Server có đang chạy không?';
        errorMessage += '\n- Địa chỉ IP server có đúng không?';
        errorMessage += `\n- Đang kết nối đến: ${getAPIUrl()}`;
        message.error({
          content: errorMessage,
          duration: 8
        });
      } else if (error.code === 'ERR_NETWORK' || error.message.includes('ERR_CONNECTION_TIMED_OUT')) {
        errorMessage = 'Không thể kết nối đến server. Vui lòng kiểm tra:';
        errorMessage += '\n- Server có đang chạy không?';
        errorMessage += '\n- Địa chỉ IP và cổng có đúng không?';
        errorMessage += `\n- Đang kết nối đến: ${getAPIUrl()}`;
        errorMessage += '\n- Kiểm tra cài đặt IP trong Settings';
        message.error({
          content: errorMessage,
          duration: 8
        });
      } else if (error.response) {
        // Server responded with error status
        errorMessage = error.response.data?.message || `Lỗi: ${error.response.status} - ${error.response.statusText}`;
        message.error(errorMessage);
      } else {
        errorMessage = error.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
        message.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          borderRadius: '12px'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Title level={2} style={{ color: '#1890ff', marginBottom: '8px' }}>
            <LoginOutlined /> Đăng Nhập
          </Title>
          <Text type="secondary">
            Hệ thống quản lý nhân sự tích hợp chấm công vân tay
          </Text>
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#999' }}>
            Server: {getAPIUrl()}
          </div>
          <Button
            type="link"
            icon={<SettingOutlined />}
            onClick={() => navigate('/ip-config')}
            style={{ marginTop: '8px', fontSize: '12px', padding: 0 }}
          >
            Cấu hình IP Server
          </Button>
        </div>

        <Form
          form={form}
          name="login"
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="email"
            label="Email hoặc Username"
            rules={[
              { required: true, message: 'Vui lòng nhập email hoặc username!' }
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Nhập email hoặc username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu!' },
              { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Nhập mật khẩu"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{ height: '48px', fontSize: '16px' }}
            >
              Đăng Nhập
            </Button>
          </Form.Item>
        </Form>

      </Card>
    </div>
  );
};

export default Login;

