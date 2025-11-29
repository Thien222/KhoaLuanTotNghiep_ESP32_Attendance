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
  Divider
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

// Colors for charts
const COLORS = ['#52c41a', '#faad14', '#ff4d4f', '#1890ff', '#722ed1', '#13c2c2'];
const ATTENDANCE_COLORS = {
  present: '#52c41a',
  late: '#faad14', 
  absent: '#ff4d4f',
  'half-day': '#1890ff'
};

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [reportData, setReportData] = useState({});
  const [weeklyData, setWeeklyData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [dateRange, setDateRange] = useState([moment().startOf('month'), moment()]);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <DashboardOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          Dashboard
        </Title>
        <Space size="small">
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            format="DD/MM/YYYY"
            size="small"
          />
          <Button 
            icon={<ReloadOutlined />} 
            onClick={() => { fetchDashboardStats(); fetchReportData(); }}
            loading={loading}
            size="small"
          >
            Làm mới
          </Button>
        </Space>
      </div>
      
      {/* Main Content - Scrollable */}
      <div style={{ flex: 1, overflow: 'auto', paddingRight: 4 }}>
        {/* Stats Cards Row 1 */}
        <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
          <Col xs={12} sm={6}>
            <Card size="small" bodyStyle={{ padding: 12 }} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>Tổng nhân viên</span>}
                value={stats?.totalEmployees || reportData.totalEmployees || 0}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" bodyStyle={{ padding: 12 }} style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>Chấm công hôm nay</span>}
                value={stats?.todayAttendance?.count || 0}
                prefix={<CheckCircleOutlined />}
                suffix={<span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>/{stats?.totalEmployees || 0}</span>}
                valueStyle={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" bodyStyle={{ padding: 12 }} style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>Đi muộn</span>}
                value={stats?.todayAttendance?.details?.late || 0}
                prefix={<WarningOutlined />}
                valueStyle={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" bodyStyle={{ padding: 12 }} style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>Tổng giờ OT</span>}
                value={reportData.totalOTHours || 0}
                prefix={<FieldTimeOutlined />}
                suffix="h"
                valueStyle={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Stats Cards Row 2 */}
        <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
          <Col xs={12} sm={6}>
            <Card size="small" bodyStyle={{ padding: 12 }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}><DollarOutlined /> Tiền OT</span>}
                value={reportData.totalOTSalary || 0}
                valueStyle={{ color: '#52c41a', fontSize: 18 }}
                formatter={(value) => currency(value) + 'đ'}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" bodyStyle={{ padding: 12 }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}><AlertOutlined /> Tiền phạt</span>}
                value={reportData.totalPenalty || 0}
                valueStyle={{ color: '#ff4d4f', fontSize: 18 }}
                formatter={(value) => currency(value) + 'đ'}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" bodyStyle={{ padding: 12 }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}><ClockCircleOutlined /> Lần muộn</span>}
                value={reportData.totalLateCount || 0}
                valueStyle={{ color: '#faad14', fontSize: 18 }}
                suffix="lần"
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" bodyStyle={{ padding: 12 }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}><FileTextOutlined /> Đơn chờ duyệt</span>}
                value={stats?.pendingLeaveRequests || 0}
                valueStyle={{ color: (stats?.pendingLeaveRequests || 0) > 0 ? '#ff4d4f' : '#52c41a', fontSize: 18 }}
              />
            </Card>
          </Col>
        </Row>

        {/* Charts Row */}
        <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
          {/* Today's Attendance Pie Chart */}
          <Col xs={24} md={8}>
            <Card 
              size="small" 
              title={<span style={{ fontSize: 13 }}><CheckCircleOutlined /> Chấm công hôm nay</span>}
              bodyStyle={{ padding: 8, height: 220 }}
            >
              {attendancePieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={attendancePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {attendancePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                  Chưa có dữ liệu
                </div>
              )}
            </Card>
          </Col>

          {/* Department Distribution */}
          <Col xs={24} md={8}>
            <Card 
              size="small" 
              title={<span style={{ fontSize: 13 }}><TeamOutlined /> Phân bổ phòng ban</span>}
              bodyStyle={{ padding: 8, height: 220 }}
            >
              {departmentData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={departmentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {departmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                  Chưa có dữ liệu
                </div>
              )}
            </Card>
          </Col>

          {/* Attendance Rate Progress */}
          <Col xs={24} md={8}>
            <Card 
              size="small" 
              title={<span style={{ fontSize: 13 }}><RiseOutlined /> Tỷ lệ chấm công</span>}
              bodyStyle={{ padding: 16, height: 220 }}
            >
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <Progress
                  type="dashboard"
                  percent={reportData.averageAttendance || 0}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                  format={(percent) => (
                    <span style={{ fontSize: 18, fontWeight: 'bold' }}>
                      {percent}%
                    </span>
                  )}
                  width={120}
                />
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary">
                  {reportData.totalWorkingDays || 0} ngày làm việc
                </Text>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Weekly Chart */}
        <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
          <Col xs={24}>
            <Card 
              size="small" 
              title={<span style={{ fontSize: 13 }}><CalendarOutlined /> Thống kê chấm công theo ngày</span>}
              bodyStyle={{ padding: 8 }}
            >
              {weeklyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="present" name="Có mặt" stackId="1" stroke="#52c41a" fill="#52c41a" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="late" name="Muộn" stackId="2" stroke="#faad14" fill="#faad14" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="overtime" name="OT" stackId="3" stroke="#722ed1" fill="#722ed1" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                  Chưa có dữ liệu trong khoảng thời gian này
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* Two Column Layout - Top Employees & Recent Activities */}
        <Row gutter={[12, 12]}>
          {/* Left Column - Top Employees */}
          <Col xs={24} lg={12}>
            <Card 
              size="small" 
              title={<span style={{ fontSize: 13 }}><TrophyOutlined style={{ color: '#faad14' }} /> Top nhân viên chăm chỉ</span>}
              bodyStyle={{ padding: 8 }}
            >
              {reportData.topEmployees && reportData.topEmployees.length > 0 ? (
                <Table
                  columns={topEmployeeColumns}
                  dataSource={reportData.topEmployees}
                  pagination={false}
                  size="small"
                  rowKey="employeeName"
                  scroll={{ x: 400 }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
                  Chưa có dữ liệu
                </div>
              )}
            </Card>
          </Col>

          {/* Right Column - Recent Activities */}
          <Col xs={24} lg={12}>
            <Card 
              size="small" 
              title={<span style={{ fontSize: 13 }}><ClockCircleOutlined /> Hoạt động gần đây</span>}
              bodyStyle={{ padding: 8, maxHeight: 300, overflow: 'auto' }}
            >
              {stats?.recentActivities && stats.recentActivities.length > 0 ? (
                <div>
                  {stats.recentActivities.slice(0, 8).map((activity, index) => (
                    <div 
                      key={index} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '8px 0',
                        borderBottom: index < 7 ? '1px solid #f0f0f0' : 'none'
                      }}
                    >
                      <div>
                        <Text strong style={{ fontSize: 13 }}>{activity.employee?.name || 'N/A'}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {activity.time ? moment(activity.time).format('HH:mm') : 'N/A'}
                        </Text>
                      </div>
                      <div>
                        <Tag color={activity.type === 'checkIn' ? 'green' : 'blue'}>
                          {activity.type === 'checkIn' ? 'Vào' : 'Ra'}
                        </Tag>
                        {activity.status === 'late' && <Tag color="orange">Muộn</Tag>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
                  Chưa có hoạt động
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default Dashboard;
