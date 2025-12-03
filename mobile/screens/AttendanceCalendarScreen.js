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
import { attendanceAPI } from '../services/api';
import moment from 'moment';
import 'moment/locale/vi';

moment.locale('vi');

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export default function AttendanceCalendarScreen() {
  const [currentMonth, setCurrentMonth] = useState(moment());
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadAttendances();
  }, [currentMonth]);

  const loadAttendances = async () => {
    try {
      setLoading(true);
      const startDate = currentMonth.clone().startOf('month').format('YYYY-MM-DD');
      const endDate = currentMonth.clone().endOf('month').format('YYYY-MM-DD');
      
      const response = await attendanceAPI.getMyAttendance(startDate, endDate);
      if (response.success) {
        // Convert array to object with date as key
        const dataMap = {};
        (response.data || []).forEach(att => {
          const dateKey = moment(att.date).format('YYYY-MM-DD');
          dataMap[dateKey] = att;
        });
        setAttendanceData(dataMap);
      }
    } catch (error) {
      console.error('Error loading attendances:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAttendances();
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
    if (!attendance) return 'absent'; // Không có dữ liệu = nghỉ
    if (attendance.status === 'present') return 'present';
    if (attendance.status === 'absent') return 'absent';
    if (attendance.status === 'leave') return 'leave';
    if (attendance.checkIn?.time) return 'present';
    return 'absent';
  };

  const getDayColor = (status) => {
    switch (status) {
      case 'present':
        return '#52c41a'; // Xanh
      case 'absent':
        return '#ff4d4f'; // Đỏ
      case 'leave':
        return '#faad14'; // Vàng (nghỉ phép)
      default:
        return '#d9d9d9';
    }
  };

  const handleDayPress = (dateKey) => {
    const attendance = attendanceData[dateKey];
    if (attendance) {
      setSelectedDay({ date: dateKey, data: attendance });
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
    const startDay = startOfMonth.day(); // 0 = CN
    const daysInMonth = endOfMonth.date();
    const today = moment().format('YYYY-MM-DD');

    const days = [];
    
    // Empty cells before first day
    for (let i = 0; i < startDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }
    
    // Days of month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = currentMonth.clone().date(d).format('YYYY-MM-DD');
      const status = getDayStatus(dateKey);
      const isToday = dateKey === today;
      const hasData = !!attendanceData[dateKey];
      const isFuture = moment(dateKey).isAfter(moment(), 'day');
      const isWeekend = moment(dateKey).day() === 0 || moment(dateKey).day() === 6;

      days.push(
        <TouchableOpacity
          key={dateKey}
          style={[
            styles.dayCell,
            isToday && styles.todayCell,
          ]}
          onPress={() => handleDayPress(dateKey)}
          disabled={!hasData}
        >
          <View
            style={[
              styles.dayContent,
              hasData && { backgroundColor: getDayColor(status) },
              isFuture && styles.futureDay,
              isWeekend && !hasData && styles.weekendDay,
            ]}
          >
            <Text
              style={[
                styles.dayText,
                hasData && styles.dayTextWithData,
                isToday && styles.todayText,
                isFuture && styles.futureText,
              ]}
            >
              {d}
            </Text>
          </View>
          {isToday && <View style={styles.todayDot} />}
        </TouchableOpacity>
      );
    }

    // Split into rows of 7
    const rows = [];
    for (let i = 0; i < days.length; i += 7) {
      rows.push(
        <View key={i} style={styles.weekRow}>
          {days.slice(i, i + 7)}
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
    </View>
  );

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

          {selectedDay?.data && (
            <ScrollView style={styles.modalBody}>
              {/* Status */}
              <View style={styles.detailRow}>
                <Ionicons name="checkmark-circle" size={20} color="#1890ff" />
                <Text style={styles.detailLabel}>Trạng thái:</Text>
                <View style={[styles.statusBadge, { backgroundColor: getDayColor(getDayStatus(selectedDay.date)) }]}>
                  <Text style={styles.statusText}>
                    {getDayStatus(selectedDay.date) === 'present' ? 'Có mặt' : 
                     getDayStatus(selectedDay.date) === 'leave' ? 'Nghỉ phép' : 'Vắng'}
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
                    { color: selectedDay.data.checkOut.status === 'on-time' ? '#52c41a' : '#faad14' }]}>
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
                  <Text style={styles.detailValue}>
                    {selectedDay.data.overtimeHours.toFixed(1)} giờ
                  </Text>
                </View>
              )}

              {/* OT salary */}
              {selectedDay.data.estimatedOTSalary > 0 && (
                <View style={styles.detailRow}>
                  <Ionicons name="cash" size={20} color="#52c41a" />
                  <Text style={styles.detailLabel}>Lương OT:</Text>
                  <Text style={[styles.detailValue, { color: '#52c41a' }]}>
                    +{selectedDay.data.estimatedOTSalary.toLocaleString('vi-VN')}đ
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
                    -{selectedDay.data.actualPenalty.toLocaleString('vi-VN')}đ
                  </Text>
                </View>
              )}
            </ScrollView>
          )}

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
              {Object.values(attendanceData).reduce((sum, a) => sum + (a.overtimeHours || 0), 0).toFixed(1)}
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
    marginBottom: 8,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
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
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
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






