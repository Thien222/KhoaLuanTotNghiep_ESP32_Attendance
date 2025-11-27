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
    <div>
      <Card>
        <div style={{ marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0 }}>
            <SettingOutlined /> Cài đặt hệ thống
          </Title>
        </div>

        <Tabs 
          defaultActiveKey="ip-config"
          items={[
            {
              key: 'ip-config',
              label: <span><GlobalOutlined /> Cấu hình IP & Kết nối</span>,
              children: <IPConfiguration />
            },
            {
              key: 'system-settings',
              label: <span><SettingOutlined /> Cài đặt hệ thống</span>,
              children: (
            <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          style={{ maxWidth: 600 }}
        >
          <Card title="Cài đặt chung" size="small" style={{ marginBottom: 16 }}>
            <Form.Item
              name="companyName"
              label="Tên công ty"
              rules={[{ required: true, message: 'Vui lòng nhập tên công ty' }]}
            >
              <Input placeholder="Nhập tên công ty" />
            </Form.Item>

            <Form.Item
              name="companyAddress"
              label="Địa chỉ công ty"
            >
              <Input placeholder="Nhập địa chỉ công ty" />
            </Form.Item>

            <Form.Item
              name="companyPhone"
              label="Số điện thoại"
            >
              <Input placeholder="Nhập số điện thoại" />
            </Form.Item>
          </Card>

          <Card title="Cài đặt chấm công" size="small" style={{ marginBottom: 16 }}>
            <Form.Item
              name="workingHoursPerDay"
              label="Số giờ làm việc mỗi ngày"
              rules={[{ required: true, message: 'Vui lòng nhập số giờ làm việc' }]}
            >
              <Input type="number" placeholder="8" addonAfter="giờ" />
            </Form.Item>

            <Form.Item
              name="lateThreshold"
              label="Ngưỡng muộn (phút)"
              rules={[{ required: true, message: 'Vui lòng nhập ngưỡng muộn' }]}
            >
              <Input type="number" placeholder="15" addonAfter="phút" />
            </Form.Item>

            <Form.Item
              name="overtimeRate"
              label="Hệ số làm thêm giờ"
              rules={[{ required: true, message: 'Vui lòng nhập hệ số làm thêm giờ' }]}
            >
              <Input type="number" placeholder="1.5" step="0.1" />
            </Form.Item>
          </Card>

          <Card title="Cài đặt lương" size="small" style={{ marginBottom: 16 }}>
            <Form.Item
              name="defaultSalary"
              label="Lương cơ bản mặc định"
              rules={[{ required: true, message: 'Vui lòng nhập lương cơ bản' }]}
            >
              <Input type="number" placeholder="5000000" addonAfter="VNĐ" />
            </Form.Item>

            <Form.Item
              name="currency"
              label="Đơn vị tiền tệ"
            >
              <Select>
                <Option value="VND">VND (Việt Nam Đồng)</Option>
                <Option value="USD">USD (Đô la Mỹ)</Option>
              </Select>
            </Form.Item>
          </Card>

          <Card title="Cài đặt thông báo" size="small" style={{ marginBottom: 16 }}>
            <Form.Item
              name="emailNotifications"
              label="Thông báo qua email"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="smsNotifications"
              label="Thông báo qua SMS"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="pushNotifications"
              label="Thông báo đẩy"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Card>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={loading}
              size="large"
            >
              Lưu cài đặt
            </Button>
          </Form.Item>
        </Form>
              )
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default SettingsManagement;



