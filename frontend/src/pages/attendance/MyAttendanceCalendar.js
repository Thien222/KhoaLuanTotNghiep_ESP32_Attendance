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
  Space,
  DatePicker
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
import './MyAttendanceCalendar.css';

const { Title, Text } = Typography;

const MyAttendanceCalendar = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(moment());
  const [selectedYear, setSelectedYear] = useState(moment().year());
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
    const isCurrentMonth = date.month() === currentMonth.month() && date.year() === currentMonth.year();
    const dayOfWeek = date.day();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isFuture = date.isAfter(moment(), 'day');
    const isPast = date.isBefore(moment(), 'day');

    // Chỉ render các ngày trong tháng hiện tại
    if (!isCurrentMonth) {
      return null;
    }

    // Future dates - hiển thị trống, không click được
    if (isFuture) {
      return (
        <div style={{ 
          height: '100%', 
          minHeight: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fafafa',
          border: '1px solid #f0f0f0',
          borderRadius: 4,
        }}>
          <Text style={{ fontSize: 14, color: '#d9d9d9' }}>{date.date()}</Text>
        </div>
      );
    }

    // Weekend không có attendance - hiển thị nhẹ nhàng
    if (isWeekend && !attendance) {
      return (
        <div style={{ 
          height: '100%',
          minHeight: 80,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fafafa',
          border: '1px solid #f0f0f0',
          borderRadius: 4,
          padding: '4px'
        }}>
          <Text style={{ fontSize: 12, color: '#d9d9d9', marginBottom: 4 }}>{date.date()}</Text>
          <Text style={{ fontSize: 9, color: '#d9d9d9' }}>Cuối tuần</Text>
        </div>
      );
    }

    // Có dữ liệu attendance
    if (attendance) {
      const isPresent = attendance.status === 'present' || attendance.checkIn?.time;
      const isAbsent = attendance.status === 'absent';
      const isLate = attendance.lateMinutes > 0;
      const hasOT = attendance.overtimeHours > 0;

      // Xác định màu chính - Ưu tiên: Absent > OT > Late > Present
      let cellColor = '#fff';
      let borderColor = '#d9d9d9';
      let statusDot = '#d9d9d9';
      
      if (isAbsent) {
        cellColor = '#fff2f0';
        borderColor = '#ffccc7';
        statusDot = '#ff4d4f';
      } else if (hasOT) {
        cellColor = '#f9f0ff';
        borderColor = '#d3adf7';
        statusDot = '#722ed1';
      } else if (isLate) {
        cellColor = '#fffbe6';
        borderColor = '#ffe58f';
        statusDot = '#faad14';
      } else if (isPresent) {
        cellColor = '#f6ffed';
        borderColor = '#b7eb8f';
        statusDot = '#52c41a';
      }

      return (
        <div 
          style={{ 
            position: 'relative',
            height: '100%',
            minHeight: 80,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            cursor: 'pointer',
            background: cellColor,
            border: `2px solid ${borderColor}`,
            borderRadius: 6,
            padding: '6px 4px',
            transition: 'all 0.2s',
            boxSizing: 'border-box'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
            e.currentTarget.style.zIndex = 10;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.zIndex = 1;
          }}
          onClick={() => {
            setSelectedDate({ date: dateKey, data: attendance });
            setModalVisible(true);
          }}
        >
          {/* Status indicator dot */}
          <div style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: statusDot,
            border: '1px solid #fff',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }} />
          
          {/* Date number */}
          <Text strong style={{ 
            fontSize: 15, 
            color: isToday ? '#1890ff' : '#333',
            marginBottom: 4,
            fontWeight: isToday ? 'bold' : 'normal'
          }}>
            {date.date()}
          </Text>

          {/* Status tags - chỉ hiển thị nếu có */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 2, 
            alignItems: 'center',
            width: '100%',
            marginTop: 'auto'
          }}>
            {isAbsent && (
              <Tag color="red" style={{ fontSize: 8, padding: '0 3px', margin: 0, lineHeight: '14px', width: 'fit-content' }}>
                Vắng
              </Tag>
            )}
            {!isAbsent && isLate && (
              <Tag color="orange" style={{ fontSize: 8, padding: '0 3px', margin: 0, lineHeight: '14px', width: 'fit-content' }}>
              Trễ {attendance.lateMinutes}p
            </Tag>
          )}
          {hasOT && (
              <Tag color="purple" style={{ fontSize: 8, padding: '0 3px', margin: 0, lineHeight: '14px', width: 'fit-content' }}>
              OT {attendance.overtimeHours.toFixed(1)}h
            </Tag>
          )}
          </div>
        </div>
      );
    }

    // Past weekday without attendance = absent (màu đỏ)
    if (isPast && !isWeekend) {
      return (
        <div 
          style={{
            position: 'relative',
            height: '100%',
            minHeight: 80,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            cursor: 'pointer',
            background: '#fff2f0',
            border: '2px solid #ffccc7',
            borderRadius: 6,
            padding: '6px 4px',
            boxSizing: 'border-box'
          }}
          onClick={() => {
            setSelectedDate({ date: dateKey, data: null });
            setModalVisible(true);
          }}
        >
          <div style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#ff4d4f',
            border: '1px solid #fff',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }} />
          <Text style={{ fontSize: 15, color: '#333', marginBottom: 4 }}>{date.date()}</Text>
          <Tag color="red" style={{ 
            fontSize: 8, 
            padding: '0 3px',
            margin: 0,
            lineHeight: '14px',
            width: 'fit-content',
            marginTop: 'auto'
          }}>
            Vắng
          </Tag>
        </div>
      );
    }

    // Default: Past weekend không có attendance
    if (isPast && isWeekend) {
      return (
        <div style={{ 
          height: '100%',
          minHeight: 80,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fafafa',
          border: '1px solid #f0f0f0',
          borderRadius: 4,
          padding: '4px'
        }}>
          <Text style={{ fontSize: 12, color: '#d9d9d9' }}>{date.date()}</Text>
        </div>
      );
    }

    return null;
  };

  const onPanelChange = (date) => {
    setCurrentMonth(date);
    setSelectedYear(date.year());
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
            {user?.employee?.name || user?.username}
          </Text>
        </div>

        {/* Month/Year Selector */}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <DatePicker
            picker="month"
            value={currentMonth}
            onChange={(date) => {
              if (date) {
                setCurrentMonth(date);
                setSelectedYear(date.year());
              }
            }}
            format="MM/YYYY"
            placeholder="Chọn tháng"
            style={{ width: 150 }}
            allowClear={false}
          />
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

        {/* Calendar */}
        <Spin spinning={loading}>
          <Calendar
            value={currentMonth}
            onPanelChange={onPanelChange}
            cellRender={getDateCellRender}
            validRange={[moment(`${selectedYear}-01-01`), moment(`${selectedYear}-12-31`)]}
            fullscreen={false}
            headerRender={() => null}
            style={{ 
              border: '1px solid #f0f0f0',
              borderRadius: 8,
            }}
            className="attendance-calendar"
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
        {!selectedDate?.data && (
          <Alert
            message="Không có dữ liệu chấm công"
            description="Ngày này không có thông tin chấm công."
            type="info"
            showIcon
          />
        )}
      </Modal>
    </div>
  );
};

export default MyAttendanceCalendar;
