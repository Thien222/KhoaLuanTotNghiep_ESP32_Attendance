import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { overtimeAPI } from '../services/api';
import moment from 'moment';

export default function OTScheduleScreen({ navigation }) {
  const [otSchedule, setOtSchedule] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOTSchedule();
  }, []);

  const loadOTSchedule = async () => {
    try {
      setLoading(true);
      const response = await overtimeAPI.getMyOTSchedule();
      if (response.success) {
        // Lấy TẤT CẢ các ngày OT (bao gồm cả quá khứ) và sắp xếp
        const allOT = (response.data || []).sort((a, b) => new Date(a.date) - new Date(b.date));
        setOtSchedule(allOT);
      }
    } catch (error) {
      console.error('Error loading OT schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOTSchedule();
    setRefreshing(false);
  };

  const groupByMonth = (schedule) => {
    const grouped = {};
    schedule.forEach(ot => {
      const monthKey = moment(ot.date).format('YYYY-MM');
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(ot);
    });
    return grouped;
  };

  const groupedSchedule = groupByMonth(otSchedule);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch OT đã được gán</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {otSchedule.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Chưa có lịch OT nào được gán</Text>
            <Text style={styles.emptySubtext}>
              Quản lý sẽ gán ca OT cho bạn khi cần
            </Text>
          </View>
        ) : (
          Object.keys(groupedSchedule).map(monthKey => {
            const monthOT = groupedSchedule[monthKey];
            return (
              <View key={monthKey} style={styles.monthSection}>
                <View style={styles.monthHeader}>
                  <Ionicons name="calendar-outline" size={20} color="#722ed1" />
                  <Text style={styles.monthTitle}>
                    {moment(monthKey).format('MMMM YYYY')}
                  </Text>
                  <Text style={styles.monthCount}>({monthOT.length} ngày)</Text>
                </View>

                {monthOT.map((ot, index) => {
                  const isToday = moment(ot.date).isSame(moment(), 'day');
                  const isPast = moment(ot.date).isBefore(moment(), 'day');
                  
                  return (
                    <View
                      key={index}
                      style={[
                        styles.otItem,
                        isToday && styles.otItemToday,
                        isPast && styles.otItemPast
                      ]}
                    >
                      <View style={styles.otDateBadge}>
                        <Text style={styles.otDay}>
                          {moment(ot.date).format('DD')}
                        </Text>
                        <Text style={styles.otMonth}>
                          {moment(ot.date).format('MMM')}
                        </Text>
                        <Text style={styles.otWeekday}>
                          {moment(ot.date).format('ddd')}
                        </Text>
                      </View>
                      <View style={styles.otDetails}>
                        <View style={styles.otHeaderRow}>
                          <Text style={styles.otShiftName}>
                            {ot.shift?.name || 'Ca OT'}
                          </Text>
                          {isToday && (
                            <View style={styles.todayBadge}>
                              <Text style={styles.todayBadgeText}>Hôm nay</Text>
                            </View>
                          )}
                          {isPast && (
                            <View style={styles.pastBadge}>
                              <Text style={styles.pastBadgeText}>Đã qua</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.otTimeRow}>
                          <Ionicons name="time-outline" size={16} color="#666" />
                          <Text style={styles.otTime}>
                            {ot.shift?.startTime || '18:00'} - {ot.shift?.endTime || '23:59'}
                          </Text>
                        </View>
                        {ot.type === 'request' && (
                          <View style={styles.otTypeRow}>
                            <Ionicons name="document-text-outline" size={14} color="#1890ff" />
                            <Text style={styles.otTypeText}>Đơn OT đã duyệt</Text>
                          </View>
                        )}
                        {ot.type === 'shift' && (
                          <View style={styles.otTypeRow}>
                            <Ionicons name="calendar-outline" size={14} color="#722ed1" />
                            <Text style={styles.otTypeText}>Ca OT được gán</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.otBadge}>
                        <Text style={styles.otBadgeText}>OT</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  monthSection: {
    marginBottom: 24,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
    textTransform: 'capitalize',
  },
  monthCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  otItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  otItemToday: {
    borderWidth: 2,
    borderColor: '#722ed1',
    backgroundColor: '#f9f0ff',
  },
  otItemPast: {
    opacity: 0.6,
  },
  otDateBadge: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#f0f5ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  otDay: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#722ed1',
  },
  otMonth: {
    fontSize: 11,
    color: '#722ed1',
    textTransform: 'uppercase',
    marginTop: -2,
  },
  otWeekday: {
    fontSize: 10,
    color: '#722ed1',
    marginTop: 2,
  },
  otDetails: {
    flex: 1,
  },
  otHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  otShiftName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  todayBadge: {
    backgroundColor: '#722ed1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  todayBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  pastBadge: {
    backgroundColor: '#d9d9d9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  pastBadgeText: {
    color: '#666',
    fontSize: 11,
    fontWeight: '600',
  },
  otTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  otTime: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  otTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  otTypeText: {
    fontSize: 12,
    color: '#1890ff',
    marginLeft: 4,
  },
  otBadge: {
    backgroundColor: '#722ed1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  otBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

