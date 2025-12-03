import React, { useState, useEffect } from 'react';
import {
  Card,
  Calendar,
  Badge,
  Modal,
  Descriptions,
  Tag,
  Spin,
  Alert,
  Row,
  Col,
  Statistic,
  Typography,
  Space
} from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  FieldTimeOutlined,
  DollarOutlined,
  WarningOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { getAPIUrl } from '../../utils/configManager';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;

const MyAttendanceCalendar = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(moment());
  const [monthStats, setMonthStats] = useState({
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    otHours: 0,
    totalPenalty: 0,
  });

  useEffect(() => {
    fetchAttendance();
  }, [currentMonth]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      const startDate = currentMonth.clone().startOf('month').format('YYYY-MM-DD');
      const endDate = currentMonth.clone().endOf('month').format('YYYY-MM-DD');

      const response = await axios.get(`${API_URL}/attendance`, {
        params: { startDate, endDate },
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const data = response.data.data || [];
        const dataMap = {};
        let present = 0, absent = 0, late = 0, ot = 0, penalty = 0;

        data.forEach(att => {
          const dateKey = moment(att.date).format('YYYY-MM-DD');
          dataMap[dateKey] = att;

          // Calculate stats
          if (att.status === 'present' || att.checkIn?.time) present++;
          if (att.status === 'absent') absent++;
          if (att.lateMinutes > 0) late++;
          ot += att.overtimeHours || 0;
          penalty += att.actualPenalty || 0;
        });

        setAttendanceData(dataMap);
        setMonthStats({
          presentDays: present,
          absentDays: absent,
          lateDays: late,
          otHours: ot,
          totalPenalty: penalty,
        });
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateCellRender = (date) => {
    const dateKey = date.format('YYYY-MM-DD');
    const attendance = attendanceData[dateKey];
    const isToday = dateKey === moment().format('YYYY-MM-DD');
    const isCurrentMonth = date.month() === currentMonth.month();

    if (!isCurrentMonth) return null;

    if (attendance) {
      const isPresent = attendance.status === 'present' || attendance.checkIn?.time;
      const isLate = attendance.lateMinutes > 0;
      const hasOT = attendance.overtimeHours > 0;

      return (
        <div 
          style={{ 
            position: 'relative',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer'
          }}
          onClick={() => {
            setSelectedDate({ date: dateKey, data: attendance });
            setModalVisible(true);
          }}
        >
          <Badge 
            status={isPresent ? 'success' : 'error'} 
            style={{ position: 'absolute', top: 2, right: 2 }}
          />
          {isLate && (
            <Tag color="orange" style={{ fontSize: 10, padding: '0 4px', marginTop: 20 }}>
              Trễ {attendance.lateMinutes}p
            </Tag>
          )}
          {hasOT && (
            <Tag color="purple" style={{ fontSize: 10, padding: '0 4px', marginTop: 2 }}>
              OT {attendance.overtimeHours.toFixed(1)}h
            </Tag>
          )}
        </div>
      );
    }

    // Weekend styling
    const dayOfWeek = date.day();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return (
        <div style={{ color: '#999', fontSize: 10 }}>
          Cuối tuần
        </div>
      );
    }

    // Future date
    if (date.isAfter(moment(), 'day')) {
      return null;
    }

    // Past weekday without attendance = absent
    if (date.isBefore(moment(), 'day')) {
      return (
        <Badge status="default" text="" style={{ position: 'absolute', top: 2, right: 2 }} />
      );
    }

    return null;
  };

  const onPanelChange = (date) => {
    setCurrentMonth(date);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(value || 0);
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return 'Chưa có';
    return moment(timeStr).format('HH:mm');
  };

  return (
    <div style={{ padding: 16 }}>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space align="center">
            <CalendarOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <Title level={4} style={{ margin: 0 }}>
              Lịch chấm công của tôi
            </Title>
          </Space>
          <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
            {user?.employee?.name || user?.username} - {currentMonth.format('MM/YYYY')}
          </Text>
        </div>

        {/* Statistics */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="Ngày có mặt"
                value={monthStats.presentDays}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a', fontSize: 20 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="Lần đi trễ"
                value={monthStats.lateDays}
                prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                valueStyle={{ color: '#faad14', fontSize: 20 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="Giờ OT"
                value={monthStats.otHours.toFixed(1)}
                prefix={<FieldTimeOutlined style={{ color: '#722ed1' }} />}
                valueStyle={{ color: '#722ed1', fontSize: 20 }}
                suffix="h"
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="Tiền phạt"
                value={monthStats.totalPenalty}
                prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
                valueStyle={{ color: '#ff4d4f', fontSize: 16 }}
                formatter={(val) => formatCurrency(val)}
              />
            </Card>
          </Col>
        </Row>

        {/* Legend */}
        <Alert
          type="info"
          showIcon
          message={
            <Space split={<span style={{ color: '#d9d9d9' }}>|</span>}>
              <span><Badge status="success" /> Có mặt</span>
              <span><Badge status="error" /> Vắng</span>
              <span><Tag color="orange" style={{ fontSize: 10 }}>Trễ</Tag> Đi trễ</span>
              <span><Tag color="purple" style={{ fontSize: 10 }}>OT</Tag> Làm thêm</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        />

        {/* Calendar */}
        <Spin spinning={loading}>
          <Calendar
            value={currentMonth}
            onPanelChange={onPanelChange}
            dateCellRender={getDateCellRender}
            style={{ 
              border: '1px solid #f0f0f0',
              borderRadius: 8,
            }}
          />
        </Spin>
      </Card>

      {/* Detail Modal */}
      <Modal
        title={
          <Space>
            <CalendarOutlined />
            <span>Chi tiết ngày {selectedDate?.date ? moment(selectedDate.date).format('DD/MM/YYYY') : ''}</span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={500}
      >
        {selectedDate?.data && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Trạng thái">
              {selectedDate.data.status === 'present' || selectedDate.data.checkIn?.time ? (
                <Tag color="green">Có mặt</Tag>
              ) : selectedDate.data.status === 'leave' ? (
                <Tag color="orange">Nghỉ phép</Tag>
              ) : (
                <Tag color="red">Vắng</Tag>
              )}
            </Descriptions.Item>

            <Descriptions.Item label="Check-in">
              <Space>
                <span>{formatTime(selectedDate.data.checkIn?.time)}</span>
                {selectedDate.data.checkIn?.status && (
                  <Tag color={selectedDate.data.checkIn.status === 'on-time' ? 'green' : 'orange'}>
                    {selectedDate.data.checkIn.status === 'on-time' ? 'Đúng giờ' : 'Trễ'}
                  </Tag>
                )}
              </Space>
            </Descriptions.Item>

            <Descriptions.Item label="Check-out">
              <Space>
                <span>{formatTime(selectedDate.data.checkOut?.time)}</span>
                {selectedDate.data.checkOut?.status && (
                  <Tag color={
                    selectedDate.data.checkOut.status === 'on-time' ? 'green' :
                    selectedDate.data.checkOut.status === 'overtime' ? 'purple' : 'orange'
                  }>
                    {selectedDate.data.checkOut.status === 'on-time' ? 'Đúng giờ' :
                     selectedDate.data.checkOut.status === 'overtime' ? 'OT' : 'Về sớm'}
                  </Tag>
                )}
              </Space>
            </Descriptions.Item>

            <Descriptions.Item label="Giờ làm việc">
              {selectedDate.data.workingHours 
                ? `${selectedDate.data.workingHours.toFixed(1)} giờ`
                : 'Chưa có'}
            </Descriptions.Item>

            {selectedDate.data.lateMinutes > 0 && (
              <Descriptions.Item label="Đi trễ">
                <Text type="warning">{selectedDate.data.lateMinutes} phút</Text>
              </Descriptions.Item>
            )}

            {selectedDate.data.overtimeHours > 0 && (
              <Descriptions.Item label="Giờ OT">
                <Text type="secondary">{selectedDate.data.overtimeHours.toFixed(1)} giờ</Text>
              </Descriptions.Item>
            )}

            {selectedDate.data.estimatedOTSalary > 0 && (
              <Descriptions.Item label="Lương OT">
                <Text style={{ color: '#52c41a' }}>
                  +{formatCurrency(selectedDate.data.estimatedOTSalary)}
                </Text>
              </Descriptions.Item>
            )}

            {selectedDate.data.actualPenalty > 0 && (
              <Descriptions.Item label="Tiền phạt">
                <Text type="danger">
                  -{formatCurrency(selectedDate.data.actualPenalty)}
                </Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default MyAttendanceCalendar;



