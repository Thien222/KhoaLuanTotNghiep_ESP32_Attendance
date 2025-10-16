import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Form, 
  Input, 
  Button, 
  Switch, 
  Select,
  message,
  Divider
} from 'antd';
import { 
  SettingOutlined, 
  SaveOutlined 
} from '@ant-design/icons';
import axios from 'axios';

const { Title } = Typography;
const { Option } = Select;

const SettingsManagement = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // Mock settings data
      const mockSettings = {
        companyName: 'Công ty TNHH ABC',
        companyAddress: '123 Đường ABC, Quận 1, TP.HCM',
        companyPhone: '0123456789',
        workingHoursPerDay: 8,
        lateThreshold: 15,
        overtimeRate: 1.5,
        defaultSalary: 5000000,
        currency: 'VND',
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true
      };
      form.setFieldsValue(mockSettings);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSave = async (values) => {
    setLoading(true);
    try {
      // Mock save
      console.log('Saving settings:', values);
      message.success('Cài đặt đã được lưu thành công');
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
      </Card>
    </div>
  );
};

export default SettingsManagement;