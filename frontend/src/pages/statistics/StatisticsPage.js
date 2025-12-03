import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Tabs,
  Row,
  Col,
  Statistic,
  Table,
  DatePicker,
  Select,
  Space,
  Tag,
  Progress,
  Empty,
  Spin
} from 'antd';
import {
  BarChartOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  RiseOutlined,
  FallOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { getAPIUrl } from '../../utils/configManager';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const StatisticsPage = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('attendance');
  const [dateRange, setDateRange] = useState([moment().startOf('month'), moment().endOf('month')]);
  const [selectedMonth, setSelectedMonth] = useState(moment());
  
  // Data states
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [payrollStats, setPayrollStats] = useState(null);
  const [employeeStats, setEmployeeStats] = useState([]);

  useEffect(() => {
    fetchData();
  }, [dateRange, selectedMonth, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (activeTab === 'attendance') {
        // Fetch attendance stats
        const startDate = dateRange[0].format('YYYY-MM-DD');
        const endDate = dateRange[1].format('YYYY-MM-DD');
        
        const response = await axios.get(`${API_URL}/attendance`, {
          params: { startDate, endDate },
          headers
        });

        if (response.data.success) {
          const data = response.data.data || [];
          processAttendanceStats(data);
        }
      } else if (activeTab === 'payroll') {
        // Fetch payroll stats
        const month = selectedMonth.month() + 1;
        const year = selectedMonth.year();
        
        const response = await axios.get(`${API_URL}/payroll`, {
          params: { month, year },
          headers
        });

        if (response.data.success) {
          const data = response.data.data || [];
          processPayrollStats(data);
        }
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processAttendanceStats = (data) => {
    const totalRecords = data.length;
    const presentCount = data.filter(a => a.status === 'present' || a.status === 'half-day').length;
    const lateCount = data.filter(a => a.lateMinutes > 0).length;
    const absentCount = data.filter(a => a.status === 'absent').length;
    const totalLateMinutes = data.reduce((sum, a) => sum + (a.lateMinutes || 0), 0);
    const totalOTHours = data.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);
    const totalPenalty = data.reduce((sum, a) => sum + (a.actualPenalty || 0), 0);
    const totalOTSalary = data.reduce((sum, a) => sum + (a.estimatedOTSalary || 0), 0);

    // Group by employee
    const employeeMap = {};
    data.forEach(a => {
      const empId = a.employee?._id;
      if (!empId) return;
      
      if (!employeeMap[empId]) {
        employeeMap[empId] = {
          employee: a.employee,
          totalDays: 0,
          lateDays: 0,
          lateMinutes: 0,
          otHours: 0,
          penalty: 0,
          otSalary: 0
        };
      }
      
      // FIX: Only count workdays based on status
      // present = 1 day, half-day = 0.5 day, absent = 0 day
      if (a.status === 'present') {
        employeeMap[empId].totalDays += 1;
      } else if (a.status === 'half-day') {
        employeeMap[empId].totalDays += 0.5;
      }
      // absent status = 0 days (no increment)
      
      if (a.lateMinutes > 0) {
        employeeMap[empId].lateDays++;
        employeeMap[empId].lateMinutes += a.lateMinutes;
      }
      employeeMap[empId].otHours += a.overtimeHours || 0;
      employeeMap[empId].penalty += a.actualPenalty || 0;
      employeeMap[empId].otSalary += a.estimatedOTSalary || 0;
    });

    setAttendanceStats({
      totalRecords,
      presentCount,
      lateCount,
      absentCount,
      totalLateMinutes,
      totalOTHours,
      totalPenalty,
      totalOTSalary,
      attendanceRate: totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0
    });

    setEmployeeStats(Object.values(employeeMap).sort((a, b) => b.lateDays - a.lateDays));
  };

  const processPayrollStats = (data) => {
    const totalEmployees = data.length;
    const totalBaseSalary = data.reduce((sum, p) => sum + (p.basicSalary || p.baseSalary || 0), 0);
    const totalOTPay = data.reduce((sum, p) => sum + (p.overtimePay || 0), 0);
    const totalPenalty = data.reduce((sum, p) => sum + (p.latePenalty || 0), 0);
    const totalDeductions = data.reduce((sum, p) => sum + (p.deductions || 0), 0);
    const totalNetSalary = data.reduce((sum, p) => sum + (p.netSalary || 0), 0);
    const totalWorkingDays = data.reduce((sum, p) => sum + (p.workingDays || 0), 0);
    const totalOTHours = data.reduce((sum, p) => sum + (p.overtimeHours || 0), 0);

    setPayrollStats({
      totalEmployees,
      totalBaseSalary,
      totalOTPay,
      totalPenalty,
      totalDeductions,
      totalNetSalary,
      totalWorkingDays,
      totalOTHours,
      avgSalary: totalEmployees > 0 ? Math.round(totalNetSalary / totalEmployees) : 0
    });

    setEmployeeStats(data.map(p => ({
      employee: p.employee,
      baseSalary: p.basicSalary || p.baseSalary || 0,
      workingDays: p.workingDays || 0,
      otHours: p.overtimeHours || 0,
      otPay: p.overtimePay || 0,
      penalty: p.latePenalty || 0,
      netSalary: p.netSalary || 0
    })).sort((a, b) => b.netSalary - a.netSalary));
  };

  const formatCurrency = (value) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);

  const attendanceColumns = [
    {
      title: 'Nhân viên',
      key: 'employee',
      width: 200,
      render: (_, record) => (
        <div>
          <Text strong>{record.employee?.name || 'N/A'}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{record.employee?.department || ''}</Text>
        </div>
      )
    },
    {
      title: 'Ngày công',
      dataIndex: 'totalDays',
      key: 'totalDays',
      width: 100,
      align: 'center',
      render: val => <Tag color="blue">{val} ngày</Tag>
    },
    {
      title: 'Số lần trễ',
      dataIndex: 'lateDays',
      key: 'lateDays',
      width: 100,
      align: 'center',
      render: val => val > 0 ? <Tag color="orange">{val} lần</Tag> : <Tag color="green">0</Tag>
    },
    {
      title: 'Tổng phút trễ',
      dataIndex: 'lateMinutes',
      key: 'lateMinutes',
      width: 120,
      align: 'center',
      render: val => val > 0 ? <Text type="danger">{val} phút</Text> : '-'
    },
    {
      title: 'Giờ OT',
      dataIndex: 'otHours',
      key: 'otHours',
      width: 100,
      align: 'center',
      render: val => val > 0 ? <Tag color="purple">{val.toFixed(1)}h</Tag> : '-'
    },
    {
      title: 'Tiền phạt',
      dataIndex: 'penalty',
      key: 'penalty',
      width: 130,
      render: val => val > 0 ? <Text type="danger">{formatCurrency(val)}</Text> : '-'
    },
    {
      title: 'Tiền OT',
      dataIndex: 'otSalary',
      key: 'otSalary',
      width: 130,
      render: val => val > 0 ? <Text type="success">{formatCurrency(val)}</Text> : '-'
    }
  ];

  const payrollColumns = [
    {
      title: 'Nhân viên',
      key: 'employee',
      width: 200,
      render: (_, record) => (
        <div>
          <Text strong>{record.employee?.name || 'N/A'}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{record.employee?.department || ''}</Text>
        </div>
      )
    },
    {
      title: 'Lương cơ bản',
      dataIndex: 'baseSalary',
      key: 'baseSalary',
      width: 140,
      render: val => formatCurrency(val)
    },
    {
      title: 'Ngày công',
      dataIndex: 'workingDays',
      key: 'workingDays',
      width: 100,
      align: 'center',
      render: val => <Tag color="blue">{val} ngày</Tag>
    },
    {
      title: 'Giờ OT',
      dataIndex: 'otHours',
      key: 'otHours',
      width: 80,
      align: 'center',
      render: val => val > 0 ? <Tag color="purple">{val}h</Tag> : '-'
    },
    {
      title: 'Tiền OT',
      dataIndex: 'otPay',
      key: 'otPay',
      width: 120,
      render: val => val > 0 ? <Text type="success">+{formatCurrency(val)}</Text> : '-'
    },
    {
      title: 'Tiền phạt',
      dataIndex: 'penalty',
      key: 'penalty',
      width: 120,
      render: val => val > 0 ? <Text type="danger">-{formatCurrency(val)}</Text> : '-'
    },
    {
      title: 'Thực lãnh',
      dataIndex: 'netSalary',
      key: 'netSalary',
      width: 140,
      render: val => <Text strong style={{ color: '#1890ff' }}>{formatCurrency(val)}</Text>
    }
  ];

  const tabItems = [
    {
      key: 'attendance',
      label: (
        <span>
          <ClockCircleOutlined /> Thống kê Chấm công
        </span>
      ),
      children: (
        <div style={{ height: 'calc(100vh - 220px)', display: 'flex', flexDirection: 'column' }}>
          {/* Filters */}
          <div style={{ marginBottom: 16 }}>
            <Space>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                format="DD/MM/YYYY"
                size="small"
              />
            </Space>
          </div>

          {/* Summary Cards */}
          {attendanceStats && (
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
              <Col xs={12} sm={6}>
                <Card size="small" bodyStyle={{ padding: 12 }}>
                  <Statistic
                    title={<span style={{ fontSize: 12 }}>Tổng bản ghi</span>}
                    value={attendanceStats.totalRecords}
                    prefix={<CalendarOutlined />}
                    valueStyle={{ fontSize: 20 }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" bodyStyle={{ padding: 12 }}>
                  <Statistic
                    title={<span style={{ fontSize: 12 }}>Tỷ lệ đi làm</span>}
                    value={attendanceStats.attendanceRate}
                    suffix="%"
                    prefix={<TeamOutlined />}
                    valueStyle={{ fontSize: 20, color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" bodyStyle={{ padding: 12 }}>
                  <Statistic
                    title={<span style={{ fontSize: 12 }}>Tổng phạt</span>}
                    value={attendanceStats.totalPenalty}
                    prefix={<FallOutlined />}
                    valueStyle={{ fontSize: 20, color: '#ff4d4f' }}
                    formatter={(val) => formatCurrency(val)}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" bodyStyle={{ padding: 12 }}>
                  <Statistic
                    title={<span style={{ fontSize: 12 }}>Tổng OT</span>}
                    value={attendanceStats.totalOTSalary}
                    prefix={<RiseOutlined />}
                    valueStyle={{ fontSize: 20, color: '#1890ff' }}
                    formatter={(val) => formatCurrency(val)}
                  />
                </Card>
              </Col>
            </Row>
          )}

          {/* Table */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <Table
              columns={attendanceColumns}
              dataSource={employeeStats}
              rowKey={(record) => record.employee?._id}
              loading={loading}
              size="small"
              pagination={{ pageSize: 10, size: 'small' }}
              scroll={{ x: 800 }}
              bordered
              rowClassName={(_, index) => index % 2 === 0 ? 'table-row-light' : 'table-row-dark'}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 8,
                overflow: 'hidden'
              }}
            />
          </div>
        </div>
      )
    },
    {
      key: 'payroll',
      label: (
        <span>
          <DollarOutlined /> Thống kê Lương
        </span>
      ),
      children: (
        <div style={{ height: 'calc(100vh - 220px)', display: 'flex', flexDirection: 'column' }}>
          {/* Filters */}
          <div style={{ marginBottom: 16 }}>
            <Space>
              <DatePicker
                value={selectedMonth}
                onChange={setSelectedMonth}
                picker="month"
                format="MM/YYYY"
                size="small"
              />
            </Space>
          </div>

          {/* Summary Cards */}
          {payrollStats && (
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
              <Col xs={12} sm={6}>
                <Card size="small" bodyStyle={{ padding: 12 }}>
                  <Statistic
                    title={<span style={{ fontSize: 12 }}>Tổng nhân viên</span>}
                    value={payrollStats.totalEmployees}
                    prefix={<TeamOutlined />}
                    valueStyle={{ fontSize: 20 }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" bodyStyle={{ padding: 12 }}>
                  <Statistic
                    title={<span style={{ fontSize: 12 }}>Tổng lương</span>}
                    value={payrollStats.totalNetSalary}
                    prefix={<DollarOutlined />}
                    valueStyle={{ fontSize: 20, color: '#1890ff' }}
                    formatter={(val) => formatCurrency(val)}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" bodyStyle={{ padding: 12 }}>
                  <Statistic
                    title={<span style={{ fontSize: 12 }}>Tổng OT</span>}
                    value={payrollStats.totalOTPay}
                    prefix={<RiseOutlined />}
                    valueStyle={{ fontSize: 20, color: '#52c41a' }}
                    formatter={(val) => formatCurrency(val)}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" bodyStyle={{ padding: 12 }}>
                  <Statistic
                    title={<span style={{ fontSize: 12 }}>Tổng phạt</span>}
                    value={payrollStats.totalPenalty}
                    prefix={<FallOutlined />}
                    valueStyle={{ fontSize: 20, color: '#ff4d4f' }}
                    formatter={(val) => formatCurrency(val)}
                  />
                </Card>
              </Col>
            </Row>
          )}

          {/* Table */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <Table
              columns={payrollColumns}
              dataSource={employeeStats}
              rowKey={(record) => record.employee?._id}
              loading={loading}
              size="small"
              pagination={{ pageSize: 10, size: 'small' }}
              scroll={{ x: 900 }}
              bordered
              rowClassName={(_, index) => index % 2 === 0 ? 'table-row-light' : 'table-row-dark'}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 8,
                overflow: 'hidden'
              }}
            />
          </div>
        </div>
      )
    }
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Title level={4} style={{ margin: '0 0 16px 0' }}>
        <BarChartOutlined style={{ marginRight: 8 }} />
        Thống kê
      </Title>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          style={{ height: '100%' }}
        />
      </div>
    </div>
  );
};

export default StatisticsPage;

