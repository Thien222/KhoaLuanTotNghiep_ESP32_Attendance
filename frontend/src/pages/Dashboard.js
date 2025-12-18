import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Spin,
  Table,
  Tag,
  Progress,
  DatePicker,
  Button,
  Space,
  Tooltip,
  Divider,
  Modal
} from 'antd';
import {
  UserOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  RiseOutlined,
  FieldTimeOutlined,
  ReloadOutlined,
  DashboardOutlined,
  CalendarOutlined,
  TrophyOutlined,
  AlertOutlined
} from '@ant-design/icons';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import axios from 'axios';
import { getAPIUrl } from '../utils/configManager';
import { message } from 'antd';
import moment from 'moment';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// MODERNIZED: Pastel/Flat UI color palette
const COLORS = [
  '#6366f1', // Soft indigo
  '#22c55e', // Fresh green
  '#f59e0b', // Warm amber
  '#ef4444', // Soft red
  '#8b5cf6', // Purple
  '#06b6d4'  // Teal
];
const ATTENDANCE_COLORS = {
  present: '#22c55e',  // Fresh green
  late: '#f59e0b',     // Warm amber
  absent: '#ef4444',   // Soft red
  'half-day': '#6366f1' // Soft indigo
};

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [reportData, setReportData] = useState({});
  const [weeklyData, setWeeklyData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [dateRange, setDateRange] = useState([moment().startOf('month'), moment()]);
  const [user, setUser] = useState(null);

  // NEW: Modal states
  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [lateModalVisible, setLateModalVisible] = useState(false);

  // Get user from localStorage
  useEffect(() => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
    fetchReportData();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');

      if (!token) {
        message.error('Chưa đăng nhập');
        return;
      }

      const response = await axios.get(`${API_URL}/dashboard/stats`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setStats(response.data.data);

        // Process department data for pie chart
        if (response.data.data?.departmentStats) {
          const deptData = response.data.data.departmentStats.map((d, i) => ({
            name: d._id || 'Chưa phân loại',
            value: d.count,
            color: COLORS[i % COLORS.length]
          }));
          setDepartmentData(deptData);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportData = async () => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');

      if (!token) return;

      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');

      const [attendanceResponse, employeesResponse] = await Promise.all([
        axios.get(`${API_URL}/attendance`, {
          params: { startDate, endDate },
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/employees`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (attendanceResponse.data.success && employeesResponse.data.success) {
        const attendances = attendanceResponse.data.data || [];
        const employees = employeesResponse.data.data || [];

        const start = moment(startDate);
        const end = moment(endDate);
        const totalWorkingDays = end.diff(start, 'days') + 1;

        // Process employee stats
        const employeeStats = {};
        const dailyStats = {};

        attendances.forEach(att => {
          const empId = att.employee?._id;
          if (!empId) return;

          // Employee stats
          if (!employeeStats[empId]) {
            employeeStats[empId] = {
              employeeName: att.employee?.name,
              department: att.employee?.department,
              workingDays: 0,
              overtimeHours: 0,
              lateCount: 0,
              totalPenalty: 0,
              totalOTSalary: 0
            };
          }

          if (att.status === 'present' || att.status === 'half-day') {
            employeeStats[empId].workingDays += att.status === 'half-day' ? 0.5 : 1;
          }
          employeeStats[empId].overtimeHours += att.overtimeHours || 0;
          employeeStats[empId].totalOTSalary += att.estimatedOTSalary || 0;
          if (att.lateMinutes > 0) {
            employeeStats[empId].lateCount++;
            employeeStats[empId].totalPenalty += att.actualPenalty || 0;
          }

          // Daily stats for line chart
          const dateKey = moment(att.date).format('DD/MM');
          if (!dailyStats[dateKey]) {
            dailyStats[dateKey] = {
              date: dateKey,
              present: 0,
              late: 0,
              absent: 0,
              overtime: 0
            };
          }

          if (att.status === 'present' || att.status === 'half-day') {
            dailyStats[dateKey].present++;
          }
          if (att.lateMinutes > 0) {
            dailyStats[dateKey].late++;
          }
          if (att.status === 'absent') {
            dailyStats[dateKey].absent++;
          }
          if (att.overtimeHours > 0) {
            dailyStats[dateKey].overtime++;
          }
        });

        // Top employees
        const topEmployees = Object.values(employeeStats)
          .map(emp => ({
            ...emp,
            attendanceRate: totalWorkingDays > 0
              ? Math.round((emp.workingDays / totalWorkingDays) * 100)
              : 0
          }))
          .sort((a, b) => b.workingDays - a.workingDays)
          .slice(0, 5);

        // Weekly chart data
        const weeklyChartData = Object.values(dailyStats).slice(-7);
        setWeeklyData(weeklyChartData);

        // Summary stats
        const totalEmployees = employees.filter(e => e.status === 'active').length;
        const totalAttendanceDays = Object.values(employeeStats).reduce((sum, emp) => sum + emp.workingDays, 0);
        const averageAttendance = totalEmployees > 0 && totalWorkingDays > 0
          ? Math.round((totalAttendanceDays / (totalEmployees * totalWorkingDays)) * 100 * 10) / 10
          : 0;

        const totalOTHours = Object.values(employeeStats).reduce((sum, emp) => sum + emp.overtimeHours, 0);
        const totalOTSalary = Object.values(employeeStats).reduce((sum, emp) => sum + emp.totalOTSalary, 0);
        const totalPenalty = Object.values(employeeStats).reduce((sum, emp) => sum + emp.totalPenalty, 0);
        const totalLateCount = Object.values(employeeStats).reduce((sum, emp) => sum + emp.lateCount, 0);

        setReportData({
          totalEmployees,
          averageAttendance,
          totalOTHours: Math.round(totalOTHours * 10) / 10,
          totalOTSalary,
          totalPenalty,
          totalLateCount,
          topEmployees,
          totalWorkingDays
        });
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
    }
  };

  const topEmployeeColumns = [
    {
      title: 'Nhân viên',
      dataIndex: 'employeeName',
      key: 'employeeName',
      width: 140,
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Phòng ban',
      dataIndex: 'department',
      key: 'department',
      width: 100,
      render: (text) => <Tag color="blue">{text || 'N/A'}</Tag>
    },
    {
      title: 'Công',
      dataIndex: 'workingDays',
      key: 'workingDays',
      width: 60,
      align: 'center',
      render: (days) => <Tag color="green">{days}</Tag>
    },
    {
      title: 'OT',
      dataIndex: 'overtimeHours',
      key: 'overtimeHours',
      width: 50,
      align: 'center',
      render: (hours) => hours > 0 ? <Tag color="purple">{hours}h</Tag> : '-'
    },
    {
      title: 'Muộn',
      dataIndex: 'lateCount',
      key: 'lateCount',
      width: 50,
      align: 'center',
      render: (count) => count > 0 ? <Tag color="orange">{count}</Tag> : <Tag color="green">0</Tag>
    }
  ];

  // Attendance pie chart data
  const attendancePieData = stats?.todayAttendance?.details ? [
    { name: 'Đúng giờ', value: stats.todayAttendance.details.ontime || 0, color: '#52c41a' },
    { name: 'Đi muộn', value: stats.todayAttendance.details.late || 0, color: '#faad14' },
    { name: 'Vắng mặt', value: (stats.totalEmployees || 0) - (stats.todayAttendance.count || 0), color: '#ff4d4f' }
  ].filter(d => d.value > 0) : [];

  if (loading && !stats) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  const currency = (value) => new Intl.NumberFormat('vi-VN').format(value || 0);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        // marginLeft: "-150px",
      }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 600, color: '#262626' }}>
            Hello, {user?.name || user?.employee?.name || 'User'}
          </Title>
          <Text type="secondary" style={{ fontSize: 14, marginTop: 4, display: 'block' }}>
            Track team progress here. You almost reach a goal!
          </Text>
        </div>
        <Space size="middle">
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            format="DD/MM/YYYY"
            size="small"
            style={{ borderRadius: 8 }}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => { fetchDashboardStats(); fetchReportData(); }}
            loading={loading}
            size="small"
            style={{ borderRadius: 8 }}
          >
            Làm mới
          </Button>
        </Space>
      </div>

      {/* Main Content - Scrollable */}
      <div style={{ flex: 1, overflow: 'auto', paddingRight: 4 }}>
        {/* Stats Cards Row 1 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}>
            <Card
              size="small"
              bodyStyle={{ padding: 12 }}
              style={{
                borderRadius: 12,
                border: '1px solid #f0f0f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                background: '#ffffff'
              }}
            >
              <Statistic
                title={<span style={{ color: '#8c8c8c', fontSize: 13, fontWeight: 500 }}>Tổng nhân viên</span>}
                value={stats?.totalEmployees || reportData.totalEmployees || 0}
                prefix={<TeamOutlined style={{ color: '#1890ff', fontSize: 20 }} />}
                valueStyle={{ color: '#262626', fontSize: 28, fontWeight: 600 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card
              size="small"
              bodyStyle={{ padding: 12 }}
              style={{
                borderRadius: 12,
                border: '1px solid #f0f0f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                background: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onClick={() => setAttendanceModalVisible(true)}
              hoverable
            >
              <Statistic
                title={<span style={{ color: '#8c8c8c', fontSize: 13, fontWeight: 500 }}>Chấm công hôm nay 👆</span>}
                value={stats?.todayAttendance?.count || 0}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />}
                suffix={<span style={{ fontSize: 14, color: '#8c8c8c', fontWeight: 400 }}>/{stats?.totalEmployees || 0}</span>}
                valueStyle={{ color: '#262626', fontSize: 28, fontWeight: 600 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card
              size="small"
              bodyStyle={{ padding: 12 }}
              style={{
                borderRadius: 12,
                border: '1px solid #f0f0f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                background: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onClick={() => setLateModalVisible(true)}
              hoverable
            >
              <Statistic
                title={<span style={{ color: '#8c8c8c', fontSize: 13, fontWeight: 500 }}>Đi muộn 👆</span>}
                value={stats?.lateArrivals?.count || stats?.todayAttendance?.details?.late || 0}
                prefix={<WarningOutlined style={{ color: '#faad14', fontSize: 20 }} />}
                valueStyle={{ color: '#262626', fontSize: 28, fontWeight: 600 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card
              size="small"
              bodyStyle={{ padding: 12 }}
              style={{
                borderRadius: 12,
                border: '1px solid #f0f0f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                background: '#ffffff'
              }}
            >
              <Statistic
                title={<span style={{ color: '#8c8c8c', fontSize: 13, fontWeight: 500 }}>Tổng giờ OT</span>}
                value={reportData.totalOTHours || 0}
                prefix={<FieldTimeOutlined style={{ color: '#722ed1', fontSize: 20 }} />}
                suffix="h"
                valueStyle={{ color: '#262626', fontSize: 28, fontWeight: 600 }}
              />
            </Card>
          </Col>
        </Row>

        {/* Stats Cards Row 2 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {/* NEW: Total Monthly Salary Widget */}
          <Col xs={12} sm={6}>
            <Card
              size="small"
              bodyStyle={{ padding: 12 }}
              style={{
                borderRadius: 12,
                border: '1px solid #f0f0f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              }}
            >
              <Statistic
                title={<span style={{ fontSize: 13, color: '#ffffff', fontWeight: 500 }}><DollarOutlined style={{ marginRight: 4 }} /> Tổng lương tháng này</span>}
                value={stats?.totalMonthlySalary || 0}
                valueStyle={{ color: '#ffffff', fontSize: 22, fontWeight: 600 }}
                formatter={(value) => currency(value) + 'đ'}
              />
            </Card>
          </Col>

          <Col xs={12} sm={6}>
            <Card
              size="small"
              bodyStyle={{ padding: 12 }}
              style={{
                borderRadius: 12,
                border: '1px solid #f0f0f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              <Statistic
                title={<span style={{ fontSize: 13, color: '#8c8c8c', fontWeight: 500 }}><DollarOutlined style={{ marginRight: 4 }} /> Tiền OT</span>}
                value={reportData.totalOTSalary || 0}
                valueStyle={{ color: '#52c41a', fontSize: 22, fontWeight: 600 }}
                formatter={(value) => currency(value) + 'đ'}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card
              size="small"
              bodyStyle={{ padding: 12 }}
              style={{
                borderRadius: 12,
                border: '1px solid #f0f0f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              <Statistic
                title={<span style={{ fontSize: 13, color: '#8c8c8c', fontWeight: 500 }}><AlertOutlined style={{ marginRight: 4 }} /> Tiền phạt</span>}
                value={reportData.totalPenalty || 0}
                valueStyle={{ color: '#ff4d4f', fontSize: 22, fontWeight: 600 }}
                formatter={(value) => currency(value) + 'đ'}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card
              size="small"
              bodyStyle={{ padding: 12 }}
              style={{
                borderRadius: 12,
                border: '1px solid #f0f0f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              <Statistic
                title={<span style={{ fontSize: 13, color: '#8c8c8c', fontWeight: 500 }}><ClockCircleOutlined style={{ marginRight: 4 }} /> Lần muộn</span>}
                value={reportData.totalLateCount || 0}
                valueStyle={{ color: '#faad14', fontSize: 22, fontWeight: 600 }}
                suffix="lần"
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card
              size="small"
              bodyStyle={{ padding: 12 }}
              style={{
                borderRadius: 12,
                border: '1px solid #f0f0f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              <Statistic
                title={<span style={{ fontSize: 13, color: '#8c8c8c', fontWeight: 500 }}><FileTextOutlined style={{ marginRight: 4 }} /> Đơn chờ duyệt</span>}
                value={stats?.pendingLeaveRequests || 0}
                valueStyle={{ color: (stats?.pendingLeaveRequests || 0) > 0 ? '#ff4d4f' : '#52c41a', fontSize: 22, fontWeight: 600 }}
              />
            </Card>
          </Col>
        </Row>

        {/* Charts Row - MODERNIZED */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {/* Today's Attendance Pie Chart */}
          <Col xs={24} md={8}>
            <Card
              size="small"
              title={<span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}><CheckCircleOutlined style={{ marginRight: 6, color: '#22c55e' }} /> Chấm công hôm nay</span>}
              bodyStyle={{ padding: 12, height: 200 }}
              style={{
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              {attendancePieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={attendancePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {attendancePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid #e5e7eb',
                        fontSize: 12
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                  Chưa có dữ liệu
                </div>
              )}
            </Card>
          </Col>

          {/* Department Distribution */}
          <Col xs={24} md={8}>
            <Card
              size="small"
              title={<span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}><TeamOutlined style={{ marginRight: 6, color: '#6366f1' }} /> Phân bổ phòng ban</span>}
              bodyStyle={{ padding: 12, height: 200 }}
              style={{
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              {departmentData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={departmentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {departmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid #e5e7eb',
                        fontSize: 12
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                  Chưa có dữ liệu
                </div>
              )}
            </Card>
          </Col>

          {/* Attendance Rate Progress - MODERNIZED */}
          <Col xs={24} md={8}>
            <Card
              size="small"
              title={<span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}><RiseOutlined style={{ marginRight: 6, color: '#8b5cf6' }} /> Tỷ lệ chấm công</span>}
              bodyStyle={{ padding: 12, height: 200 }}
              style={{
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <Progress
                  type="dashboard"
                  percent={reportData.averageAttendance || 0}
                  strokeColor={{
                    '0%': '#6366f1',
                    '100%': '#22c55e',
                  }}
                  trailColor="#f3f4f6"
                  format={(percent) => (
                    <span style={{ fontSize: 22, fontWeight: 700, color: '#374151' }}>
                      {percent}%
                    </span>
                  )}
                  width={130}
                  strokeWidth={10}
                />
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text style={{ color: '#9ca3af', fontSize: 13 }}>
                  {reportData.totalWorkingDays || 0} ngày làm việc
                </Text>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Weekly Chart - MODERNIZED */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24}>
            <Card
              size="small"
              title={<span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}><CalendarOutlined style={{ marginRight: 6, color: '#6366f1' }} /> Thống kê chấm công theo ngày</span>}
              bodyStyle={{ padding: 12 }}
              style={{
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              {weeklyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    {/* MODERNIZED: Removed grid lines for cleaner look */}
                    <defs>
                      <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorOT" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        fontSize: 12
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                      iconType="circle"
                      iconSize={8}
                    />
                    <Area
                      type="monotone"
                      dataKey="present"
                      name="Có mặt"
                      stroke="#22c55e"
                      strokeWidth={2}
                      fill="url(#colorPresent)"
                    />
                    <Area
                      type="monotone"
                      dataKey="late"
                      name="Muộn"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fill="url(#colorLate)"
                    />
                    <Area
                      type="monotone"
                      dataKey="overtime"
                      name="OT"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fill="url(#colorOT)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                  Chưa có dữ liệu trong khoảng thời gian này
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* Top Employees - Full Width (Recent Activities REMOVED) */}
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Card
              size="small"
              title={<span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}><TrophyOutlined style={{ color: '#f59e0b', marginRight: 6 }} /> Top nhân viên chăm chỉ</span>}
              bodyStyle={{ padding: 16 }}
              style={{
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              {reportData.topEmployees && reportData.topEmployees.length > 0 ? (
                <Table
                  columns={topEmployeeColumns}
                  dataSource={reportData.topEmployees}
                  pagination={false}
                  size="small"
                  rowKey="employeeName"
                  scroll={{ x: 500 }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af' }}>
                  Chưa có dữ liệu
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </div>

      {/* NEW: Today's Attendance List Modal */}
      <Modal
        title={<span><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />Danh sách chấm công hôm nay</span>}
        open={attendanceModalVisible}
        onCancel={() => setAttendanceModalVisible(false)}
        footer={null}
        width={800}
      >
        <Table
          dataSource={stats?.todayAttendance?.list || []}
          rowKey={(record) => record.employeeId}
          pagination={{ pageSize: 10 }}
          size="small"
          columns={[
            {
              title: 'Tên NV',
              dataIndex: 'employeeName',
              key: 'employeeName',
              render: (text) => <Text strong>{text}</Text>
            },
            {
              title: 'Mã NV',
              dataIndex: 'employeeId',
              key: 'employeeId'
            },
            {
              title: 'Phòng ban',
              dataIndex: 'department',
              key: 'department',
              render: (text) => <Tag color="blue">{text}</Tag>
            },
            {
              title: 'Giờ vào',
              dataIndex: 'checkInTime',
              key: 'checkInTime',
              render: (time) => time || <Text type="secondary">--</Text>
            },
            {
              title: 'Giờ ra',
              dataIndex: 'checkOutTime',
              key: 'checkOutTime',
              render: (time) => time || <Text type="secondary">--</Text>
            },
            {
              title: 'Trạng thái',
              dataIndex: 'status',
              key: 'status',
              render: (status, record) => {
                if (status === 'late') {
                  return <Tag color="orange">Trễ ({record.lateMinutes}p)</Tag>;
                } else if (status === 'ontime') {
                  return <Tag color="green">Đúng giờ</Tag>;
                } else {
                  return <Tag color="red">Vắng</Tag>;
                }
              }
            }
          ]}
        />
      </Modal>

      {/* NEW: Late Arrivals Modal */}
      <Modal
        title={<span><WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />Danh sách nhân viên đi muộn</span>}
        open={lateModalVisible}
        onCancel={() => setLateModalVisible(false)}
        footer={null}
        width={700}
      >
        <Table
          dataSource={stats?.lateArrivals?.list || []}
          rowKey={(record) => record.employeeId}
          pagination={{ pageSize: 10 }}
          size="small"
          columns={[
            {
              title: 'Tên NV',
              dataIndex: 'employeeName',
              key: 'employeeName',
              render: (text) => <Text strong>{text}</Text>
            },
            {
              title: 'Mã NV',
              dataIndex: 'employeeId',
              key: 'employeeId'
            },
            {
              title: 'Phòng ban',
              dataIndex: 'department',
              key: 'department',
              render: (text) => <Tag color="blue">{text}</Tag>
            },
            {
              title: 'Giờ vào',
              dataIndex: 'checkInTime',
              key: 'checkInTime'
            },
            {
              title: 'Số phút trễ',
              dataIndex: 'lateMinutes',
              key: 'lateMinutes',
              render: (minutes) => <Tag color="orange">{minutes} phút</Tag>
            },
            {
              title: 'Tiền phạt',
              dataIndex: 'actualPenalty',
              key: 'actualPenalty',
              render: (penalty) => <Text type="danger">{currency(penalty)}đ</Text>
            }
          ]}
        />
      </Modal>
    </div>
  );
};

export default Dashboard;
