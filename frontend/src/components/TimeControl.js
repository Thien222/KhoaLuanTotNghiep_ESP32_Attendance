import React, { useState } from 'react';
import { DatePicker, Button, Card, message, Typography, Space } from 'antd';
import { ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons';
import axios from 'axios';
import { getAPIUrl } from '../utils/configManager';

const { Text } = Typography;

const TimeControl = () => {
  const [loading, setLoading] = useState(false);

  const handleSetTime = async (value) => {
    if (!value) return;
    setLoading(true);
    try {
      const API_URL = getAPIUrl();
      // Gửi ISO string xuống server
      await axios.post(`${API_URL}/test/set-time`, { 
        time: value.toISOString() 
      });
      message.success(`🕒 Server đã du hành đến: ${value.format('HH:mm DD/MM')}`);
    } catch (error) {
      if (error.response?.status === 403) {
        message.error('Test Mode đang TẮT trên server! Hãy bật trong file .env');
      } else {
        message.error('Lỗi kết nối đến Server');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      const API_URL = getAPIUrl();
      await axios.post(`${API_URL}/test/reset-time`);
      message.success('🕒 Đã đồng bộ lại với thời gian thực!');
    } catch (error) {
      message.error('Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card 
      size="small" 
      title={
        <Space>
          <ThunderboltOutlined style={{ color: '#faad14' }} /> 
          <Text strong>Time Machine (Test)</Text>
        </Space>
      } 
      style={{ 
        position: 'fixed', 
        bottom: 20, 
        right: 20, 
        zIndex: 9999, // Đảm bảo nổi lên trên cùng
        width: 320,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        border: '1px solid #1890ff',
        borderRadius: '8px'
      }}
      headStyle={{ backgroundColor: '#e6f7ff', color: '#1890ff', minHeight: '40px' }}
      bodyStyle={{ padding: '12px' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Chọn giờ và bấm OK để giả lập thời gian cho Server:
        </Text>
        <div style={{ display: 'flex', gap: 8 }}>
          <DatePicker 
            showTime 
            format="DD/MM/YYYY HH:mm" 
            placeholder="Chọn thời gian..."
            onOk={handleSetTime} 
            style={{ flex: 1 }}
          />
          <Button 
            icon={<ReloadOutlined />} 
            onClick={handleReset} 
            loading={loading}
            title="Reset về giờ thật"
            danger
          />
        </div>
      </div>
    </Card>
  );
};

export default TimeControl;

