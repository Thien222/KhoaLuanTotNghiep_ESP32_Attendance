import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  InputNumber,
  Button,
  Space,
  message,
  Collapse,
  Typography,
  Divider,
  Row,
  Col,
  Switch,
  TimePicker,
  Alert
} from 'antd';
import {
  SaveOutlined,
  SettingOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { getAPIUrl } from '../../utils/configManager';

const { Title, Text } = Typography;
const { Panel } = Collapse;

const SystemSettings = () => {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({});
  const [form] = Form.useForm();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');

      // Fetch all settings types
      const types = ['working-hours', 'overtime', 'late-policy', 'leave-policy', 'auto-checkout'];
      const promises = types.map(type =>
        axios.get(`${API_URL}/settings?type=${type}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );

      const responses = await Promise.all(promises);
      const settingsData = {};

      responses.forEach((response, index) => {
        if (response.data.success && response.data.data) {
          settingsData[types[index]] = response.data.data.value;
        }
      });

      setSettings(settingsData);

      // Set form values
      form.setFieldsValue({
        // Working hours
        startTime: settingsData['working-hours']?.startTime ? moment(settingsData['working-hours'].startTime, 'HH:mm') : moment('08:00', 'HH:mm'),
        endTime: settingsData['working-hours']?.endTime ? moment(settingsData['working-hours'].endTime, 'HH:mm') : moment('17:00', 'HH:mm'),

        // Overtime
        overtimeWeekdayRate: settingsData['overtime']?.weekdayRate || 1.5,
        overtimeWeekendRate: settingsData['overtime']?.weekendRate || 2.0,
        overtimeHolidayRate: settingsData['overtime']?.holidayRate || 3.0,
        overtimeMinDuration: settingsData['overtime']?.minDuration || 1,

        // Late policy
        lateGraceMinutes: settingsData['late-policy']?.graceMinutes || 15,
        latePenaltyAfterGrace: settingsData['late-policy']?.penaltyAfterGrace || 50000,
        lateHalfDayThreshold: settingsData['late-policy']?.halfDayThreshold || 60,

        // Leave policy
        leaveAnnualDays: settingsData['leave-policy']?.annualDays || 12,
        leaveCarryOverDays: settingsData['leave-policy']?.carryOverDays || 3,
        leaveResetMonth: settingsData['leave-policy']?.resetMonth || 1,

        // Auto-checkout
        autoCheckoutEnabled: settingsData['auto-checkout']?.enabled || true,
        autoCheckoutTime: settingsData['auto-checkout']?.defaultTime ? moment(settingsData['auto-checkout'].defaultTime, 'HH:mm') : moment('17:00', 'HH:mm'),
        autoCheckoutAfterHours: settingsData['auto-checkout']?.applyAfterHours || 2,
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      message.error('Lỗi khi tải cấu hình');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values) => {
    setLoading(true);
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');

      // Prepare settings updates
      const updates = [
        {
          type: 'working-hours',
          value: {
            startTime: values.startTime.format('HH:mm'),
            endTime: values.endTime.format('HH:mm')
          }
        },
        {
          type: 'overtime',
          value: {
            weekdayRate: values.overtimeWeekdayRate,
            weekendRate: values.overtimeWeekendRate,
            holidayRate: values.overtimeHolidayRate,
            minDuration: values.overtimeMinDuration,
            maxTime: '23:30',
            roundingRule: 'hour'
          }
        },
        {
          type: 'late-policy',
          value: {
            graceMinutes: values.lateGraceMinutes,
            penaltyAfterGrace: values.latePenaltyAfterGrace,
            halfDayThreshold: values.lateHalfDayThreshold,
            penaltyPerMinute: 0
          }
        },
        {
          type: 'leave-policy',
          value: {
            annualDays: values.leaveAnnualDays,
            carryOverDays: values.leaveCarryOverDays,
            resetMonth: values.leaveResetMonth
          }
        },
        {
          type: 'auto-checkout',
          value: {
            enabled: values.autoCheckoutEnabled,
            defaultTime: values.autoCheckoutTime.format('HH:mm'),
            applyAfterHours: values.autoCheckoutAfterHours
          }
        }
      ];

      // Update each setting
      const promises = updates.map(update =>
        axios.put(
          `${API_URL}/settings`,
          update,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        )
      );

      await Promise.all(promises);

      message.success('Lưu cấu hình thành công!');
      fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      message.error(error.response?.data?.message || 'Lỗi khi lưu cấu hình');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          <SettingOutlined /> Cấu hình hệ thống
        </Title>
        <Text type="secondary">
          Cấu hình các chính sách về giờ làm việc, OT, đi muộn, nghỉ phép
        </Text>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
      >
        <Collapse defaultActiveKey={['1', '2', '3', '4', '5']} accordion={false}>
          {/* Working Hours */}
          <Panel
            header={
              <Space>
                <ClockCircleOutlined />
                <Text strong>Giờ làm việc</Text>
              </Space>
            }
            key="1"
          >
            <Alert
              message="Cấu hình giờ vào/ra chuẩn cho tất cả nhân viên"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="startTime"
                  label="Giờ vào"
                  rules={[{ required: true, message: 'Vui lòng chọn giờ vào' }]}
                >
                  <TimePicker format="HH:mm" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="endTime"
                  label="Giờ ra"
                  rules={[{ required: true, message: 'Vui lòng chọn giờ ra' }]}
                >
                  <TimePicker format="HH:mm" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </Panel>

          {/* Overtime Policy */}
          <Panel
            header={
              <Space>
                <DollarOutlined />
                <Text strong>Chính sách làm thêm giờ (OT)</Text>
              </Space>
            }
            key="2"
          >
            <Alert
              message="Hệ số lương khi làm OT: Ngày thường x1.5, Cuối tuần x2.0, Ngày lễ x3.0"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="overtimeWeekdayRate"
                  label="Hệ số ngày thường"
                  rules={[{ required: true }]}
                >
                  <InputNumber
                    min={1.0}
                    max={5.0}
                    step={0.1}
                    style={{ width: '100%' }}
                    addonAfter="x"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="overtimeWeekendRate"
                  label="Hệ số cuối tuần"
                  rules={[{ required: true }]}
                >
                  <InputNumber
                    min={1.0}
                    max={5.0}
                    step={0.1}
                    style={{ width: '100%' }}
                    addonAfter="x"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="overtimeHolidayRate"
                  label="Hệ số ngày lễ"
                  rules={[{ required: true }]}
                >
                  <InputNumber
                    min={1.0}
                    max={5.0}
                    step={0.1}
                    style={{ width: '100%' }}
                    addonAfter="x"
                  />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="overtimeMinDuration"
              label="Thời gian tối thiểu để tính OT (giờ)"
              rules={[{ required: true }]}
            >
              <InputNumber
                min={0.5}
                max={5}
                step={0.5}
                style={{ width: '100%' }}
                addonAfter="giờ"
              />
            </Form.Item>
          </Panel>

          {/* Late Policy */}
          <Panel
            header={
              <Space>
                <ClockCircleOutlined />
                <Text strong>Chính sách đi muộn</Text>
              </Space>
            }
            key="3"
          >
            <Alert
              message="Quy định phạt khi nhân viên đi muộn"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Form.Item
              name="lateGraceMinutes"
              label="Thời gian cho phép muộn (phút)"
              rules={[{ required: true }]}
              help="Ví dụ: 15 phút = Được phép muộn tối đa 15 phút mà không bị phạt"
            >
              <InputNumber
                min={0}
                max={60}
                style={{ width: '100%' }}
                addonAfter="phút"
              />
            </Form.Item>
            <Form.Item
              name="latePenaltyAfterGrace"
              label="Tiền phạt sau khi hết thời gian cho phép (VND)"
              rules={[{ required: true }]}
            >
              <InputNumber
                min={0}
                max={1000000}
                step={10000}
                style={{ width: '100%' }}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/\$\s?|(,*)/g, '')}
                addonAfter="VND"
              />
            </Form.Item>
            <Form.Item
              name="lateHalfDayThreshold"
              label="Ngưỡng trừ 1/2 ngày công (phút)"
              rules={[{ required: true }]}
              help="Ví dụ: 60 phút = Muộn trên 1 tiếng sẽ bị trừ 1/2 ngày công"
            >
              <InputNumber
                min={0}
                max={240}
                style={{ width: '100%' }}
                addonAfter="phút"
              />
            </Form.Item>
          </Panel>

          {/* Leave Policy */}
          <Panel
            header={
              <Space>
                <CalendarOutlined />
                <Text strong>Chính sách nghỉ phép</Text>
              </Space>
            }
            key="4"
          >
            <Alert
              message="Quy định về số ngày nghỉ phép năm của nhân viên"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Form.Item
              name="leaveAnnualDays"
              label="Số ngày phép/năm"
              rules={[{ required: true }]}
              help="Thông thường là 12 ngày/năm (1 ngày/tháng)"
            >
              <InputNumber
                min={0}
                max={30}
                style={{ width: '100%' }}
                addonAfter="ngày"
              />
            </Form.Item>
            <Form.Item
              name="leaveCarryOverDays"
              label="Số ngày được chuyển sang năm sau"
              rules={[{ required: true }]}
            >
              <InputNumber
                min={0}
                max={10}
                style={{ width: '100%' }}
                addonAfter="ngày"
              />
            </Form.Item>
            <Form.Item
              name="leaveResetMonth"
              label="Tháng reset quota (1-12)"
              rules={[{ required: true }]}
              help="Tháng nào sẽ reset lại số ngày phép (thường là tháng 1)"
            >
              <InputNumber
                min={1}
                max={12}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Panel>

          {/* Auto-Checkout */}
          <Panel
            header={
              <Space>
                <ClockCircleOutlined />
                <Text strong>Tự động checkout</Text>
              </Space>
            }
            key="5"
          >
            <Alert
              message="Tự động checkout cho nhân viên quên chấm công ra"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Form.Item
              name="autoCheckoutEnabled"
              label="Bật tự động checkout"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            <Form.Item
              name="autoCheckoutTime"
              label="Giờ tự động checkout"
              rules={[{ required: true }]}
            >
              <TimePicker format="HH:mm" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="autoCheckoutAfterHours"
              label="Sau bao nhiêu giờ sẽ tự động checkout"
              rules={[{ required: true }]}
              help="Ví dụ: 2 giờ = Sau 2 tiếng không checkout sẽ tự động checkout"
            >
              <InputNumber
                min={1}
                max={12}
                style={{ width: '100%' }}
                addonAfter="giờ"
              />
            </Form.Item>
          </Panel>
        </Collapse>

        <Divider />

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={() => fetchSettings()}>
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={loading}
            >
              Lưu cấu hình
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default SystemSettings;










