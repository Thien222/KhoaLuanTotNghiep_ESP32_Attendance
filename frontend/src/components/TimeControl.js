import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Space, 
  Tag, 
  Button, 
  Popover, 
  DatePicker, 
  message,
  Divider,
  Row,
  Col,
  Tooltip
} from 'antd';
import { 
  ClockCircleOutlined, 
  ReloadOutlined,
  FastForwardOutlined,
  ThunderboltOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { getAPIUrl } from '../utils/configManager';
import moment from 'moment';

const { Text, Title } = Typography;

const TimeControl = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeMachineStatus, setTimeMachineStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState('employee');

  useEffect(() => {
    // Get user role
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setUserRole(user.role || 'employee');
      }
    } catch (e) {}

    // Update time every second
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Check time machine status
    checkTimeMachineStatus();
    
    // Check status every 10 seconds
    const statusInterval = setInterval(checkTimeMachineStatus, 10000);

    return () => {
      clearInterval(interval);
      clearInterval(statusInterval);
    };
  }, []);

  const checkTimeMachineStatus = async () => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      if (!token) return;

      const response = await axios.get(`${API_URL}/timemachine/status`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setTimeMachineStatus(response.data.data);
      }
    } catch (error) {
      // Time machine might not be available, ignore error
    }
  };

  const handleResetTime = async () => {
    setLoading(true);
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      if (!token) {
        message.error('Chưa đăng nhập');
        return;
      }

      const response = await axios.post(`${API_URL}/timemachine/reset`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        message.success('✓ Đã reset về thời gian thực');
        checkTimeMachineStatus();
      }
    } catch (error) {
      console.error('Error resetting time:', error);
      message.error('Lỗi khi reset thời gian');
    } finally {
      setLoading(false);
    }
  };

  const handleSetTime = async (datetime) => {
    if (!datetime) return;
    
    setLoading(true);
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      if (!token) {
        message.error('Chưa đăng nhập');
        return;
      }

      // Gửi datetime string không có timezone (YYYY-MM-DDTHH:mm:ss)
      // Backend sẽ parse như Asia/Ho_Chi_Minh timezone
      const datetimeStr = datetime.format('YYYY-MM-DDTHH:mm:ss');
      
      const response = await axios.post(`${API_URL}/timemachine/set`, {
        datetime: datetimeStr
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        message.success(`⏰ Đã đặt thời gian ảo: ${datetime.format('HH:mm DD/MM/YYYY')}`);
        checkTimeMachineStatus();
      }
    } catch (error) {
      console.error('Error setting time:', error);
      message.error('Không thể thiết lập thời gian');
    } finally {
      setLoading(false);
    }
  };

  const handleScenario = async (scenario) => {
    setLoading(true);
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      if (!token) {
        message.error('Chưa đăng nhập');
        return;
      }

      const response = await axios.post(`${API_URL}/timemachine/scenario`, {
        scenario
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        message.success(`🎯 ${response.data.data.description}`);
        checkTimeMachineStatus();
      }
    } catch (error) {
      console.error('Error setting scenario:', error);
      message.error('Lỗi khi thiết lập kịch bản');
    } finally {
      setLoading(false);
    }
  };

  const handleFastForward = async (amount, unit) => {
    setLoading(true);
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      if (!token) {
        message.error('Chưa đăng nhập');
        return;
      }

      const response = await axios.post(`${API_URL}/timemachine/fastforward`, {
        amount,
        unit
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        message.success(`⏩ Đã tua nhanh ${amount} ${unit}`);
        checkTimeMachineStatus();
      }
    } catch (error) {
      console.error('Error fast forwarding:', error);
      message.error('Lỗi khi tua nhanh thời gian');
    } finally {
      setLoading(false);
    }
  };

  // Only show for managers
  if (userRole !== 'manager') {
    return null;
  }

  const displayTime = timeMachineStatus?.active && timeMachineStatus?.currentTime
    ? moment(timeMachineStatus.currentTime)
    : moment(currentTime);

  const isVirtual = timeMachineStatus?.active;

  const scenarios = [
    { key: 'on-time', label: 'Đúng giờ (7:50)', color: 'green' },
    { key: 'late-15min', label: 'Muộn 15p (8:20)', color: 'orange' },
    { key: 'late-2h', label: 'Muộn 2h (10:05)', color: 'red' },
    { key: 'checkout-ontime', label: 'Check-out 17:00', color: 'blue' },
    { key: 'checkout-ot-1h', label: 'OT 1h (20:00)', color: 'purple' },
    { key: 'checkout-ot-3h', label: 'OT 3h (22:00)', color: 'magenta' }
  ];

  const timeControlContent = (
    <div style={{ width: 380 }}>
      <Title level={5} style={{ margin: '0 0 12px 0' }}>
        <ExperimentOutlined /> Time Machine - Demo Mode
      </Title>
      
      {isVirtual && (
        <div style={{ 
          background: '#fff7e6', 
          border: '1px solid #ffd591', 
          borderRadius: 8, 
          padding: 12, 
          marginBottom: 16 
        }}>
          <Text strong style={{ color: '#d46b08' }}>⚠️ Đang dùng thời gian ảo</Text>
          <br />
          <Text type="secondary">
            Thực tế: {moment(timeMachineStatus?.realTime).format('HH:mm:ss DD/MM/YYYY')}
          </Text>
          <br />
          <Button 
            type="primary" 
            danger 
            size="small" 
            icon={<ReloadOutlined />}
            onClick={handleResetTime}
            loading={loading}
            style={{ marginTop: 8 }}
            block
          >
            Reset về thời gian thực
          </Button>
        </div>
      )}

      <Divider style={{ margin: '12px 0' }}>Kịch bản test nhanh</Divider>
      
      <Row gutter={[8, 8]}>
        {scenarios.map(s => (
          <Col span={12} key={s.key}>
            <Tooltip title={`Nhảy đến ${s.label}`}>
              <Button 
                size="small" 
                block
                onClick={() => handleScenario(s.key)}
                loading={loading}
                style={{ fontSize: 12 }}
              >
                <Tag color={s.color} style={{ margin: 0 }}>{s.label}</Tag>
              </Button>
            </Tooltip>
          </Col>
        ))}
      </Row>

      <Divider style={{ margin: '12px 0' }}>Tua nhanh thời gian</Divider>
      
      <Space wrap>
        <Button 
          size="small" 
          icon={<FastForwardOutlined />}
          onClick={() => handleFastForward(1, 'hours')}
          loading={loading}
        >
          +1 giờ
        </Button>
        <Button 
          size="small" 
          icon={<FastForwardOutlined />}
          onClick={() => handleFastForward(4, 'hours')}
          loading={loading}
        >
          +4 giờ
        </Button>
        <Button 
          size="small" 
          icon={<FastForwardOutlined />}
          onClick={() => handleFastForward(1, 'days')}
          loading={loading}
        >
          +1 ngày
        </Button>
      </Space>

      <Divider style={{ margin: '12px 0' }}>Đặt thời gian cụ thể</Divider>
      
      <DatePicker
        showTime
        format="YYYY-MM-DD HH:mm:ss"
        placeholder="Chọn ngày giờ"
        onChange={handleSetTime}
        style={{ width: '100%' }}
        showNow
      />
      
      <div style={{ marginTop: 12, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          💡 <strong>Hướng dẫn test OT:</strong><br/>
          1. Đặt thời gian = 7:50, scan vân tay (Check-in)<br/>
          2. Đặt thời gian = 20:00, scan lại (Check-out)<br/>
          3. Hệ thống tự tính OT nếu có đơn OT đã duyệt
        </Text>
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'fixed',
      top: 80,  // Gần icon thông báo, dưới header
      right: 24,
      zIndex: 1000
    }}>
      <Popover 
        content={timeControlContent} 
        title={null}
        trigger="click"
        placement="bottomRight"  // Popover mở xuống dưới thay vì lên trên
      >
        <Card 
          size="small" 
          style={{ 
            cursor: 'pointer',
            boxShadow: isVirtual 
              ? '0 4px 20px rgba(250, 140, 22, 0.4)' 
              : '0 2px 8px rgba(0,0,0,0.15)',
            border: isVirtual ? '2px solid #fa8c16' : '1px solid #d9d9d9',
            background: isVirtual ? '#fff7e6' : '#fff'
          }}
          hoverable
        >
          <Space>
            {isVirtual ? (
              <ThunderboltOutlined style={{ color: '#fa8c16', fontSize: 18 }} />
            ) : (
              <ClockCircleOutlined style={{ fontSize: 18 }} />
            )}
            <div>
              <Text strong style={{ 
                fontSize: 16,
                color: isVirtual ? '#d46b08' : undefined 
              }}>
                {displayTime.format('HH:mm:ss')}
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: 11 }}>
                {displayTime.format('DD/MM/YYYY')}
              </Text>
            </div>
            {isVirtual && (
              <Tag color="orange" style={{ marginLeft: 4 }}>ẢO</Tag>
            )}
          </Space>
        </Card>
      </Popover>
    </div>
  );
};

export default TimeControl;
