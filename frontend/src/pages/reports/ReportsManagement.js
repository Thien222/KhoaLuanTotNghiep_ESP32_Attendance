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
      // Mock data for demo
      const mockReportData = {
        totalEmployees: 25,
        averageAttendance: 94.5,
        averageWorkingHours: 8.2,
        absentEmployees: 2,
        topEmployees: [
          { employeeName: 'Nguyễn Văn A', workingDays: 22, totalHours: 176, attendanceRate: 100 },
          { employeeName: 'Trần Thị B', workingDays: 21, totalHours: 168, attendanceRate: 95 },
          { employeeName: 'Lê Văn C', workingDays: 20, totalHours: 160, attendanceRate: 91 }
        ]
      };
      setReportData(mockReportData);
    } catch (error) {
      console.error('Error fetching report data:', error);
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
                rowKey="employeeId"
              />
            </Card>
          </Col>
          
          <Col xs={24} lg={12}>
            <Card title="Thống kê theo phòng ban" size="small">
              <div style={{ padding: '16px 0' }}>
                <p>• IT: 95% chấm công</p>
                <p>• HR: 92% chấm công</p>
                <p>• Finance: 98% chấm công</p>
                <p>• Marketing: 88% chấm công</p>
              </div>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default ReportsManagement;