import React, { useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import moment from 'moment';
import { Card, Modal, Tag, Space, Typography, Divider } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  ClockCircleOutlined,
  UserOutlined,
  CalendarOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;

const LeaveCalendar = ({ leaves, userRole, onEventClick, holidays = [] }) => {
  const [selectedEvent, setSelectedEvent] = React.useState(null);
  const [modalVisible, setModalVisible] = React.useState(false);

  // Get color based on status and leave type
  const getEventColor = (leave) => {
    // First priority: status
    if (leave.status === 'approved') {
      // Second priority: leave type
      if (leave.leaveType === 'sick' || leave.type === 'sick') {
        return '#ff7875'; // Light red for sick leave
      } else if (leave.leaveType === 'annual' || leave.type === 'annual') {
        return '#1890ff'; // Blue for annual leave
      } else if (leave.leaveType === 'maternity' || leave.type === 'maternity') {
        return '#ff85c0'; // Pink for maternity
      } else if (leave.leaveType === 'unpaid' || leave.type === 'unpaid') {
        return '#faad14'; // Orange for unpaid
      } else {
        return '#52c41a'; // Green for other approved
      }
    } else if (leave.status === 'pending') {
      return '#d9d9d9'; // Gray for pending
    } else if (leave.status === 'rejected') {
      return '#ff4d4f'; // Red for rejected
    } else if (leave.status === 'cancelled') {
      return '#8c8c8c'; // Dark gray for cancelled
    }
    return '#1890ff'; // Default blue
  };

  // Get leave type text
  const getLeaveTypeText = (type) => {
    const types = {
      annual: 'Nghỉ phép năm',
      sick: 'Nghỉ ốm',
      unpaid: 'Nghỉ không lương',
      maternity: 'Nghỉ thai sản',
      other: 'Khác'
    };
    return types[type] || type;
  };

  // Get status text and icon
  const getStatusInfo = (status) => {
    const statusMap = {
      pending: { text: 'Chờ duyệt', icon: <ClockCircleOutlined />, color: 'default' },
      approved: { text: 'Đã duyệt', icon: <CheckCircleOutlined />, color: 'success' },
      rejected: { text: 'Từ chối', icon: <CloseCircleOutlined />, color: 'error' },
      cancelled: { text: 'Đã hủy', icon: <CloseCircleOutlined />, color: 'default' }
    };
    return statusMap[status] || { text: status, icon: null, color: 'default' };
  };

  // Convert leaves to FullCalendar events
  const events = useMemo(() => {
    return leaves.map(leave => {
      const employee = leave.employee || {};
      const employeeName = employee.name || 'Không xác định';
      const employeeId = employee.employeeId || '';
      
      // Title for event
      let title = '';
      if (userRole === 'manager' || userRole === 'admin') {
        // For admin/manager: show employee name + leave type
        const leaveTypeText = getLeaveTypeText(leave.leaveType || leave.type);
        title = `${employeeName}${employeeId ? ` (${employeeId})` : ''} - ${leaveTypeText}`;
      } else {
        // For employee: show leave type only
        title = getLeaveTypeText(leave.leaveType || leave.type);
      }

      return {
        id: leave._id,
        title: title,
        start: moment(leave.startDate).format('YYYY-MM-DD'),
        end: moment(leave.endDate).add(1, 'day').format('YYYY-MM-DD'), // Add 1 day because end is exclusive
        backgroundColor: getEventColor(leave),
        borderColor: getEventColor(leave),
        textColor: '#fff',
        extendedProps: {
          leave: leave,
          employee: employee
        }
      };
    });
  }, [leaves, userRole]);

  // Add holidays as events
  const holidayEvents = useMemo(() => {
    return holidays.map(holiday => ({
      id: `holiday-${holiday._id}`,
      title: holiday.name,
      start: moment(holiday.date).format('YYYY-MM-DD'),
      allDay: true,
      backgroundColor: '#fff3cd',
      borderColor: '#ffc107',
      textColor: '#856404',
      display: 'background',
      extendedProps: {
        isHoliday: true,
        holiday: holiday
      }
    }));
  }, [holidays]);

  const allEvents = [...events, ...holidayEvents];

  const handleEventClick = (clickInfo) => {
    const event = clickInfo.event;
    const extendedProps = event.extendedProps;
    
    if (extendedProps.isHoliday) {
      // Show holiday info
      setSelectedEvent({
        type: 'holiday',
        data: extendedProps.holiday
      });
    } else {
      // Show leave info
      setSelectedEvent({
        type: 'leave',
        data: extendedProps.leave,
        employee: extendedProps.employee
      });
      
      // Call parent callback if provided
      if (onEventClick) {
        onEventClick(extendedProps.leave);
      }
    }
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedEvent(null);
  };

  return (
    <>
      <Card>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          events={allEvents}
          eventClick={handleEventClick}
          height="auto"
          locale="vi"
          firstDay={1} // Start week on Monday
          weekends={true}
          eventDisplay="block"
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false
          }}
          dayMaxEvents={3}
          moreLinkClick="popover"
          eventContent={(eventInfo) => {
            // Custom event rendering with better styling
            const event = eventInfo.event;
            const extendedProps = event.extendedProps;
            let displayTitle = event.title;
            
            // Truncate long titles
            if (displayTitle.length > 30) {
              displayTitle = displayTitle.substring(0, 27) + '...';
            }
            
            return {
              html: `<div style="padding: 2px 4px; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500;">${displayTitle}</div>`
            };
          }}
        />
      </Card>

      {/* Event Detail Modal */}
      <Modal
        title={
          selectedEvent?.type === 'holiday' 
            ? 'Thông tin ngày lễ' 
            : 'Chi tiết đơn nghỉ phép'
        }
        open={modalVisible}
        onCancel={handleModalClose}
        footer={null}
        width={600}
      >
        {selectedEvent?.type === 'holiday' && selectedEvent.data && (
          <div>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text strong>Ngày: </Text>
                <Text>{moment(selectedEvent.data.date).format('DD/MM/YYYY')}</Text>
              </div>
              <div>
                <Text strong>Tên ngày lễ: </Text>
                <Text>{selectedEvent.data.name}</Text>
              </div>
              {selectedEvent.data.type && (
                <div>
                  <Text strong>Loại: </Text>
                  <Tag color="blue">{selectedEvent.data.type}</Tag>
                </div>
              )}
              {selectedEvent.data.workRate && (
                <div>
                  <Text strong>Hệ số lương: </Text>
                  <Tag color="purple">x{selectedEvent.data.workRate}</Tag>
                </div>
              )}
            </Space>
          </div>
        )}

        {selectedEvent?.type === 'leave' && selectedEvent.data && (
          <div>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {/* Employee Info (for admin/manager) */}
              {(userRole === 'manager' || userRole === 'admin') && selectedEvent.employee && (
                <>
                  <Divider orientation="left">Thông tin nhân viên</Divider>
                  <div>
                    <UserOutlined /> <Text strong>Tên: </Text>
                    <Text>{selectedEvent.employee.name || 'Không xác định'}</Text>
                  </div>
                  {selectedEvent.employee.employeeId && (
                    <div>
                      <Text strong>Mã NV: </Text>
                      <Text>{selectedEvent.employee.employeeId}</Text>
                    </div>
                  )}
                  {selectedEvent.employee.position && (
                    <div>
                      <Text strong>Chức vụ: </Text>
                      <Text>{selectedEvent.employee.position}</Text>
                    </div>
                  )}
                </>
              )}

              <Divider orientation="left">Thông tin đơn nghỉ</Divider>

              {/* Status */}
              <div>
                <Text strong>Trạng thái: </Text>
                {(() => {
                  const statusInfo = getStatusInfo(selectedEvent.data.status);
                  return (
                    <Tag color={statusInfo.color} icon={statusInfo.icon}>
                      {statusInfo.text}
                    </Tag>
                  );
                })()}
              </div>

              {/* Leave Type */}
              <div>
                <Text strong>Loại nghỉ: </Text>
                <Tag color="blue">
                  {getLeaveTypeText(selectedEvent.data.leaveType || selectedEvent.data.type)}
                </Tag>
              </div>

              {/* Date Range */}
              <div>
                <CalendarOutlined /> <Text strong>Thời gian: </Text>
                <Text>
                  {moment(selectedEvent.data.startDate).format('DD/MM/YYYY')} - {moment(selectedEvent.data.endDate).format('DD/MM/YYYY')}
                </Text>
              </div>

              {/* Total Days */}
              <div>
                <Text strong>Số ngày: </Text>
                <Text>{selectedEvent.data.totalDays || 1} ngày</Text>
              </div>

              {/* Reason */}
              <div>
                <Text strong>Lý do: </Text>
                <div style={{ 
                  marginTop: 8, 
                  padding: 12, 
                  backgroundColor: '#f5f5f5', 
                  borderRadius: 4 
                }}>
                  <Text>{selectedEvent.data.reason || 'Không có'}</Text>
                </div>
              </div>

              {/* Review Info */}
              {selectedEvent.data.status !== 'pending' && (
                <>
                  <Divider orientation="left">Thông tin duyệt</Divider>
                  {selectedEvent.data.reviewedAt && (
                    <div>
                      <Text strong>Ngày duyệt: </Text>
                      <Text>{moment(selectedEvent.data.reviewedAt).format('DD/MM/YYYY HH:mm')}</Text>
                    </div>
                  )}
                  {selectedEvent.data.reviewedBy && (
                    <div>
                      <Text strong>Người duyệt: </Text>
                      <Text>{selectedEvent.data.reviewedBy.username || 'Không xác định'}</Text>
                    </div>
                  )}
                  {selectedEvent.data.reviewComment && (
                    <div>
                      <Text strong>Ghi chú: </Text>
                      <div style={{ 
                        marginTop: 8, 
                        padding: 12, 
                        backgroundColor: '#f5f5f5', 
                        borderRadius: 4 
                      }}>
                        <Text>{selectedEvent.data.reviewComment}</Text>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Applied At */}
              {selectedEvent.data.appliedAt && (
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Đã gửi: {moment(selectedEvent.data.appliedAt).format('DD/MM/YYYY HH:mm')}
                  </Text>
                </div>
              )}
            </Space>
          </div>
        )}
      </Modal>
    </>
  );
};

export default LeaveCalendar;

