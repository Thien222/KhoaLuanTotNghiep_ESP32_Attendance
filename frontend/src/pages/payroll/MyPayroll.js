import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  DatePicker,
  Spin,
  Alert,
  Typography,
  Space,
  Divider,
  Tag,
  Empty
} from 'antd';
import {
  DollarOutlined,
  CalendarOutlined,
  RiseOutlined,
  FallOutlined,
  ClockCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { getAPIUrl } from '../../utils/configManager';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;

const MyPayroll = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payrollData, setPayrollData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(moment());
  const [payrollHistory, setPayrollHistory] = useState([]);

  useEffect(() => {
    fetchPayroll();
  }, [selectedMonth]);

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      const month = selectedMonth.month() + 1;
      const year = selectedMonth.year();

      const response = await axios.get(`${API_URL}/payroll`, {
        params: { month, year },
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const data = response.data.data || [];
        // Find my payroll (filter by employee)
        const myPayroll = data.find(p => 
          p.employee?._id === user?.employee?._id || 
          p.employee === user?.employee?._id
        );
        setPayrollData(myPayroll || null);
        setPayrollHistory(data.slice(0, 6)); // Last 6 months for history
      }
    } catch (error) {
      console.error('Error fetching payroll:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(value || 0);
  };

  const renderPayrollDetails = () => {
    if (!payrollData) {
      return (
        <Empty 
          description={`Chưa có dữ liệu lương tháng ${selectedMonth.format('MM/YYYY')}`}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    // FIX: Đồng bộ với mobile - hiển thị đầy đủ thông tin
    const basicSalaryFull = payrollData.basicSalaryFull || payrollData.employee?.baseSalary || payrollData.employee?.salary || 0;
    const proratedSalary = payrollData.baseSalary || payrollData.basicSalary || 0;
    const totalAllowances = (payrollData.generalAllowance || 0) + 
                           (payrollData.seniorityAllowance || 0) + 
                           (payrollData.positionAllowance || 0) +
                           (payrollData.otherAllowances || 0);
    const totalOTPay = (payrollData.overtimePay || 0) + 
                      (payrollData.holidayWorkPay || 0);
                      // Bỏ weekendWorkPay - không có công thức tính lương liên quan
    const totalBonus = (payrollData.bonus || 0) + (payrollData.performanceBonus || 0);
    // FIX: Tính tổng khấu trừ bao gồm cả taxAmount (bảo hiểm + thuế) từ backend
    const taxAmount = payrollData.taxAmount || payrollData.fixedDeduction || 0;
    // Tổng khấu trừ = Bảo hiểm + Thuế + Tiền phạt (bỏ các khoản khác)
    const totalDeductions = taxAmount + (payrollData.latePenalty || 0);
    const totalIncome = proratedSalary + totalAllowances + totalOTPay + totalBonus;

    const items = [
      {
        label: 'Lương cơ bản (tháng)',
        value: basicSalaryFull,
        type: 'neutral',
        icon: <DollarOutlined />
      },
      {
        label: `Lương theo ngày công (${payrollData.workingDays || 0} ngày)`,
        value: proratedSalary,
        type: 'neutral',
        icon: <CalendarOutlined />
      },
      {
        label: 'Phụ cấp chung (5%)',
        value: payrollData.generalAllowance || payrollData.allowance || 0,
        type: 'positive',
        icon: <RiseOutlined />,
        alwaysShow: true // Luôn hiển thị dù = 0
      },
      ...(payrollData.bonus > 0 ? [{
        label: 'Thưởng',
        value: payrollData.bonus,
        type: 'positive',
        icon: <RiseOutlined />
      }] : []),
      ...(payrollData.performanceBonus > 0 ? [{
        label: 'Thưởng hiệu suất',
        value: payrollData.performanceBonus,
        type: 'positive',
        icon: <RiseOutlined />
      }] : []),
      ...(payrollData.otherAllowances > 0 ? [{
        label: 'Phụ cấp khác',
        value: payrollData.otherAllowances,
        type: 'positive',
        icon: <RiseOutlined />
      }] : []),
      ...(payrollData.seniorityAllowance > 0 ? [{
        label: 'PC Thâm niên',
        value: payrollData.seniorityAllowance,
        type: 'positive',
        icon: <RiseOutlined />
      }] : []),
      ...(payrollData.positionAllowance > 0 ? [{
        label: 'PC Chức vụ',
        value: payrollData.positionAllowance,
        type: 'positive',
        icon: <RiseOutlined />
      }] : []),
      ...(totalOTPay > 0 ? [{
        label: `Lương OT (${(payrollData.overtimeHours || 0).toFixed(2)}h)`,
        value: totalOTPay,
        type: 'positive',
        icon: <ClockCircleOutlined />
      }] : []),
      ...(payrollData.holidayWorkPay > 0 ? [{
        label: 'Làm ngày lễ',
        value: payrollData.holidayWorkPay,
        type: 'positive',
        icon: <ClockCircleOutlined />
      }] : []),
      // Bỏ "Làm cuối tuần" - không có công thức tính lương liên quan
      {
        label: 'Tổng thu nhập',
        value: totalIncome,
        type: 'positive',
        icon: <RiseOutlined />,
        isTotal: true
      },
      ...(payrollData.latePenalty > 0 ? [{
        label: `Phạt muộn (${payrollData.lateCount || 0} lần)`,
        value: payrollData.latePenalty,
        type: 'negative',
        icon: <WarningOutlined />
      }] : []),
      {
        label: `Bảo hiểm + Thuế (${payrollData.taxRate || 10}%)`,
        value: taxAmount,
        type: 'negative',
        icon: <FallOutlined />,
        alwaysShow: true // Luôn hiển thị dù = 0
      },
      ...(payrollData.halfDayDeduction > 0 ? [{
        label: 'Nghỉ nửa ngày',
        value: payrollData.halfDayDeduction,
        type: 'negative',
        icon: <FallOutlined />
      }] : []),
      ...(payrollData.absentDeduction > 0 ? [{
        label: 'Nghỉ không lương',
        value: payrollData.absentDeduction,
        type: 'negative',
        icon: <FallOutlined />
      }] : []),
      ...(payrollData.unpaidLeaveDeduction > 0 ? [{
        label: 'Nghỉ phép không lương',
        value: payrollData.unpaidLeaveDeduction,
        type: 'negative',
        icon: <FallOutlined />
      }] : []),
      // Bỏ "Khấu trừ khác" - không hiển thị
      {
        label: 'Tổng khấu trừ',
        value: totalDeductions,
        type: 'negative',
        icon: <FallOutlined />,
        isTotal: true
      },
    ];

    return (
      <div>
        {/* Summary Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Ngày công"
                value={payrollData.workingDays || 0}
                suffix="ngày"
                prefix={<CalendarOutlined style={{ color: '#1890ff' }} />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Giờ OT"
                value={(payrollData.overtimeHours || 0).toFixed(2)}
                suffix="giờ"
                prefix={<ClockCircleOutlined style={{ color: '#722ed1' }} />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Tổng khấu trừ"
                value={payrollData.totalDeductions || 0}
                formatter={(val) => formatCurrency(val)}
                prefix={<FallOutlined style={{ color: '#ff4d4f' }} />}
                valueStyle={{ color: '#ff4d4f', fontSize: 18 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ 
              background: (payrollData?.netSalary || 0) < 0 
                ? 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)' 
                : 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)' 
            }}>
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>Thực lãnh</span>}
                value={payrollData?.netSalary || payrollData?.totalSalary || 0}
                formatter={(val) => formatCurrency(val)}
                valueStyle={{ color: '#fff', fontSize: 22, fontWeight: 'bold' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Detail breakdown */}
        <Card title="Chi tiết bảng lương" size="small">
          <Row gutter={[16, 8]}>
            {items
              .filter(item => item.alwaysShow || item.value > 0 || item.isTotal) // Chỉ hiển thị nếu có giá trị hoặc alwaysShow
              .map((item, index, filteredItems) => (
              <Col span={24} key={index}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: item.isTotal ? '12px' : '8px 0',
                  borderBottom: index < filteredItems.length - 1 ? '1px solid #f0f0f0' : 'none',
                  background: item.isTotal ? (item.type === 'positive' ? '#f6ffed' : '#fff2f0') : 'transparent',
                  borderRadius: item.isTotal ? 8 : 0,
                  marginTop: item.isTotal ? 8 : 0,
                  marginBottom: item.isTotal ? 8 : 0
                }}>
                  <Space>
                    {item.icon}
                    <Text strong={item.isTotal} style={{ fontSize: item.isTotal ? 15 : 14 }}>
                      {item.label}
                    </Text>
                  </Space>
                  <Text 
                    strong={item.isTotal}
                    style={{ 
                      color: item.type === 'positive' ? '#52c41a' : 
                             item.type === 'negative' ? '#ff4d4f' : '#333',
                      fontSize: item.isTotal ? 16 : 14
                    }}
                  >
                    {item.type === 'positive' ? '+' : item.type === 'negative' ? '-' : ''}
                    {formatCurrency(item.value)}
                  </Text>
                </div>
              </Col>
            ))}
          </Row>

          <Divider />

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '12px',
            background: (payrollData?.netSalary || 0) < 0 ? '#fff2f0' : '#f6ffed',
            borderRadius: 8,
            border: `2px solid ${(payrollData?.netSalary || 0) < 0 ? '#ff4d4f' : '#52c41a'}`
          }}>
            <Text strong style={{ fontSize: 16 }}>TỔNG THỰC LÃNH</Text>
            <Text strong style={{ 
              fontSize: 20, 
              color: (payrollData?.netSalary || 0) < 0 ? '#ff4d4f' : '#52c41a' 
            }}>
              {formatCurrency(payrollData?.netSalary || payrollData?.totalSalary || 0)}
            </Text>
          </div>

          {/* Additional info */}
          {payrollData.lateCount > 0 && (
            <Alert
              type="warning"
              message={`Đi trễ ${payrollData.lateCount} lần (${payrollData.lateMinutes || 0} phút)`}
              style={{ marginTop: 12 }}
              showIcon
            />
          )}

          {payrollData.status && (
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <Tag color={
                payrollData.status === 'paid' ? 'green' :
                payrollData.status === 'approved' ? 'blue' :
                payrollData.status === 'calculated' ? 'orange' : 'default'
              }>
                {payrollData.status === 'paid' ? 'Đã thanh toán' :
                 payrollData.status === 'approved' ? 'Đã duyệt' :
                 payrollData.status === 'calculated' ? 'Đã tính' : payrollData.status}
              </Tag>
            </div>
          )}
        </Card>
      </div>
    );
  };

  return (
    <div style={{ padding: 16 }}>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Space align="center">
            <DollarOutlined style={{ fontSize: 24, color: '#52c41a' }} />
            <Title level={4} style={{ margin: 0 }}>
              Bảng lương của tôi
            </Title>
          </Space>
          <DatePicker
            picker="month"
            value={selectedMonth}
            onChange={(date) => setSelectedMonth(date || moment())}
            format="MM/YYYY"
            placeholder="Chọn tháng"
            style={{ width: 150 }}
          />
        </div>

        <Alert
          type="info"
          message={
            <span>
              Xem bảng lương tháng <strong>{selectedMonth.format('MM/YYYY')}</strong> của {user?.employee?.name || user?.username}
            </span>
          }
          style={{ marginBottom: 16 }}
          showIcon
        />

        <Spin spinning={loading}>
          {renderPayrollDetails()}
        </Spin>
      </Card>
    </div>
  );
};

export default MyPayroll;


