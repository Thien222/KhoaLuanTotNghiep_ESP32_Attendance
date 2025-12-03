/**
 * DEMO MODE - Quick Attendance Testing
 * Quy trình: Chọn nhân viên → Chọn ngày → Chọn timeline → Tương tác ESP32 → Xem kết quả
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Button,
  Select,
  DatePicker,
  Space,
  Alert,
  Tag,
  Row,
  Col,
  Steps,
  message,
  Statistic,
  Divider,
  Badge
} from 'antd';
import {
  UserOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  CloseCircleOutlined,
  WifiOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { getAPIUrl, getESP32Url } from '../../utils/configManager';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Step } = Steps;

const DemoMode = () => {
  const navigate = useNavigate();
  
  // Step 1: Chọn nhân viên & ngày
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedDate, setSelectedDate] = useState(moment().subtract(1, 'days'));
  
  // Step 2: Timeline scenarios
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTimeline, setSelectedTimeline] = useState(null);
  
  // Step 3: ESP32 connection
  const [esp32Connected, setEsp32Connected] = useState(false);
  const [lastAttendance, setLastAttendance] = useState(null);
  const [checkingESP32, setCheckingESP32] = useState(false);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [timeMachineActive, setTimeMachineActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // Settings state
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    fetchEmployees();
    checkESP32Connection();
    checkTimeMachineStatus();
    fetchSettings();
    
    // Auto-check ESP32 every 10 seconds
    const interval = setInterval(() => {
      checkESP32Connection();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchEmployees = async () => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setEmployees(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      message.error('Không thể tải danh sách nhân viên');
    }
  };

  const checkESP32Connection = async () => {
    setCheckingESP32(true);
    try {
      const esp32Url = getESP32Url();
      const response = await axios.get(`${esp32Url}/healthz`, { timeout: 3000 });
      setEsp32Connected(response.status === 200);
    } catch (error) {
      setEsp32Connected(false);
    } finally {
      setCheckingESP32(false);
    }
  };

  const checkTimeMachineStatus = async () => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/timemachine/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setTimeMachineActive(response.data.data.active);
      }
    } catch (error) {
      console.error('Error checking time machine:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      // Fetch required settings types
      const types = ['working-hours', 'late-policy', 'ot-rate', 'early-checkin'];
      const promises = types.map(type =>
        axios.get(`${API_URL}/settings?type=${type}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(error => {
          console.error(`Error fetching setting ${type}:`, error);
          return { data: { success: false, data: null } };
        })
      );

      const responses = await Promise.all(promises);
      const settingsData = {};

      responses.forEach((response, index) => {
        if (response.data && response.data.success && response.data.data) {
          // Backend returns: { success: true, data: { type, value: config, ... } }
          const config = response.data.data.value || response.data.data.config || response.data.data;
          settingsData[types[index]] = config;
          
          // Debug log
          if (types[index] === 'working-hours') {
            console.log('📊 [DemoMode] Fetched working-hours:', config);
          }
        } else {
          console.warn(`⚠️ [DemoMode] Setting ${types[index]} not found or failed`);
        }
      });

      // Fill missing settings with defaults
      if (!settingsData['working-hours']) {
        settingsData['working-hours'] = { startTime: '08:00', endTime: '17:00' };
      }
      if (!settingsData['late-policy']) {
        settingsData['late-policy'] = { penaltyRate: 20000, penaltyInterval: 15, lateThreshold2Hours: 120 };
      }
      if (!settingsData['ot-rate']) {
        settingsData['ot-rate'] = { startTime: '19:00', ratePerHour: 100000 };
      }
      if (!settingsData['early-checkin']) {
        settingsData['early-checkin'] = { bufferMinutes: 60 };
      }

      console.log('✅ [DemoMode] Settings loaded:', {
        startTime: settingsData['working-hours'].startTime,
        endTime: settingsData['working-hours'].endTime
      });

      setSettings(settingsData);
    } catch (error) {
      console.error('❌ [DemoMode] Error fetching settings:', error);
      // Use defaults on error
      setSettings({
        'working-hours': { startTime: '08:00', endTime: '17:00' },
        'late-policy': { penaltyRate: 20000, penaltyInterval: 15, lateThreshold2Hours: 120 },
        'ot-rate': { startTime: '19:00', ratePerHour: 100000 },
        'early-checkin': { bufferMinutes: 60 }
      });
    }
  };

  // Helper function to calculate gate close time (startTime + 15 minutes grace)
  const calculateGateClose = (startTime) => {
    const [hour, min] = startTime.split(':').map(Number);
    const gateClose = moment().hour(hour).minute(min).add(15, 'minutes');
    return gateClose.format('HH:mm');
  };

  // Helper function to add minutes to time string
  const addMinutesToTime = (timeStr, minutes) => {
    const [hour, min] = timeStr.split(':').map(Number);
    const newTime = moment().hour(hour).minute(min).add(minutes, 'minutes');
    return newTime.format('HH:mm');
  };

  // Calculate timeline scenarios dynamically based on settings
  const getTimelineScenarios = () => {
    // Default values if settings not loaded yet
    const workHours = settings?.['working-hours'] || { startTime: '08:00', endTime: '17:00' };
    const latePolicy = settings?.['late-policy'] || { penaltyRate: 20000, penaltyInterval: 15, lateThreshold2Hours: 120 };
    const otRate = settings?.['ot-rate'] || { startTime: '19:00', ratePerHour: 100000 };
    const earlyCheckin = settings?.['early-checkin'] || { bufferMinutes: 60 };

    const startTime = workHours.startTime || '08:00';
    const endTime = workHours.endTime || '17:00';
    const gateClose = calculateGateClose(startTime); // e.g., 08:15 if startTime is 08:00
    const otStart = otRate.startTime || '19:00';
    const bufferMinutes = earlyCheckin.bufferMinutes || 60;
    
    // Calculate gate open (startTime - bufferMinutes)
    const gateOpen = addMinutesToTime(startTime, -bufferMinutes); // e.g., 07:00 if startTime is 08:00 and buffer is 60

    // Calculate checkout gate open (endTime - 15 minutes)
    const checkoutGateOpen = addMinutesToTime(endTime, -15); // e.g., 16:45 if endTime is 17:00

    // Calculate a time in the middle of valid check-in window (gateOpen to gateClose)
    const onTimeCheckin = addMinutesToTime(gateOpen, Math.floor((bufferMinutes + 15) / 2)); // Middle of valid window

    return [
      // Check-in scenarios
      {
        id: 'checkin-ontime',
        category: 'checkin',
        label: '✅ Check-in Đúng Giờ',
        time: onTimeCheckin,
        description: `Đến đúng giờ (${onTimeCheckin})`,
        color: 'success',
        scenario: 'on-time'
      },
      {
        id: 'checkin-grace',
        category: 'checkin',
        label: '⏰ Check-in Grace Period',
        time: addMinutesToTime(gateClose, -2), // 2 minutes before gate close
        description: `Trong grace period (${addMinutesToTime(gateClose, -2)})`,
        color: 'processing',
        scenario: 'grace-period'
      },
      {
        id: 'checkin-late-15',
        category: 'checkin',
        label: '⚠️ Check-in Trễ 15 Phút',
        time: addMinutesToTime(gateClose, 15), // 15 minutes after gate close
        description: `Muộn 15 phút (${addMinutesToTime(gateClose, 15)})`,
        color: 'warning',
        scenario: 'late-15min'
      },
      {
        id: 'checkin-late-1h',
        category: 'checkin',
        label: '⚠️ Check-in Trễ 1h',
        time: addMinutesToTime(gateClose, 60), // 1 hour after gate close
        description: `Muộn 1 giờ (${addMinutesToTime(gateClose, 60)})`,
        color: 'warning',
        scenario: 'late-1h'
      },
      {
        id: 'checkin-late-2h',
        category: 'checkin',
        label: '❌ Check-in Trễ >= 2h',
        time: addMinutesToTime(gateClose, latePolicy.lateThreshold2Hours || 120), // 2 hours after gate close
        description: `Muộn 2 giờ, mất ngày công (${addMinutesToTime(gateClose, latePolicy.lateThreshold2Hours || 120)})`,
        color: 'error',
        scenario: 'late-2h'
      },
      
      // Checkout scenarios
      {
        id: 'checkout-ontime',
        category: 'checkout',
        label: '✅ Check-out Đúng Giờ',
        time: endTime,
        description: `Về đúng giờ (${endTime})`,
        color: 'success',
        scenario: 'checkout-ontime'
      },
      {
        id: 'checkout-early',
        category: 'checkout',
        label: '⚠️ Check-out Sớm',
        time: addMinutesToTime(checkoutGateOpen, -15), // 15 minutes before checkout gate open
        description: `Về sớm (${addMinutesToTime(checkoutGateOpen, -15)})`,
        color: 'warning',
        scenario: 'checkout-early'
      },
      {
        id: 'checkout-no-ot',
        category: 'checkout',
        label: '⏰ Check-out Trước OT',
        time: addMinutesToTime(otStart, -30), // 30 minutes before OT start
        description: `Về muộn nhưng chưa tính OT (${addMinutesToTime(otStart, -30)})`,
        color: 'processing',
        scenario: 'checkout-no-ot'
      },
      {
        id: 'checkout-ot-1h',
        category: 'checkout',
        label: '💰 Check-out OT 1h',
        time: addMinutesToTime(otStart, 60), // 1 hour after OT start
        description: `Tăng ca 1 giờ (${addMinutesToTime(otStart, 60)})`,
        color: 'cyan',
        scenario: 'checkout-ot-1h'
      },
      {
        id: 'checkout-ot-3h',
        category: 'checkout',
        label: '💰 Check-out OT 3h',
        time: addMinutesToTime(otStart, 180), // 3 hours after OT start
        description: `Tăng ca 3 giờ (${addMinutesToTime(otStart, 180)})`,
        color: 'purple',
        scenario: 'checkout-ot-3h'
      }
    ];
  };

  // Use dynamic scenarios if settings loaded, otherwise use defaults
  const timelineScenarios = settings ? getTimelineScenarios() : [
    // Fallback defaults (same as before but will be replaced when settings load)
    {
      id: 'checkin-ontime',
      category: 'checkin',
      label: '✅ Check-in Đúng Giờ',
      time: '07:50',
      description: 'Đến đúng giờ (7h50)',
      color: 'success',
      scenario: 'on-time'
    },
    {
      id: 'checkin-late-15',
      category: 'checkin',
      label: '⚠️ Check-in Trễ 15 Phút',
      time: '08:20',
      description: 'Muộn 15 phút (8h20)',
      color: 'warning',
      scenario: 'late-15min'
    },
    {
      id: 'checkin-late-2h',
      category: 'checkin',
      label: '❌ Check-in Trễ >= 2h',
      time: '10:05',
      description: 'Muộn 2 giờ, mất ngày công (10h05)',
      color: 'error',
      scenario: 'late-2h'
    },
    {
      id: 'checkout-ontime',
      category: 'checkout',
      label: '✅ Check-out Đúng Giờ',
      time: '17:00',
      description: 'Về đúng giờ (17h00)',
      color: 'success',
      scenario: 'checkout-ontime'
    },
    {
      id: 'checkout-ot-1h',
      category: 'checkout',
      label: '💰 Check-out OT 1h',
      time: '20:00',
      description: 'Tăng ca 1 giờ (20h00)',
      color: 'cyan',
      scenario: 'checkout-ot-1h'
    },
    {
      id: 'checkout-ot-3h',
      category: 'checkout',
      label: '💰 Check-out OT 3h',
      time: '22:00',
      description: 'Tăng ca 3 giờ (22h00)',
      color: 'purple',
      scenario: 'checkout-ot-3h'
    }
  ];

  const handleSelectEmployee = (employeeId) => {
    const employee = employees.find(e => e._id === employeeId);
    setSelectedEmployee(employee);
    setCurrentStep(0);
    setSelectedTimeline(null);
    setLastAttendance(null);
    setErrorMessage(null); // Clear error when selecting new employee
  };

  const handleSelectDate = (date) => {
    setSelectedDate(date);
  };

  const handleConfirmEmployeeDate = () => {
    if (!selectedEmployee) {
      message.error('Vui lòng chọn nhân viên');
      return;
    }
    setCurrentStep(1);
  };

  const handleSelectTimeline = async (timeline) => {
    setSelectedTimeline(timeline);
    setLoading(true);
    
    try {
      // Combine selected date with timeline time
      const targetDateTime = selectedDate.clone()
        .hour(parseInt(timeline.time.split(':')[0]))
        .minute(parseInt(timeline.time.split(':')[1]))
        .second(0);
      
      // Set Time Machine
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      // Option 1: Use scenario endpoint
      const response = await axios.post(
        `${API_URL}/timemachine/scenario`,
        { scenario: timeline.scenario },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        // Override with custom date
        await axios.post(
          `${API_URL}/timemachine/set`,
          { datetime: targetDateTime.toISOString() },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        setTimeMachineActive(true);
        message.success(`✅ Đã set thời gian: ${targetDateTime.format('DD/MM/YYYY HH:mm')}`);
        setCurrentStep(2);
        
        // Check if employee has attendance for this date
        await fetchLastAttendance();
      }
    } catch (error) {
      console.error('Error setting time:', error);
      message.error('Lỗi khi set thời gian');
    } finally {
      setLoading(false);
    }
  };

  const fetchLastAttendance = async () => {
    if (!selectedEmployee || !selectedDate) return;
    
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        `${API_URL}/attendance?startDate=${selectedDate.format('YYYY-MM-DD')}&endDate=${selectedDate.format('YYYY-MM-DD')}&employeeId=${selectedEmployee._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success && response.data.data.length > 0) {
        setLastAttendance(response.data.data[0]);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const handleResetTimeMachine = async () => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      await axios.post(
        `${API_URL}/timemachine/reset`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setTimeMachineActive(false);
      message.success('Đã reset về thời gian thật');
      setSelectedTimeline(null);
      setCurrentStep(1);
    } catch (error) {
      message.error('Lỗi khi reset');
    }
  };

  const handleViewPayroll = () => {
    navigate('/payroll');
  };

  const handleRefresh = () => {
    fetchLastAttendance();
    checkESP32Connection();
    checkTimeMachineStatus();
    fetchSettings(); // Re-fetch settings when refreshing
  };

  const selectedEmp = selectedEmployee;
  const checkinScenarios = timelineScenarios.filter(s => s.category === 'checkin');
  const checkoutScenarios = timelineScenarios.filter(s => s.category === 'checkout');

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0 }}>
            🚀 Demo Mode - Chấm Công Nhanh
          </Title>
          <Text type="secondary">
            Chọn nhân viên → Chọn ngày → Chọn timeline → Tương tác ESP32 → Xem kết quả
          </Text>
        </div>

        {/* Steps */}
        <Steps current={currentStep} style={{ marginBottom: 32 }}>
          <Step title="Chọn Nhân Viên & Ngày" icon={<UserOutlined />} />
          <Step title="Chọn Timeline" icon={<ClockCircleOutlined />} />
          <Step title="Tương Tác ESP32" icon={<ThunderboltOutlined />} />
        </Steps>

        {/* Alert */}
        <Alert
          message="📌 Demo Mode"
          description="Dữ liệu được lưu thực tế vào database với thời gian đã chọn. Phù hợp để demo và tạo dữ liệu test nhanh."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        {/* Step 0: Select Employee & Date */}
        {currentStep >= 0 && (
          <Card 
            title={<span><UserOutlined /> Bước 1: Chọn Nhân Viên & Ngày</span>}
            style={{ marginBottom: 24 }}
            extra={selectedEmp && <Tag color="green">{selectedEmp.name}</Tag>}
          >
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ marginBottom: 8 }}>
                  <Text strong>Chọn Nhân Viên</Text>
                </div>
                <Select
                  placeholder="Chọn nhân viên"
                  style={{ width: '100%' }}
                  value={selectedEmp?._id}
                  onChange={handleSelectEmployee}
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    option.children.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {employees.map((emp) => (
                    <Option key={emp._id} value={emp._id}>
                      {emp.name} ({emp.employeeId}) - {emp.position}
                    </Option>
                  ))}
                </Select>
              </Col>
              
              <Col span={12}>
                <div style={{ marginBottom: 8 }}>
                  <Text strong>Chọn Ngày</Text>
                </div>
                <DatePicker
                  style={{ width: '100%' }}
                  format="DD/MM/YYYY"
                  value={selectedDate}
                  onChange={handleSelectDate}
                  disabledDate={(current) => {
                    // Không cho chọn ngày trong tương lai
                    return current && current > moment().endOf('day');
                  }}
                />
              </Col>
            </Row>

            {selectedEmp && (
              <>
                <Divider />
                <Alert
                  message={
                    <div>
                      <Text strong>{selectedEmp.name}</Text>
                      <br />
                      <Text type="secondary">
                        Mã NV: {selectedEmp.employeeId} | 
                        Chức vụ: {selectedEmp.position} | 
                        Lương CB: {selectedEmp.baseSalary?.toLocaleString('vi-VN')} VND
                        {selectedEmp.fingerprintEnrolled && <Tag color="green" style={{ marginLeft: 8 }}>Đã Enroll</Tag>}
                        {!selectedEmp.fingerprintEnrolled && <Tag color="red" style={{ marginLeft: 8 }}>Chưa Enroll</Tag>}
                      </Text>
                    </div>
                  }
                  type={selectedEmp.fingerprintEnrolled ? "success" : "warning"}
                  style={{ marginTop: 16 }}
                />
                
                {!selectedEmp.fingerprintEnrolled && (
                  <Alert
                    message="⚠️ Nhân viên chưa enroll vân tay!"
                    description={
                      <div>
                        <Paragraph style={{ marginBottom: 8 }}>
                          <Text strong>Vấn đề:</Text> Nhân viên này chưa enroll vân tay trên ESP32.
                        </Paragraph>
                        <Paragraph style={{ marginBottom: 8 }}>
                          <Text strong>Giải pháp:</Text>
                        </Paragraph>
                        <Paragraph style={{ marginBottom: 4, marginLeft: 16 }}>
                          1. Vào menu <Text strong>"Quản lý ESP32"</Text> hoặc <Text strong>"Quản lý nhân sự"</Text>
                        </Paragraph>
                        <Paragraph style={{ marginBottom: 4, marginLeft: 16 }}>
                          2. Tìm nhân viên <Text strong>{selectedEmp.name}</Text> (Fingerprint ID: <Text strong>{selectedEmp.fingerprintId || 'N/A'}</Text>)
                        </Paragraph>
                        <Paragraph style={{ marginBottom: 4, marginLeft: 16 }}>
                          3. Click <Text strong>"Enroll Vân Tay"</Text> hoặc gọi API: <Text code>GET /api/enroll?id={selectedEmp.fingerprintId}</Text>
                        </Paragraph>
                        <Paragraph style={{ marginBottom: 0, marginLeft: 16 }}>
                          4. Đặt ngón tay lên ESP32 khi được yêu cầu
                        </Paragraph>
                      </div>
                    }
                    type="error"
                    showIcon
                    style={{ marginTop: 16 }}
                  />
                )}
                
                <Button
                  type="primary"
                  size="large"
                  onClick={handleConfirmEmployeeDate}
                  style={{ marginTop: 16 }}
                  block
                  disabled={!selectedEmp.fingerprintEnrolled}
                >
                  {selectedEmp.fingerprintEnrolled ? 'Tiếp Theo: Chọn Timeline' : '⚠️ Cần Enroll Vân Tay Trước'}
                </Button>
              </>
            )}
          </Card>
        )}

        {/* Step 1: Select Timeline */}
        {currentStep >= 1 && selectedEmp && (
          <Card 
            title={<span><ClockCircleOutlined /> Bước 2: Chọn Timeline</span>}
            style={{ marginBottom: 24 }}
            extra={
              selectedTimeline && (
                <Tag color={selectedTimeline.color}>
                  {selectedTimeline.time}
                </Tag>
              )
            }
          >
            <div style={{ marginBottom: 16 }}>
              <Row justify="space-between" align="middle">
                <Col>
                  <Text type="secondary">
                    Ngày đã chọn: <Text strong>{selectedDate.format('DD/MM/YYYY')}</Text>
                  </Text>
                  {settings && (
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        ⚙️ Giờ test được tính từ Settings: 
                        Bắt đầu: <Text strong>{settings['working-hours']?.startTime || '08:00'}</Text>, 
                        Kết thúc: <Text strong>{settings['working-hours']?.endTime || '17:00'}</Text>
                      </Text>
                    </div>
                  )}
                </Col>
                <Col>
                  <Button 
                    size="small" 
                    icon={<ReloadOutlined />} 
                    onClick={fetchSettings}
                    title="Làm mới Settings"
                  >
                    Refresh Settings
                  </Button>
                </Col>
              </Row>
            </div>

            {/* Check-in Scenarios */}
            <div style={{ marginBottom: 24 }}>
              <Title level={5}>📥 Check-in Scenarios</Title>
              <Row gutter={[8, 8]}>
                {checkinScenarios.map((timeline) => (
                  <Col span={12} key={timeline.id}>
                    <Button
                      block
                      size="large"
                      style={{
                        height: 'auto',
                        padding: '12px',
                        textAlign: 'left',
                        borderColor: selectedTimeline?.id === timeline.id ? '#52c41a' : undefined,
                        backgroundColor: selectedTimeline?.id === timeline.id ? '#f6ffed' : undefined
                      }}
                      onClick={() => handleSelectTimeline(timeline)}
                      loading={loading && selectedTimeline?.id === timeline.id}
                    >
                      <div>
                        <div>
                          <Tag color={timeline.color}>{timeline.time}</Tag>
                          <Text strong>{timeline.label}</Text>
                        </div>
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {timeline.description}
                          </Text>
                        </div>
                      </div>
                    </Button>
                  </Col>
                ))}
              </Row>
            </div>

            {/* Check-out Scenarios */}
            <div>
              <Title level={5}>📤 Check-out Scenarios</Title>
              <Row gutter={[8, 8]}>
                {checkoutScenarios.map((timeline) => (
                  <Col span={12} key={timeline.id}>
                    <Button
                      block
                      size="large"
                      style={{
                        height: 'auto',
                        padding: '12px',
                        textAlign: 'left',
                        borderColor: selectedTimeline?.id === timeline.id ? '#52c41a' : undefined,
                        backgroundColor: selectedTimeline?.id === timeline.id ? '#f6ffed' : undefined
                      }}
                      onClick={() => handleSelectTimeline(timeline)}
                      loading={loading && selectedTimeline?.id === timeline.id}
                    >
                      <div>
                        <div>
                          <Tag color={timeline.color}>{timeline.time}</Tag>
                          <Text strong>{timeline.label}</Text>
                        </div>
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {timeline.description}
                          </Text>
                        </div>
                      </div>
                    </Button>
                  </Col>
                ))}
              </Row>
            </div>

            {timeMachineActive && (
              <Alert
                message="⏰ Time Machine đang hoạt động"
                description={`Thời gian hệ thống: ${selectedDate.format('DD/MM/YYYY')} ${selectedTimeline?.time || ''}`}
                type="success"
                showIcon
                style={{ marginTop: 16 }}
                action={
                  <Button size="small" onClick={handleResetTimeMachine}>
                    Reset
                  </Button>
                }
              />
            )}
          </Card>
        )}

        {/* Step 2: ESP32 Interaction */}
        {currentStep >= 2 && selectedEmp && selectedTimeline && (
          <Card 
            title={<span><ThunderboltOutlined /> Bước 3: Tương Tác ESP32</span>}
            style={{ marginBottom: 24 }}
            extra={
              <Badge status={esp32Connected ? 'success' : 'error'} text={esp32Connected ? 'Kết nối' : 'Mất kết nối'} />
            }
          >
            {/* ESP32 Status */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Trạng Thái ESP32"
                    value={esp32Connected ? 'Kết nối' : 'Mất kết nối'}
                    prefix={esp32Connected ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                    valueStyle={{ color: esp32Connected ? '#3f8600' : '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Thời Gian Đã Set"
                    value={selectedTimeline.time}
                    prefix={<ClockCircleOutlined />}
                    suffix={selectedDate.format('DD/MM/YYYY')}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Action"
                    value={selectedTimeline.category === 'checkin' ? 'Check-in' : 'Check-out'}
                    prefix={<ThunderboltOutlined />}
                    valueStyle={{ color: selectedTimeline.category === 'checkin' ? '#1890ff' : '#52c41a' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Instructions */}
            <Alert
              message="🖐️ Hướng Dẫn"
              description={
                <div>
                  <Paragraph style={{ marginBottom: 8 }}>
                    1. <Text strong>Đặt ngón tay</Text> lên cảm biến vân tay ESP32
                  </Paragraph>
                  <Paragraph style={{ marginBottom: 8 }}>
                    2. ESP32 sẽ <Text strong>nhận diện vân tay</Text> và gửi dữ liệu về backend
                  </Paragraph>
                  <Paragraph style={{ marginBottom: 8 }}>
                    3. Dữ liệu được lưu với <Text strong>thời gian đã chọn</Text>: {selectedDate.format('DD/MM/YYYY')} {selectedTimeline.time}
                  </Paragraph>
                  <Paragraph style={{ marginBottom: 0 }}>
                    4. ESP32 sẽ hiển thị <Text strong>thông báo</Text> (check-in/check-out, trễ, OT...)
                  </Paragraph>
                </div>
              }
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />

            {!esp32Connected && (
              <Alert
                message="❌ ESP32 Chưa Kết Nối"
                description="Vui lòng kiểm tra ESP32 đã bật và kết nối mạng chưa."
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
                action={
                  <Button size="small" onClick={checkESP32Connection} loading={checkingESP32}>
                    Kiểm Tra Lại
                  </Button>
                }
              />
            )}

            {/* Error Message from ESP32/Backend */}
            {errorMessage && (
              <Alert
                message="❌ Lỗi Khi Chấm Công"
                description={
                  <div>
                    <Paragraph style={{ marginBottom: 8 }}>
                      <Text strong>Lỗi:</Text> {errorMessage.message || errorMessage}
                    </Paragraph>
                    {errorMessage.fingerId && (
                      <Paragraph style={{ marginBottom: 8 }}>
                        <Text strong>Fingerprint ID:</Text> {errorMessage.fingerId}
                      </Paragraph>
                    )}
                    {errorMessage.what === 'enroll-required' && (
                      <div>
                        <Paragraph style={{ marginBottom: 4 }}>
                          <Text strong>Giải pháp:</Text>
                        </Paragraph>
                        <Paragraph style={{ marginBottom: 4, marginLeft: 16 }}>
                          1. Vào menu <Text strong>"Quản lý ESP32"</Text>
                        </Paragraph>
                        <Paragraph style={{ marginBottom: 4, marginLeft: 16 }}>
                          2. Tìm nhân viên với Fingerprint ID: <Text strong>{errorMessage.fingerId}</Text>
                        </Paragraph>
                        <Paragraph style={{ marginBottom: 4, marginLeft: 16 }}>
                          3. Click <Text strong>"Enroll Vân Tay"</Text> hoặc gọi: <Text code>GET /api/enroll?id={errorMessage.fingerId}</Text>
                        </Paragraph>
                        <Paragraph style={{ marginBottom: 0, marginLeft: 16 }}>
                          4. Đặt ngón tay lên ESP32 khi được yêu cầu
                        </Paragraph>
                      </div>
                    )}
                    {errorMessage.suggestion && (
                      <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                        <Text type="secondary">{errorMessage.suggestion}</Text>
                      </Paragraph>
                    )}
                  </div>
                }
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
                closable
                onClose={() => setErrorMessage(null)}
              />
            )}

            {/* Last Attendance */}
            {lastAttendance && (
              <Card title="📊 Kết Quả Chấm Công" style={{ marginTop: 16 }}>
                <Row gutter={16}>
                  <Col span={6}>
                    <Statistic
                      title="Check-in"
                      value={lastAttendance.checkIn?.time ? moment(lastAttendance.checkIn.time).format('HH:mm') : '--:--'}
                      suffix={
                        lastAttendance.checkIn?.status === 'on-time' ? 
                          <Tag color="success">Đúng giờ</Tag> : 
                          <Tag color="error">Trễ</Tag>
                      }
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Check-out"
                      value={lastAttendance.checkOut?.time ? moment(lastAttendance.checkOut.time).format('HH:mm') : '--:--'}
                      suffix={
                        lastAttendance.checkOut?.status === 'overtime' ? 
                          <Tag color="cyan">OT</Tag> : 
                          lastAttendance.checkOut?.status === 'early' ?
                          <Tag color="warning">Sớm</Tag> :
                          <Tag color="success">Đúng giờ</Tag>
                      }
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Muộn"
                      value={lastAttendance.lateMinutes || 0}
                      suffix="phút"
                      valueStyle={{ color: lastAttendance.lateMinutes > 0 ? '#cf1322' : '#3f8600' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="OT"
                      value={lastAttendance.overtimeHours?.toFixed(1) || 0}
                      suffix="giờ"
                      valueStyle={{ color: lastAttendance.overtimeHours > 0 ? '#1890ff' : '#8c8c8c' }}
                    />
                  </Col>
                </Row>

                <Divider />

                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic
                      title="Giờ Làm"
                      value={lastAttendance.workingHours?.toFixed(1) || 0}
                      suffix="giờ"
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="Phạt"
                      value={(lastAttendance.actualPenalty || 0).toLocaleString('vi-VN')}
                      suffix="VND"
                      valueStyle={{ color: '#cf1322' }}
                      prefix="-"
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="Lương OT (Ước tính)"
                      value={(lastAttendance.estimatedOTSalary || 0).toLocaleString('vi-VN')}
                      suffix="VND"
                      valueStyle={{ color: '#3f8600' }}
                      prefix="+"
                    />
                  </Col>
                </Row>
              </Card>
            )}

            {/* Actions */}
            <div style={{ marginTop: 24 }}>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleRefresh}
                >
                  Làm Mới
                </Button>
                <Button
                  type="primary"
                  icon={<EyeOutlined />}
                  onClick={handleViewPayroll}
                >
                  Xem Bảng Lương
                </Button>
                <Button
                  onClick={handleResetTimeMachine}
                >
                  Reset Time Machine
                </Button>
              </Space>
            </div>
          </Card>
        )}
      </Card>
    </div>
  );
};

export default DemoMode;

