import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  DatePicker, 
  Button, 
  Row, 
  Col, 
  Statistic,
  Table,
  Select
} from 'antd';
import { 
  BarChartOutlined, 
  PieChartOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { getAPIUrl } from '../../utils/configManager';
import { message } from 'antd';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const ReportsManagement = () => {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([moment().subtract(30, 'days'), moment()]);
  const [reportData, setReportData] = useState({});

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      if (!token) {
        message.error('Chưa đăng nhập');
        return;
      }

      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');

      // Fetch dashboard stats for total employees
      const statsResponse = await axios.get(`${API_URL}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Fetch attendance records for the date range
      const attendanceResponse = await axios.get(`${API_URL}/attendance`, {
        params: { startDate, endDate },
        headers: { Authorization: `Bearer ${token}` }
      });

      // Fetch all employees
      const employeesResponse = await axios.get(`${API_URL}/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (statsResponse.data.success && attendanceResponse.data.success && employeesResponse.data.success) {
        const totalEmployees = statsResponse.data.data.totalEmployees || 0;
        const attendances = attendanceResponse.data.data || [];
        const employees = employeesResponse.data.data || [];

        // Calculate statistics
        const totalWorkingDays = moment(endDate).diff(moment(startDate), 'days') + 1;
        
        // Group attendance by employee
        const employeeStats = {};
        attendances.forEach(att => {
          if (att.employee && att.employee._id) {
            const empId = att.employee._id;
            if (!employeeStats[empId]) {
              employeeStats[empId] = {
                employeeName: att.employee.name || 'Unknown',
                workingDays: 0,
                totalHours: 0,
                attendanceCount: 0
              };
            }
            if (att.status === 'present' || att.status === 'half-day') {
              employeeStats[empId].workingDays += att.status === 'half-day' ? 0.5 : 1;
              employeeStats[empId].totalHours += att.workingHours || 0;
              employeeStats[empId].attendanceCount++;
            }
          }
        });

        // Calculate top employees
        const topEmployees = Object.values(employeeStats)
          .map(emp => ({
            ...emp,
            attendanceRate: totalWorkingDays > 0 
              ? Math.round((emp.workingDays / totalWorkingDays) * 100) 
              : 0
          }))
          .sort((a, b) => b.workingDays - a.workingDays)
          .slice(0, 10);

        // Calculate average attendance
        const totalAttendanceDays = Object.values(employeeStats).reduce((sum, emp) => sum + emp.workingDays, 0);
        const averageAttendance = totalEmployees > 0 && totalWorkingDays > 0
          ? Math.round((totalAttendanceDays / (totalEmployees * totalWorkingDays)) * 100 * 10) / 10
          : 0;

        // Calculate average working hours
        const totalHours = Object.values(employeeStats).reduce((sum, emp) => sum + emp.totalHours, 0);
        const employeesWithAttendance = Object.keys(employeeStats).length;
        const averageWorkingHours = employeesWithAttendance > 0
          ? Math.round((totalHours / employeesWithAttendance) * 10) / 10
          : 0;

        // Calculate absent employees (employees with no attendance in range)
        const employeesWithAttendanceIds = new Set(Object.keys(employeeStats));
        const absentEmployees = employees.filter(emp => 
          emp.status === 'active' && !employeesWithAttendanceIds.has(emp._id)
        ).length;

        // Calculate department stats
        const departmentStats = {};
        employees.forEach(emp => {
          if (emp.status === 'active' && emp.department) {
            if (!departmentStats[emp.department]) {
              departmentStats[emp.department] = { total: 0, present: 0 };
            }
            departmentStats[emp.department].total++;
            if (employeesWithAttendanceIds.has(emp._id)) {
              departmentStats[emp.department].present++;
            }
          }
        });

        const departmentStatsArray = Object.entries(departmentStats).map(([dept, stats]) => ({
          department: dept,
          attendanceRate: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0
        }));

        setReportData({
          totalEmployees,
          averageAttendance,
          averageWorkingHours,
          absentEmployees,
          topEmployees,
          departmentStats: departmentStatsArray
        });
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      message.error('Lỗi khi tải dữ liệu báo cáo');
      setReportData({});
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Nhân viên',
      dataIndex: 'employeeName',
      key: 'employeeName',
    },
    {
      title: 'Số ngày làm',
      dataIndex: 'workingDays',
      key: 'workingDays',
    },
    {
      title: 'Số giờ làm',
      dataIndex: 'totalHours',
      key: 'totalHours',
      render: (hours) => `${hours}h`,
    },
    {
      title: 'Tỷ lệ chấm công',
      dataIndex: 'attendanceRate',
      key: 'attendanceRate',
      render: (rate) => `${rate}%`,
    },
  ];

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>Báo cáo thống kê</Title>
        </div>

        <div style={{ marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center' }}>
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            format="DD/MM/YYYY"
          />
          <Button 
            type="primary" 
            icon={<BarChartOutlined />}
            onClick={fetchReportData}
            loading={loading}
          >
            Tạo báo cáo
          </Button>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng nhân viên"
                value={reportData.totalEmployees || 0}
                prefix={<BarChartOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tỷ lệ chấm công TB"
                value={reportData.averageAttendance || 0}
                suffix="%"
                prefix={<PieChartOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Số giờ làm TB"
                value={reportData.averageWorkingHours || 0}
                suffix="h"
                prefix={<LineChartOutlined />}
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Nhân viên vắng mặt"
                value={reportData.absentEmployees || 0}
                prefix={<BarChartOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col xs={24} lg={12}>
            <Card title="Top nhân viên chăm chỉ" size="small">
              <Table
                columns={columns}
                dataSource={reportData.topEmployees || []}
                pagination={false}
                size="small"
                rowKey="employeeName"
              />
            </Card>
          </Col>
          
          <Col xs={24} lg={12}>
            <Card title="Thống kê theo phòng ban" size="small">
              <div style={{ padding: '16px 0' }}>
                {reportData.departmentStats && reportData.departmentStats.length > 0 ? (
                  reportData.departmentStats.map((dept, index) => (
                    <p key={index}>• {dept.department}: {dept.attendanceRate}% chấm công</p>
                  ))
                ) : (
                  <p>Chưa có dữ liệu</p>
                )}
              </div>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default ReportsManagement;
