import React from 'react';
import { Card, Typography, Button, Space } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const TestPage = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <CheckCircleOutlined style={{ fontSize: '64px', color: '#52c41a', marginBottom: '24px' }} />
          <Title level={2} style={{ color: '#52c41a' }}>
            🎉 Hệ thống hoạt động bình thường!
          </Title>
          <Paragraph style={{ fontSize: '16px', marginBottom: '32px' }}>
            Chào mừng bạn đến với hệ thống quản lý nhân sự tích hợp chấm công vân tay và ChatBot AI
          </Paragraph>
          
          <Space size="large">
            <Button type="primary" size="large">
              Bắt đầu sử dụng
            </Button>
            <Button size="large">
              Xem hướng dẫn
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default TestPage;


