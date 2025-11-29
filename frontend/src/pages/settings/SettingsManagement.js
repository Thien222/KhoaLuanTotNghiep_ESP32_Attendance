import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Typography, 
  Form, 
  Input, 
  Button, 
  Switch, 
  Select,
  message,
  Tabs
} from 'antd';
import { 
  SettingOutlined, 
  SaveOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import IPConfiguration from './IPConfiguration';
import SystemSettings from './SystemSettings';

const { Title } = Typography;
const { Option } = Select;

const SettingsManagement = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      // Settings form - data will be loaded from user input or API if needed
      // Note: This component may need to be integrated with Settings API in the future
      // For now, form starts empty
    } catch (error) {
      console.error('Error fetching settings:', error);
      message.error('Lỗi khi tải cài đặt');
    }
  }, [form]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (values) => {
    setLoading(true);
    try {
      // TODO: Integrate with Settings API when backend endpoint is available
      console.log('Saving settings:', values);
      message.warning('Tính năng lưu cài đặt đang được phát triển. Vui lòng sử dụng trang Cài đặt hệ thống để cấu hình.');
    } catch (error) {
      message.error('Lỗi khi lưu cài đặt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <SettingOutlined style={{ marginRight: 8 }} />
          Cài đặt hệ thống
        </Title>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Tabs 
          defaultActiveKey="ip-config"
          items={[
            {
              key: 'ip-config',
              label: <span><GlobalOutlined /> Cấu hình IP & Kết nối</span>,
              children: (
                <div style={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}>
                  <IPConfiguration />
                </div>
              )
            },
            {
              key: 'system-settings',
              label: <span><SettingOutlined /> Cài đặt hệ thống</span>,
              children: (
                <div style={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}>
                  <SystemSettings />
                </div>
              )
            }
          ]}
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        />
      </div>
    </div>
  );
};

export default SettingsManagement;



