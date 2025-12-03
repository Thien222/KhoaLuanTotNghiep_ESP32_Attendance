import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { attendanceAPI, leaveAPI } from '../services/api';
import moment from 'moment';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [leaveStats, setLeaveStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [attendanceRes, leaveRes] = await Promise.all([
        attendanceAPI.getTodayAttendance().catch(() => ({ success: false })),
        leaveAPI.getLeaveStats().catch(() => ({ success: false })),
      ]);

      if (attendanceRes.success) {
        setTodayAttendance(attendanceRes.data);
      }

      if (leaveRes.success) {
        setLeaveStats(leaveRes.data);
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

  const handleCheckIn = async () => {
    try {
      const response = await attendanceAPI.addAttendance('checkin');
      if (response.success) {
        Alert.alert('Thành công', 'Check-in thành công!');
        loadData();
      } else {
        Alert.alert('Lỗi', response.message || 'Check-in thất bại');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể kết nối đến server');
    }
  };

  const handleCheckOut = async () => {
    try {
      const response = await attendanceAPI.addAttendance('checkout');
      if (response.success) {
        Alert.alert('Thành công', 'Check-out thành công!');
        loadData();
      } else {
        Alert.alert('Lỗi', response.message || 'Check-out thất bại');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể kết nối đến server');
    }
  };

  const StatCard = ({ icon, title, value, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Ionicons name={icon} size={24} color={color} />
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <Text style={styles.greeting}>
          Xin chào, {user?.employee?.name || user?.username || 'User'}!
        </Text>
        <Text style={styles.date}>{moment().format('DD/MM/YYYY')}</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Today's Attendance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chấm công hôm nay</Text>
          {todayAttendance?.data ? (
            <View style={styles.attendanceCard}>
              <View style={styles.attendanceRow}>
                <Ionicons name="log-in-outline" size={20} color="#52c41a" />
                <Text style={styles.attendanceText}>
                  Check-in: {todayAttendance.data.checkIn?.time 
                    ? moment(todayAttendance.data.checkIn.time).format('HH:mm')
                    : 'Chưa check-in'}
                </Text>
              </View>
              <View style={styles.attendanceRow}>
                <Ionicons name="log-out-outline" size={20} color="#ff4d4f" />
                <Text style={styles.attendanceText}>
                  Check-out: {todayAttendance.data.checkOut?.time
                    ? moment(todayAttendance.data.checkOut.time).format('HH:mm')
                    : 'Chưa check-out'}
                </Text>
              </View>
              {!todayAttendance.data.checkIn?.time && (
                <TouchableOpacity style={styles.checkInButton} onPress={handleCheckIn}>
                  <Text style={styles.checkInButtonText}>Check-in</Text>
                </TouchableOpacity>
              )}
              {todayAttendance.data.checkIn?.time && !todayAttendance.data.checkOut?.time && (
                <TouchableOpacity style={styles.checkOutButton} onPress={handleCheckOut}>
                  <Text style={styles.checkOutButtonText}>Check-out</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.attendanceCard}>
              <Text style={styles.noDataText}>Chưa có dữ liệu chấm công hôm nay</Text>
              <TouchableOpacity style={styles.checkInButton} onPress={handleCheckIn}>
                <Text style={styles.checkInButtonText}>Check-in</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Leave Stats */}
        {leaveStats?.data && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nghỉ phép</Text>
              <TouchableOpacity
                style={styles.leaveButton}
                onPress={() => navigation.navigate('Leave')}
              >
                <Ionicons name="add-circle-outline" size={20} color="#1890ff" />
                <Text style={styles.leaveButtonText}>Gửi đơn</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.statsGrid}>
              <StatCard
                icon="calendar"
                title="Đã dùng"
                value={leaveStats.data.used || 0}
                color="#ff4d4f"
              />
              <StatCard
                icon="checkmark-circle"
                title="Còn lại"
                value={leaveStats.data.remaining || 0}
                color="#52c41a"
              />
            </View>
          </View>
        )}

        {/* Quick Actions - Tính năng cá nhân */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tính năng cá nhân</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Attendance')}
            >
              <Ionicons name="calendar" size={24} color="#1890ff" />
              <Text style={styles.actionText}>Lịch chấm công</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Payroll')}
            >
              <Ionicons name="cash" size={24} color="#52c41a" />
              <Text style={styles.actionText}>Bảng lương</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Leave')}
            >
              <Ionicons name="document-text" size={24} color="#ff4d4f" />
              <Text style={styles.actionText}>Đơn nghỉ phép</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('ChatBot')}
            >
              <Ionicons name="chatbubble-ellipses" size={24} color="#722ed1" />
              <Text style={styles.actionText}>ChatBot hỗ trợ</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Ionicons name="person" size={24} color="#faad14" />
              <Text style={styles.actionText}>Hồ sơ cá nhân</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e6f7ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1890ff',
  },
  leaveButtonText: {
    fontSize: 14,
    color: '#1890ff',
    fontWeight: '600',
    marginLeft: 4,
  },
  attendanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  attendanceText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  checkInButton: {
    backgroundColor: '#52c41a',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  checkInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  checkOutButton: {
    backgroundColor: '#ff4d4f',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  checkOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statContent: {
    marginLeft: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    fontSize: 12,
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
});

