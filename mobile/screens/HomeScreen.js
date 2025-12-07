import React, { useState, useEffect, useRef } from 'react';
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
import { leaveAPI, overtimeAPI } from '../services/api';
import moment from 'moment';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [leaveStats, setLeaveStats] = useState(null);
  const [otSchedule, setOtSchedule] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // ✅ Lưu trạng thái đơn để so sánh và phát hiện thay đổi
  const lastLeaveStatusRef = useRef({});
  const lastOTStatusRef = useRef({});
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    loadData();
    
    // ✅ Setup polling để kiểm tra đơn mới (mỗi 10 giây)
    pollingIntervalRef.current = setInterval(() => {
      checkRequestStatus();
    }, 10000); // Check mỗi 10 giây

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [user, navigation]);

  // ✅ Kiểm tra trạng thái đơn và hiển thị thông báo nếu có thay đổi
  const checkRequestStatus = async () => {
    try {
      // Check leave requests
      const leaveResponse = await leaveAPI.getMyLeaves();
      if (leaveResponse.success) {
        const leaves = leaveResponse.data || [];
        leaves.forEach(leave => {
          const leaveId = leave._id;
          const currentStatus = leave.status;
          const lastStatus = lastLeaveStatusRef.current[leaveId];
          
          // Nếu status thay đổi từ pending sang approved/rejected
          if (lastStatus === 'pending' && (currentStatus === 'approved' || currentStatus === 'rejected')) {
            Alert.alert(
              currentStatus === 'approved' ? '✅ Đơn được duyệt' : '❌ Đơn bị từ chối',
              currentStatus === 'approved' 
                ? `Đơn nghỉ phép của bạn đã được duyệt` 
                : `Đơn nghỉ phép của bạn đã bị từ chối` +
                  (leave.reviewComment ? `\n\nGhi chú: ${leave.reviewComment}` : ''),
              [{ text: 'OK', onPress: () => navigation.navigate('Leave') }]
            );
          }
          lastLeaveStatusRef.current[leaveId] = currentStatus;
        });
      }

      // Check OT requests
      const otResponse = await overtimeAPI.getMyRequests();
      if (otResponse.success) {
        const otRequests = otResponse.data || [];
        otRequests.forEach(ot => {
          const otId = ot._id;
          const currentStatus = ot.status;
          const lastStatus = lastOTStatusRef.current[otId];
          
          // Nếu status thay đổi từ pending sang approved/rejected
          if (lastStatus === 'pending' && (currentStatus === 'approved' || currentStatus === 'rejected')) {
            Alert.alert(
              currentStatus === 'approved' ? '✅ Đơn được duyệt' : '❌ Đơn bị từ chối',
              currentStatus === 'approved' 
                ? `Đơn OT của bạn đã được duyệt` 
                : `Đơn OT của bạn đã bị từ chối` +
                  (ot.reviewComment ? `\n\nGhi chú: ${ot.reviewComment}` : ''),
              [{ text: 'OK' }]
            );
          }
          lastOTStatusRef.current[otId] = currentStatus;
        });
      }
    } catch (error) {
      console.error('Error checking request status:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [leaveRes, otRes, leaveRequestsRes, otRequestsRes] = await Promise.all([
        leaveAPI.getLeaveStats().catch(() => ({ success: false })),
        overtimeAPI.getMyOTSchedule().catch(() => ({ success: false })),
        leaveAPI.getMyLeaves().catch(() => ({ success: false })),
        overtimeAPI.getMyRequests().catch(() => ({ success: false })),
      ]);

      if (leaveRes.success) {
        setLeaveStats(leaveRes.data);
      }

      if (otRes.success) {
        // Lọc các ngày OT sắp tới (từ hôm nay trở đi)
        const upcomingOT = (otRes.data || []).filter(ot => 
          moment(ot.date).isSameOrAfter(moment(), 'day')
        ).slice(0, 5); // Lấy tối đa 5 ngày OT sắp tới
        setOtSchedule(upcomingOT);
      }

      // ✅ Lưu trạng thái ban đầu của đơn để so sánh sau này
      if (leaveRequestsRes.success) {
        const leaves = leaveRequestsRes.data || [];
        leaves.forEach(leave => {
          lastLeaveStatusRef.current[leave._id] = leave.status;
        });
      }

      if (otRequestsRes.success) {
        const otRequests = otRequestsRes.data || [];
        otRequests.forEach(ot => {
          lastOTStatusRef.current[ot._id] = ot.status;
        });
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
        {/* OT Schedule */}
        {otSchedule.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              onPress={() => navigation.navigate('OTSchedule')}
              activeOpacity={0.7}
            >
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Lịch OT đã được gán</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.viewAllText}>Xem tất cả</Text>
                  <Ionicons name="chevron-forward" size={20} color="#722ed1" />
                </View>
              </View>
            </TouchableOpacity>
            <View style={styles.otScheduleCard}>
              {otSchedule.slice(0, 3).map((ot, index) => (
                <View key={index} style={styles.otItem}>
                  <View style={styles.otDateBadge}>
                    <Text style={styles.otDay}>{moment(ot.date).format('DD')}</Text>
                    <Text style={styles.otMonth}>{moment(ot.date).format('MMM')}</Text>
                  </View>
                  <View style={styles.otDetails}>
                    <Text style={styles.otShiftName}>{ot.shift?.name || 'Ca OT'}</Text>
                    <View style={styles.otTimeRow}>
                      <Ionicons name="time-outline" size={14} color="#666" />
                      <Text style={styles.otTime}>
                        {ot.shift?.startTime} - {ot.shift?.endTime}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.otBadge}>
                    <Text style={styles.otBadgeText}>OT</Text>
                  </View>
                </View>
              ))}
              {otSchedule.length > 3 && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('OTSchedule')}
                  style={styles.viewMoreButton}
                >
                  <Text style={styles.viewMoreText}>
                    Xem thêm {otSchedule.length - 3} ngày OT khác
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

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
              onPress={() => navigation.navigate('InternalChat')}
            >
              <Ionicons name="chatbubbles" size={24} color="#1890ff" />
              <Text style={styles.actionText}>Chat nội bộ</Text>
            </TouchableOpacity>
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
  otScheduleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  otItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  otDateBadge: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f0f5ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  otDay: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#722ed1',
  },
  otMonth: {
    fontSize: 12,
    color: '#722ed1',
    textTransform: 'uppercase',
  },
  otDetails: {
    flex: 1,
  },
  otShiftName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  otTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  otTime: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  otBadge: {
    backgroundColor: '#722ed1',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  otBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: '#722ed1',
    fontWeight: '600',
    marginRight: 4,
  },
  viewMoreButton: {
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
  },
  viewMoreText: {
    fontSize: 14,
    color: '#722ed1',
    fontWeight: '600',
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

