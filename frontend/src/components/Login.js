import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Divider } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const { Title, Text } = Typography;

const Login = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:3000/api/auth/login', {
        email: values.email,
        password: values.password
      });

      if (response.data.success) {
        // Store token and user info in localStorage
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        
        message.success('Đăng nhập thành công!');
        
        // Redirect based on role
        const userRole = response.data.data.user.role;
        if (userRole === 'manager') {
          navigate('/dashboard');
        } else if (userRole === 'accountant') {
          navigate('/payroll');
        } else {
          navigate('/attendance');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      message.error(error.response?.data?.message || 'Đăng nhập thất bại');
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
            label="Email"
            rules={[
              { required: true, message: 'Vui lòng nhập email!' },
              { type: 'email', message: 'Email không hợp lệ!' }
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Nhập email của bạn"
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

        <Divider>Thông tin demo</Divider>
        
        <div style={{ fontSize: '12px', color: '#666' }}>
          <p><strong>Quản lý:</strong> admin@company.com / 123456</p>
          <p><strong>Kế toán:</strong> accountant@company.com / 123456</p>
          <p><strong>Nhân viên:</strong> employee@company.com / 123456</p>
        </div>
      </Card>
    </div>
  );
};

export default Login;


