import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { attendanceAPI, leaveAPI } from '../services/api';
import moment from 'moment';
import 'moment/locale/vi';

moment.locale('vi');

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export default function AttendanceCalendarScreen() {
  const [currentMonth, setCurrentMonth] = useState(moment());
  const [attendanceData, setAttendanceData] = useState({});
  const [leaveData, setLeaveData] = useState({}); // Map date -> leave object
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  const loadData = async () => {
    try {
      setLoading(true);
      const startDate = currentMonth.clone().startOf('month').format('YYYY-MM-DD');
      const endDate = currentMonth.clone().endOf('month').format('YYYY-MM-DD');
      
      // Load attendance
      const attendanceResponse = await attendanceAPI.getMyAttendance(startDate, endDate);
      if (attendanceResponse.success) {
        const dataMap = {};
        (attendanceResponse.data || []).forEach(att => {
          const dateKey = moment(att.date).format('YYYY-MM-DD');
          dataMap[dateKey] = att;
        });
        setAttendanceData(dataMap);
      }

      // Load approved leaves
      const leaveResponse = await leaveAPI.getMyLeaves();
      if (leaveResponse.success) {
        const leaveMap = {};
        (leaveResponse.data || []).forEach(leave => {
          // Only show approved leaves
          if (leave.status === 'approved') {
            const start = moment(leave.startDate);
            const end = moment(leave.endDate);
            const current = start.clone();
            
            // Add all days in the leave range
            while (current.isSameOrBefore(end, 'day')) {
              const dateKey = current.format('YYYY-MM-DD');
              // Only add if within current month
              if (current.month() === currentMonth.month() && current.year() === currentMonth.year()) {
                leaveMap[dateKey] = leave;
              }
              current.add(1, 'day');
            }
          }
        });
        setLeaveData(leaveMap);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const goToPrevMonth = () => {
    setCurrentMonth(prev => prev.clone().subtract(1, 'month'));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => prev.clone().add(1, 'month'));
  };

  const getDayStatus = (dateKey) => {
    const attendance = attendanceData[dateKey];
    const leave = leaveData[dateKey];
    const date = moment(dateKey);
    const isPast = date.isBefore(moment(), 'day');
    const isSunday = date.day() === 0; // Chỉ Chủ nhật mới không tính
    const isSaturday = date.day() === 6; // Thứ 7 vẫn tính là ngày làm việc
    
    // Nghỉ phép đã duyệt
    if (leave && leave.status === 'approved') {
      return 'leave';
    }
    
    // Có attendance
    if (attendance) {
      // Có OT
      if (attendance.overtimeHours > 0) {
        return 'overtime';
      }
      // Có mặt
      if (attendance.status === 'present' || attendance.checkIn?.time) {
        return 'present';
      }
      // Vắng
      if (attendance.status === 'absent') {
        return 'absent';
      }
    }
    
    // Không có attendance - kiểm tra nếu là ngày quá khứ
    // Thứ 7 vẫn tính vắng, chỉ Chủ nhật mới không tính
    if (isPast && !isSunday) {
      return 'absent'; // Vắng (bao gồm cả thứ 7)
    }
    
    return null; // Future hoặc Chủ nhật không có data
  };

  const getDayColor = (status) => {
    switch (status) {
      case 'present':
        return '#52c41a'; // Xanh - Có mặt
      case 'absent':
        return '#ff4d4f'; // Đỏ - Vắng
      case 'leave':
        return '#faad14'; // Vàng - Nghỉ phép
      case 'overtime':
        return '#722ed1'; // Tím - OT
      default:
        return '#d9d9d9'; // Xám - Chưa có dữ liệu
    }
  };

  const handleDayPress = (dateKey) => {
    const attendance = attendanceData[dateKey];
    const leave = leaveData[dateKey];
    const status = getDayStatus(dateKey);
    
    // Cho phép click vào ngày có dữ liệu hoặc ngày vắng
    if (attendance || leave || status === 'absent') {
      setSelectedDay({ 
        date: dateKey, 
        data: attendance, 
        leave: leave,
        status: status 
      });
      setModalVisible(true);
    }
  };

  const renderCalendarHeader = () => (
    <View style={styles.calendarHeader}>
      <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
        <Ionicons name="chevron-back" size={24} color="#1890ff" />
      </TouchableOpacity>
      <Text style={styles.monthTitle}>
        Tháng {currentMonth.format('MM/YYYY')}
      </Text>
      <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
        <Ionicons name="chevron-forward" size={24} color="#1890ff" />
      </TouchableOpacity>
    </View>
  );

  const renderWeekDays = () => (
    <View style={styles.weekDaysRow}>
      {WEEKDAYS.map((day, index) => (
        <View key={index} style={styles.weekDayCell}>
          <Text style={[styles.weekDayText, index === 0 && styles.sundayText]}>
            {day}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderCalendarDays = () => {
    const startOfMonth = currentMonth.clone().startOf('month');
    const endOfMonth = currentMonth.clone().endOf('month');
    const startDay = startOfMonth.day(); // 0 = CN (Chủ nhật), 1 = T2, ..., 6 = T7
    const daysInMonth = endOfMonth.date();
    const today = moment().format('YYYY-MM-DD');

    const days = [];
    
    // Empty cells before first day - đảm bảo cùng kích thước với cells có ngày
    for (let i = 0; i < startDay; i++) {
      days.push(
        <View key={`empty-${i}`} style={styles.dayCell}>
          <View style={[styles.dayContent, { backgroundColor: 'transparent' }]} />
        </View>
      );
    }
    
    // Days of month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = currentMonth.clone().date(d).format('YYYY-MM-DD');
      const status = getDayStatus(dateKey);
      const isToday = dateKey === today;
      const hasData = !!attendanceData[dateKey] || !!leaveData[dateKey] || status === 'absent';
      const isFuture = moment(dateKey).isAfter(moment(), 'day');
      const isSunday = moment(dateKey).day() === 0; // Chỉ Chủ nhật mới không tính
      const color = getDayColor(status);

      days.push(
        <TouchableOpacity
          key={dateKey}
          style={[
            styles.dayCell,
            isToday && styles.todayCell,
          ]}
          onPress={() => handleDayPress(dateKey)}
          disabled={!hasData && isFuture}
        >
          <View
            style={[
              styles.dayContent,
              hasData && status && { backgroundColor: color },
              isFuture && !hasData && styles.futureDay,
              isSunday && !hasData && styles.weekendDay,
            ]}
          >
            <Text
              style={[
                styles.dayText,
                hasData && status && styles.dayTextWithData,
                isToday && styles.todayText,
                isFuture && !hasData && styles.futureText,
              ]}
            >
              {d}
            </Text>
          </View>
          {isToday && <View style={styles.todayDot} />}
        </TouchableOpacity>
      );
    }

    // Split into rows of 7 - đảm bảo mỗi hàng có đúng 7 cells
    const rows = [];
    for (let i = 0; i < days.length; i += 7) {
      const weekDays = days.slice(i, i + 7);
      // Đảm bảo mỗi hàng có đủ 7 cells (thêm empty cells nếu thiếu)
      while (weekDays.length < 7) {
        weekDays.push(
          <View key={`empty-end-${weekDays.length}`} style={styles.dayCell}>
            <View style={[styles.dayContent, { backgroundColor: 'transparent' }]} />
          </View>
        );
      }
      rows.push(
        <View key={i} style={styles.weekRow}>
          {weekDays}
        </View>
      );
    }

    return rows;
  };

  const renderLegend = () => (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: '#52c41a' }]} />
        <Text style={styles.legendText}>Có mặt</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: '#ff4d4f' }]} />
        <Text style={styles.legendText}>Vắng</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: '#faad14' }]} />
        <Text style={styles.legendText}>Nghỉ phép</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: '#722ed1' }]} />
        <Text style={styles.legendText}>OT</Text>
      </View>
    </View>
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount || 0);
  };

  const renderDetailModal = () => (
    <Modal
      visible={modalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Chi tiết ngày {selectedDay?.date ? moment(selectedDay.date).format('DD/MM/YYYY') : ''}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {selectedDay?.leave && selectedDay.leave.status === 'approved' ? (
              // Nghỉ phép
              <View>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={20} color="#faad14" />
                  <Text style={styles.detailLabel}>Trạng thái:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: '#faad14' }]}>
                    <Text style={styles.statusText}>Nghỉ phép</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="document-text-outline" size={20} color="#1890ff" />
                  <Text style={styles.detailLabel}>Loại nghỉ:</Text>
                  <Text style={styles.detailValue}>
                    {selectedDay.leave.leaveType === 'annual' ? 'Nghỉ phép năm' :
                     selectedDay.leave.leaveType === 'sick' ? 'Nghỉ ốm' :
                     selectedDay.leave.leaveType === 'unpaid' ? 'Nghỉ không lương' :
                     selectedDay.leave.leaveType === 'maternity' ? 'Nghỉ thai sản' : 'Khác'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="chatbubble-outline" size={20} color="#666" />
                  <Text style={styles.detailLabel}>Lý do:</Text>
                  <Text style={styles.detailValue}>{selectedDay.leave.reason}</Text>
                </View>
              </View>
            ) : selectedDay?.data ? (
              // Có attendance
              <>
                {/* Status */}
                <View style={styles.detailRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#1890ff" />
                  <Text style={styles.detailLabel}>Trạng thái:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getDayColor(selectedDay.status) }]}>
                    <Text style={styles.statusText}>
                      {selectedDay.status === 'present' ? 'Có mặt' : 
                       selectedDay.status === 'overtime' ? 'Có mặt + OT' : 
                       selectedDay.status === 'absent' ? 'Vắng' : 'Nghỉ phép'}
                    </Text>
                  </View>
                </View>

                {/* Check-in time */}
                <View style={styles.detailRow}>
                  <Ionicons name="log-in" size={20} color="#52c41a" />
                  <Text style={styles.detailLabel}>Check-in:</Text>
                  <Text style={styles.detailValue}>
                    {selectedDay.data.checkIn?.time 
                      ? moment(selectedDay.data.checkIn.time).format('HH:mm')
                      : 'Chưa có'}
                  </Text>
                  {selectedDay.data.checkIn?.status && (
                    <Text style={[styles.detailStatus, 
                      { color: selectedDay.data.checkIn.status === 'on-time' ? '#52c41a' : '#ff4d4f' }]}>
                      ({selectedDay.data.checkIn.status === 'on-time' ? 'Đúng giờ' : 
                        selectedDay.data.checkIn.status === 'late' ? 'Trễ' : selectedDay.data.checkIn.status})
                    </Text>
                  )}
                </View>

                {/* Check-out time */}
                <View style={styles.detailRow}>
                  <Ionicons name="log-out" size={20} color="#ff4d4f" />
                  <Text style={styles.detailLabel}>Check-out:</Text>
                  <Text style={styles.detailValue}>
                    {selectedDay.data.checkOut?.time 
                      ? moment(selectedDay.data.checkOut.time).format('HH:mm')
                      : 'Chưa có'}
                  </Text>
                  {selectedDay.data.checkOut?.status && (
                    <Text style={[styles.detailStatus,
                      { color: selectedDay.data.checkOut.status === 'on-time' ? '#52c41a' : 
                             selectedDay.data.checkOut.status === 'overtime' ? '#722ed1' : '#faad14' }]}>
                      ({selectedDay.data.checkOut.status === 'on-time' ? 'Đúng giờ' : 
                        selectedDay.data.checkOut.status === 'early' ? 'Về sớm' : 
                        selectedDay.data.checkOut.status === 'overtime' ? 'OT' : selectedDay.data.checkOut.status})
                    </Text>
                  )}
                </View>

                {/* Working hours */}
                <View style={styles.detailRow}>
                  <Ionicons name="time" size={20} color="#1890ff" />
                  <Text style={styles.detailLabel}>Giờ làm:</Text>
                  <Text style={styles.detailValue}>
                    {selectedDay.data.workingHours 
                      ? `${selectedDay.data.workingHours.toFixed(1)} giờ` 
                      : 'Chưa có'}
                  </Text>
                </View>

                {/* OT hours */}
                {selectedDay.data.overtimeHours > 0 && (
                  <View style={styles.detailRow}>
                    <Ionicons name="flash" size={20} color="#722ed1" />
                    <Text style={styles.detailLabel}>Giờ OT:</Text>
                    <Text style={[styles.detailValue, { color: '#722ed1' }]}>
                      {selectedDay.data.overtimeHours.toFixed(2)} giờ
                    </Text>
                  </View>
                )}

                {/* OT salary */}
                {selectedDay.data.estimatedOTSalary > 0 && (
                  <View style={styles.detailRow}>
                    <Ionicons name="cash" size={20} color="#52c41a" />
                    <Text style={styles.detailLabel}>Tiền OT:</Text>
                    <Text style={[styles.detailValue, { color: '#52c41a' }]}>
                      +{formatCurrency(selectedDay.data.estimatedOTSalary)}
                    </Text>
                  </View>
                )}

                {/* Late minutes */}
                {selectedDay.data.lateMinutes > 0 && (
                  <View style={styles.detailRow}>
                    <Ionicons name="alarm" size={20} color="#ff4d4f" />
                    <Text style={styles.detailLabel}>Trễ:</Text>
                    <Text style={[styles.detailValue, { color: '#ff4d4f' }]}>
                      {selectedDay.data.lateMinutes} phút
                    </Text>
                  </View>
                )}

                {/* Penalty */}
                {selectedDay.data.actualPenalty > 0 && (
                  <View style={styles.detailRow}>
                    <Ionicons name="warning" size={20} color="#ff4d4f" />
                    <Text style={styles.detailLabel}>Phạt:</Text>
                    <Text style={[styles.detailValue, { color: '#ff4d4f' }]}>
                      -{formatCurrency(selectedDay.data.actualPenalty)}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              // Vắng (không có attendance và không phải nghỉ phép)
              <View>
                <View style={styles.detailRow}>
                  <Ionicons name="close-circle" size={20} color="#ff4d4f" />
                  <Text style={styles.detailLabel}>Trạng thái:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: '#ff4d4f' }]}>
                    <Text style={styles.statusText}>Vắng</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="information-circle-outline" size={20} color="#666" />
                  <Text style={styles.detailLabel}>Thông tin:</Text>
                  <Text style={styles.detailValue}>Không có dữ liệu chấm công</Text>
                </View>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}
          >
            <Text style={styles.closeButtonText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1890ff" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="calendar" size={24} color="#1890ff" />
        <Text style={styles.headerTitle}>Lịch chấm công</Text>
      </View>

      {/* Calendar */}
      <View style={styles.calendar}>
        {renderCalendarHeader()}
        {renderWeekDays()}
        {renderCalendarDays()}
      </View>

      {/* Legend */}
      {renderLegend()}

      {/* Summary */}
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Thống kê tháng {currentMonth.format('MM/YYYY')}</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {Object.values(attendanceData).filter(a => a.status === 'present' || a.checkIn?.time).length}
            </Text>
            <Text style={styles.summaryLabel}>Ngày có mặt</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#ff4d4f' }]}>
              {Object.values(attendanceData).filter(a => a.lateMinutes > 0).length}
            </Text>
            <Text style={styles.summaryLabel}>Lần đi trễ</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#722ed1' }]}>
              {Object.values(attendanceData).reduce((sum, a) => sum + (a.overtimeHours || 0), 0).toFixed(2)}
            </Text>
            <Text style={styles.summaryLabel}>Giờ OT</Text>
          </View>
        </View>
      </View>

      {renderDetailModal()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginLeft: 10,
  },
  calendar: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    minHeight: 32,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  sundayText: {
    color: '#ff4d4f',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
    minHeight: 44,
  },
  dayContent: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
    color: '#333',
  },
  dayTextWithData: {
    color: '#fff',
    fontWeight: '600',
  },
  todayCell: {
    // Special styling for today
  },
  todayText: {
    fontWeight: '700',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1890ff',
    marginTop: 2,
  },
  futureDay: {
    backgroundColor: '#f5f5f5',
  },
  futureText: {
    color: '#bbb',
  },
  weekendDay: {
    backgroundColor: '#fafafa',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  summary: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#52c41a',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  modalBody: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  detailStatus: {
    fontSize: 12,
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    margin: 16,
    backgroundColor: '#1890ff',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
