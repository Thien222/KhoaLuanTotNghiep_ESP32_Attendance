import React, { useState, useEffect } from 'react';
import {
  Card,
  Calendar,
  Badge,
  Modal,
  Descriptions,
  Typography,
  Tag,
  Spin,
  message,
  Row,
  Col,
  Statistic,
  Space,
  Alert
} from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { getAPIUrl } from '../../utils/configManager';

const { Title, Text } = Typography;

const AttendanceCalendar = () => {
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(moment());

  useEffect(() => {
    fetchAttendances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  const fetchAttendances = async () => {
    setLoading(true);
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      const startDate = currentMonth.clone().startOf('month').format('YYYY-MM-DD');
      const endDate = currentMonth.clone().endOf('month').format('YYYY-MM-DD');
      
      const response = await axios.get(`${API_URL}/attendance`, {
        params: { startDate, endDate },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setAttendances(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching attendances:', error);
      message.error('Lỗi khi tải dữ liệu chấm công');
    } finally {
      setLoading(false);
    }
  };

  // Get attendance for a specific date
  const getAttendanceForDate = (date) => {
    const dateStr = date.format('YYYY-MM-DD');
    return attendances.find(att => 
      moment(att.date).format('YYYY-MM-DD') === dateStr
    );
  };

  // Calendar cell renderer
  const dateCellRender = (date) => {
    const attendance = getAttendanceForDate(date);
    const isToday = date.isSame(moment(), 'day');
    const isPast = date.isBefore(moment(), 'day');
    const isWeekend = date.day() === 0 || date.day() === 6;
    
    if (!isPast && !isToday) {
      return null;
    }
    
    if (isWeekend) {
      return (
        <div style={{ textAlign: 'center' }}>
          <Badge status="default" text={<Text type="secondary">Nghỉ</Text>} />
        </div>
      );
    }
    
    if (attendance) {
      const isLate = attendance.lateMinutes > 0;
      const hasOT = attendance.overtimeHours > 0;
      
      return (
        <div 
          style={{ 
            textAlign: 'center', 
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            background: attendance.status === 'present' ? '#f6ffed' : '#fff2f0'
          }}
          onClick={() => handleDateClick(date, attendance)}
        >
          <Badge 
            status={attendance.status === 'present' ? 'success' : 'error'} 
            text={
              <Text style={{ fontSize: 11 }}>
                {attendance.status === 'present' ? 'Có mặt' : 'Vắng'}
              </Text>
            }
          />
          {isLate && (
            <div>
              <Tag color="orange" style={{ fontSize: 10, margin: 0 }}>
                Trễ {attendance.lateMinutes}p
              </Tag>
            </div>
          )}
          {hasOT && (
            <div>
              <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>
                OT {attendance.overtimeHours}h
              </Tag>
            </div>
          )}
        </div>
      );
    } else if (isPast) {
      return (
        <div style={{ textAlign: 'center' }}>
          <Badge status="error" text={<Text type="danger" style={{ fontSize: 11 }}>Vắng</Text>} />
        </div>
      );
    }
    
    return null;
  };

  const handleDateClick = (date, attendance) => {
    setSelectedDate(date);
    setSelectedAttendance(attendance);
    setDetailModalVisible(true);
  };

  const handlePanelChange = (date) => {
    setCurrentMonth(date);
  };

  // Calculate monthly summary
  const monthlySummary = {
    totalDays: attendances.length,
    presentDays: attendances.filter(a => a.status === 'present').length,
    lateDays: attendances.filter(a => a.lateMinutes > 0).length,
    totalOTHours: attendances.reduce((sum, a) => sum + (a.overtimeHours || 0), 0),
    totalPenalty: attendances.reduce((sum, a) => sum + (a.actualPenalty || 0), 0),
    totalOTSalary: attendances.reduce((sum, a) => sum + (a.estimatedOTSalary || 0), 0)
  };

  const currency = (value) => new Intl.NumberFormat('vi-VN', { 
    style: 'currency', 
    currency: 'VND' 
  }).format(value || 0);

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0 }}>
            <CalendarOutlined style={{ marginRight: 8 }} />
            Lịch Chấm Công
          </Title>
          <Text type="secondary">Xem chi tiết chấm công của bạn theo ngày</Text>
        </div>

        {/* Monthly Summary */}
        <Card size="small" style={{ marginBottom: 24, background: '#fafafa' }}>
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={8} md={4}>
              <Statistic 
                title="Ngày công"
                value={monthlySummary.presentDays}
                suffix={`/${monthlySummary.totalDays}`}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Statistic 
                title="Ngày đi trễ"
                value={monthlySummary.lateDays}
                valueStyle={{ color: monthlySummary.lateDays > 0 ? '#ff4d4f' : '#52c41a' }}
              />
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Statistic 
                title="Tổng giờ OT"
                value={monthlySummary.totalOTHours}
                suffix="h"
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Statistic 
                title="Tiền OT"
                value={monthlySummary.totalOTSalary}
                formatter={(val) => `${(val/1000).toFixed(0)}k`}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Statistic 
                title="Tiền phạt"
                value={monthlySummary.totalPenalty}
                formatter={(val) => `-${(val/1000).toFixed(0)}k`}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Col>
          </Row>
        </Card>

        {/* Legend */}
        <Alert
          message={
            <Space size="large">
              <span><Badge status="success" /> Có mặt</span>
              <span><Badge status="error" /> Vắng mặt</span>
              <span><Tag color="orange" style={{ marginLeft: 4 }}>Đi trễ</Tag></span>
              <span><Tag color="blue" style={{ marginLeft: 4 }}>Có OT</Tag></span>
            </Space>
          }
          type="info"
          style={{ marginBottom: 16 }}
        />

        {/* Calendar */}
        <Spin spinning={loading}>
          <Calendar 
            dateCellRender={dateCellRender}
            onPanelChange={handlePanelChange}
            onSelect={(date) => {
              const attendance = getAttendanceForDate(date);
              if (attendance) {
                handleDateClick(date, attendance);
              }
            }}
          />
        </Spin>
      </Card>

      {/* Detail Modal */}
      <Modal
        title={
          <Space>
            <CalendarOutlined />
            Chi tiết chấm công - {selectedDate?.format('DD/MM/YYYY')}
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={500}
      >
        {selectedAttendance ? (
          <div>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Trạng thái">
                <Tag color={selectedAttendance.status === 'present' ? 'green' : 'red'}>
                  {selectedAttendance.status === 'present' ? 'Có mặt' : 'Vắng mặt'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Giờ vào">
                {selectedAttendance.checkIn?.time 
                  ? moment(selectedAttendance.checkIn.time).format('HH:mm:ss')
                  : '--:--'
                }
                {selectedAttendance.checkIn?.status === 'late' && (
                  <Tag color="orange" style={{ marginLeft: 8 }}>Trễ</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Giờ ra">
                {selectedAttendance.checkOut?.time 
                  ? moment(selectedAttendance.checkOut.time).format('HH:mm:ss')
                  : '--:--'
                }
                {selectedAttendance.checkOut?.status === 'overtime' && (
                  <Tag color="blue" style={{ marginLeft: 8 }}>OT</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Số giờ làm">
                {(selectedAttendance.workingHours || 0).toFixed(1)} giờ
              </Descriptions.Item>
              <Descriptions.Item label="Đi trễ">
                {selectedAttendance.lateMinutes > 0 ? (
                  <Text type="danger">{selectedAttendance.lateMinutes} phút</Text>
                ) : (
                  <Text type="success">Không</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Giờ OT">
                {selectedAttendance.overtimeHours > 0 ? (
                  <Text type="success">{selectedAttendance.overtimeHours} giờ</Text>
                ) : (
                  <Text type="secondary">Không có</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Tiền OT">
                <Text style={{ color: '#52c41a' }}>
                  {currency(selectedAttendance.estimatedOTSalary || 0)}
                </Text>
                {selectedAttendance.is_ot_approved ? (
                  <Tag color="green" style={{ marginLeft: 8 }}>Đã duyệt</Tag>
                ) : selectedAttendance.overtimeHours > 0 ? (
                  <Tag color="orange" style={{ marginLeft: 8 }}>Chờ duyệt</Tag>
                ) : null}
              </Descriptions.Item>
              <Descriptions.Item label="Tiền phạt">
                <Text type="danger">
                  {currency(selectedAttendance.actualPenalty || 0)}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </div>
        ) : (
          <Alert 
            message="Không có dữ liệu chấm công cho ngày này" 
            type="warning" 
            showIcon 
          />
        )}
      </Modal>
    </div>
  );
};

export default AttendanceCalendar;









