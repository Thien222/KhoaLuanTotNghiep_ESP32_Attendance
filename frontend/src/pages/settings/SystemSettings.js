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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');

      // Fetch all settings types (working-hours removed - hardcoded to 08:00-17:00)
      const types = ['overtime', 'late-policy', 'leave-policy', 'auto-checkout', 'ot-rate', 'tax-config', 'salary-structure'];
      const promises = types.map(type =>
        axios.get(`${API_URL}/settings?type=${type}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(error => {
          console.error(`Error fetching setting ${type}:`, error);
          // Return a default response structure
          return { data: { success: false, data: null } };
        })
      );

      const responses = await Promise.all(promises);
      const settingsData = {};

      responses.forEach((response, index) => {
        if (response.data && response.data.success && response.data.data) {
          settingsData[types[index]] = response.data.data.value;
        } else {
          // Use defaults if fetch failed
          const defaults = {
            'overtime': { weekdayRate: 1.5, weekendRate: 2.0, holidayRate: 3.0, minDuration: 1 },
            'late-policy': { graceMinutes: 15, penaltyAfterGrace: 50000, halfDayThreshold: 60 },
            'leave-policy': { annualDays: 12, carryOverDays: 3, resetMonth: 1 },
            'auto-checkout': { enabled: true, defaultTime: '17:00', applyAfterHours: 2 },
            'ot-rate': { ratePerHour: 100000, startTime: '19:00' },
            'salary-structure': { generalAllowanceRate: 5 }
          };
          if (defaults[types[index]]) {
            settingsData[types[index]] = defaults[types[index]];
          }
        }
      });

      setSettings(settingsData);

      // Set form values
      form.setFieldsValue({
        // Working hours: HARDCODED to 08:00-17:00 (removed from settings)

        // Overtime
        overtimeWeekdayRate: settingsData['overtime']?.weekdayRate || 1.5,
        overtimeWeekendRate: settingsData['overtime']?.weekendRate || 2.0,
        overtimeHolidayRate: settingsData['overtime']?.holidayRate || 3.0,
        overtimeMinDuration: settingsData['overtime']?.minDuration || 1,

        // Late policy
        latePenaltyRate: settingsData['late-policy']?.penaltyRate || 20000,
        latePenaltyInterval: settingsData['late-policy']?.penaltyInterval || 15,
        lateThreshold2Hours: settingsData['late-policy']?.lateThreshold2Hours || 120,

        // Leave policy
        leaveAnnualDays: settingsData['leave-policy']?.annualDays || 12,
        leaveCarryOverDays: settingsData['leave-policy']?.carryOverDays || 3,
        leaveResetMonth: settingsData['leave-policy']?.resetMonth || 1,

        // Auto-checkout
        autoCheckoutEnabled: settingsData['auto-checkout']?.enabled || true,
        autoCheckoutTime: settingsData['auto-checkout']?.defaultTime ? moment(settingsData['auto-checkout'].defaultTime, 'HH:mm') : moment('17:00', 'HH:mm'),
        autoCheckoutAfterHours: settingsData['auto-checkout']?.applyAfterHours || 2,

        // OT Rate (NEW)
        otRatePerHour: settingsData['ot-rate']?.ratePerHour || 100000,
        otStartTime: settingsData['ot-rate']?.startTime ? moment(settingsData['ot-rate'].startTime, 'HH:mm') : moment('19:00', 'HH:mm'),


        // Allowance Config (NEW)
        generalAllowanceRate: settingsData['salary-structure']?.generalAllowanceRate || 5,
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

      // Prepare settings updates with default values for optional fields
      // Working hours: HARDCODED to 08:00-17:00 (removed from settings)
      const updates = [
        {
          type: 'overtime',
          value: {
            weekdayRate: values.overtimeWeekdayRate || 1.5,
            weekendRate: values.overtimeWeekendRate || 2.0,
            holidayRate: values.overtimeHolidayRate || 3.0,
            minDuration: values.overtimeMinDuration || 1,
            maxTime: '23:30',
            roundingRule: 'hour'
          }
        },
        {
          type: 'late-policy',
          value: {
            penaltyRate: values.latePenaltyRate || 20000,
            penaltyInterval: values.latePenaltyInterval || 15,
            lateThreshold2Hours: values.lateThreshold2Hours || 120,
            penaltyPerMinute: 0
          }
        },
        {
          type: 'leave-policy',
          value: {
            annualDays: values.leaveAnnualDays || 12,
            carryOverDays: values.leaveCarryOverDays || 3,
            resetMonth: values.leaveResetMonth || 1
          }
        },
        {
          type: 'auto-checkout',
          value: {
            enabled: values.autoCheckoutEnabled !== false,
            defaultTime: values.autoCheckoutTime?.format('HH:mm') || '17:00',
            applyAfterHours: values.autoCheckoutAfterHours || 2
          }
        },
        // OT Rate
        {
          type: 'ot-rate',
          value: {
            enabled: true,
            ratePerHour: values.otRatePerHour || 100000,
            calculationType: 'fixed',
            percentage: 0,
            startTime: values.otStartTime?.format('HH:mm') || '19:00',
            breakTime: {
              start: '18:00',
              end: '18:59'
            }
          }
        },
        // Salary Structure (Update allowance rate)
        {
          type: 'salary-structure',
          value: {
            generalAllowanceRate: values.generalAllowanceRate || 5,
            // Keep existing values from defaults
            positionBaseSalary: settings['salary-structure']?.positionBaseSalary || {},
            positionOvertimeMultiplier: settings['salary-structure']?.positionOvertimeMultiplier || {},
            seniorityPolicy: settings['salary-structure']?.seniorityPolicy || { percentPerYear: 2, maxPercent: 20 },
            positionAllowance: settings['salary-structure']?.positionAllowance || {},
            contractMultiplier: settings['salary-structure']?.contractMultiplier || {}
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
    <div>
      <div style={{ marginBottom: 8 }}>
        <Title level={5} style={{ margin: '0 0 4px 0' }}>
          <SettingOutlined style={{ marginRight: 6 }} />
          Cấu hình hệ thống
        </Title>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Cấu hình các chính sách về OT, đi muộn, nghỉ phép (Giờ làm việc: 08:00-17:00 cố định)
        </Text>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
      >
        <Collapse 
          defaultActiveKey={['2', '2b', '2c', '3', '4', '5']} 
          accordion={false}
          style={{ marginBottom: 8 }}
        >
          {/* Working Hours: HARDCODED to 08:00-17:00 (removed from UI) */}

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
              style={{ marginBottom: 6 }}
              size="small"
            />
            <Row gutter={8}>
              <Col span={8}>
                <Form.Item
                  name="overtimeWeekdayRate"
                  label="Hệ số ngày thường"
                >
                  <InputNumber
                    min={1.0}
                    max={5.0}
                    step={0.1}
                    style={{ width: '100%' }}
                    addonAfter="x"
                    placeholder="1.5"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="overtimeWeekendRate"
                  label="Hệ số cuối tuần"
                >
                  <InputNumber
                    min={1.0}
                    max={5.0}
                    step={0.1}
                    style={{ width: '100%' }}
                    addonAfter="x"
                    placeholder="2.0"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="overtimeHolidayRate"
                  label="Hệ số ngày lễ"
                >
                  <InputNumber
                    min={1.0}
                    max={5.0}
                    step={0.1}
                    style={{ width: '100%' }}
                    addonAfter="x"
                    placeholder="3.0"
                  />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="overtimeMinDuration"
              label="Thời gian tối thiểu để tính OT (giờ)"
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

          {/* NEW: OT Rate Panel */}
          <Panel
            header={
              <Space>
                <DollarOutlined />
                <Text strong>Cấu hình OT (Mới)</Text>
              </Space>
            }
            key="2b"
          >
            <Alert
              message="Cấu hình mức lương OT cố định: 100k VND/1h (mặc định). OT bắt đầu từ 19h00."
              type="success"
              showIcon
              style={{ marginBottom: 6 }}
              size="small"
            />
            <Row gutter={8}>
              <Col span={12}>
                <Form.Item
                  name="otRatePerHour"
                  label="Mức lương OT (VND/giờ)"
                  help="Lương OT cố định cho mỗi giờ làm thêm"
                >
                  <InputNumber
                    min={50000}
                    max={500000}
                    step={10000}
                    style={{ width: '100%' }}
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/\$\s?|(,*)/g, '')}
                    addonAfter="VND/h"
                    placeholder="100,000"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="otStartTime"
                  label="Giờ bắt đầu tính OT"
                  help="18h00-18h59 không tính OT, từ 19h00 mới tính"
                >
                  <TimePicker format="HH:mm" style={{ width: '100%' }} placeholder="19:00" />
                </Form.Item>
              </Col>
            </Row>
          </Panel>

          {/* NEW: Allowance Config Panel */}
          <Panel
            header={
              <Space>
                <DollarOutlined />
                <Text strong>Phụ cấp</Text>
              </Space>
            }
            key="2d"
          >
            <Alert
              message="Phụ cấp được tính theo % của lương cơ bản. Áp dụng cho tất cả nhân viên."
              type="info"
              showIcon
              style={{ marginBottom: 6 }}
              size="small"
            />
            <Row gutter={8}>
              <Col span={12}>
                <Form.Item
                  name="generalAllowanceRate"
                  label="Tỷ lệ phụ cấp chung (%)"
                  help="Tỷ lệ % của lương cơ bản. Ví dụ: 5% = 5% lương cơ bản"
                >
                  <InputNumber
                    min={0}
                    max={50}
                    step={0.5}
                    style={{ width: '100%' }}
                    addonAfter="%"
                    placeholder="5"
                  />
                </Form.Item>
              </Col>
            </Row>
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
              style={{ marginBottom: 6 }}
              size="small"
            />
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="latePenaltyRate"
                  label="Tiền phạt mỗi block (VND)"
                  help="Phạt cho mỗi khoảng thời gian (ví dụ: 20,000đ/15 phút)"
                >
                  <InputNumber
                    min={0}
                    max={1000000}
                    step={5000}
                    style={{ width: '100%' }}
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/\$\s?|(,*)/g, '')}
                    addonAfter="VND"
                    placeholder="20,000"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="latePenaltyInterval"
                  label="Khoảng thời gian tính phạt (phút)"
                  help="Mỗi khoảng này = 1 block phạt (ví dụ: 15 phút)"
                >
                  <InputNumber
                    min={1}
                    max={60}
                    style={{ width: '100%' }}
                    addonAfter="phút"
                    placeholder="15"
                  />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="lateThreshold2Hours"
              label="Ngưỡng mất ngày công (phút)"
              help="Ví dụ: 120 phút = Muộn ≥ 2 giờ sẽ mất cả ngày công"
            >
              <InputNumber
                min={60}
                max={480}
                style={{ width: '100%' }}
                addonAfter="phút"
                placeholder="120"
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
              style={{ marginBottom: 6 }}
              size="small"
            />
            <Form.Item
              name="leaveAnnualDays"
              label="Số ngày phép/năm"
              help="Thông thường là 12 ngày/năm (1 ngày/tháng)"
            >
              <InputNumber
                min={0}
                max={30}
                style={{ width: '100%' }}
                addonAfter="ngày"
                placeholder="12"
              />
            </Form.Item>
            <Form.Item
              name="leaveCarryOverDays"
              label="Số ngày được chuyển sang năm sau"
            >
              <InputNumber
                min={0}
                max={10}
                style={{ width: '100%' }}
                addonAfter="ngày"
                placeholder="3"
              />
            </Form.Item>
            <Form.Item
              name="leaveResetMonth"
              label="Tháng reset quota (1-12)"
              help="Tháng nào sẽ reset lại số ngày phép (thường là tháng 1)"
            >
              <InputNumber
                min={1}
                max={12}
                style={{ width: '100%' }}
                placeholder="1"
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
              style={{ marginBottom: 6 }}
              size="small"
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
            >
              <TimePicker format="HH:mm" style={{ width: '100%' }} placeholder="17:00" />
            </Form.Item>
            <Form.Item
              name="autoCheckoutAfterHours"
              label="Sau bao nhiêu giờ sẽ tự động checkout"
              help="Ví dụ: 2 giờ = Sau 2 tiếng không checkout sẽ tự động checkout"
            >
              <InputNumber
                min={1}
                max={12}
                style={{ width: '100%' }}
                addonAfter="giờ"
                placeholder="2"
              />
            </Form.Item>
          </Panel>
        </Collapse>

        <div style={{ 
          position: 'sticky', 
          bottom: 0, 
          background: '#fff', 
          padding: '16px 0',
          borderTop: '1px solid #f0f0f0',
          marginTop: 16
        }}>
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
        </div>
      </Form>
    </div>
  );
};

export default SystemSettings;










