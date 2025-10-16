import React from 'react';
import { Card, Row, Col, Statistic, Typography, Space } from 'antd';
import { 
  UserOutlined, 
  ClockCircleOutlined, 
  DollarOutlined, 
  CheckCircleOutlined 
} from '@ant-design/icons';

const { Title } = Typography;

const Dashboard = () => {
  return (
    <div>
      <Title level={2}>Dashboard</Title>
      
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng nhân viên"
              value={1128}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Đã chấm công hôm nay"
              value={93}
              suffix="%"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng lương tháng này"
              value={112893}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Yêu cầu nghỉ phép"
              value={5}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>
      
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Hoạt động gần đây" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>• Nguyễn Văn A đã chấm công vào lúc 08:30</div>
              <div>• Trần Thị B đã gửi yêu cầu nghỉ phép</div>
              <div>• Lê Văn C đã chấm công ra lúc 17:30</div>
            </Space>
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card title="Thống kê tuần này" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>• Số ngày làm việc: 5/5</div>
              <div>• Tỷ lệ chấm công đúng giờ: 95%</div>
              <div>• Số yêu cầu nghỉ phép: 3</div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;