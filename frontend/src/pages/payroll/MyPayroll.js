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

    const items = [
      {
        label: 'Lương cơ bản',
        value: payrollData.baseSalary || 0,
        type: 'neutral',
        icon: <DollarOutlined />
      },
      {
        label: 'Phụ cấp',
        value: payrollData.generalAllowance || 0,
        type: 'positive',
        icon: <RiseOutlined />
      },
      {
        label: 'Tiền OT',
        value: payrollData.overtimePay || 0,
        type: 'positive',
        icon: <ClockCircleOutlined />
      },
      {
        label: 'Tiền phạt',
        value: payrollData.latePenalty || 0,
        type: 'negative',
        icon: <WarningOutlined />
      },
      {
        label: 'Thuế',
        value: payrollData.taxAmount || 0,
        type: 'negative',
        icon: <FallOutlined />
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
                value={(payrollData.overtimeHours || 0).toFixed(1)}
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
            <Card style={{ background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)' }}>
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>Thực lãnh</span>}
                value={payrollData.netSalary || payrollData.totalSalary || 0}
                formatter={(val) => formatCurrency(val)}
                valueStyle={{ color: '#fff', fontSize: 22, fontWeight: 'bold' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Detail breakdown */}
        <Card title="Chi tiết bảng lương" size="small">
          <Row gutter={[16, 8]}>
            {items.map((item, index) => (
              <Col span={24} key={index}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: index < items.length - 1 ? '1px solid #f0f0f0' : 'none'
                }}>
                  <Space>
                    {item.icon}
                    <Text>{item.label}</Text>
                  </Space>
                  <Text 
                    strong 
                    style={{ 
                      color: item.type === 'positive' ? '#52c41a' : 
                             item.type === 'negative' ? '#ff4d4f' : '#333'
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
            background: '#f6ffed',
            borderRadius: 8
          }}>
            <Text strong style={{ fontSize: 16 }}>TỔNG THỰC LÃNH</Text>
            <Text strong style={{ fontSize: 20, color: '#52c41a' }}>
              {formatCurrency(payrollData.netSalary || payrollData.totalSalary || 0)}
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


