import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { attendanceAPI } from '../services/api';
import moment from 'moment';

export default function AttendanceScreen() {
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAttendances();
  }, []);

  const loadAttendances = async () => {
    try {
      setLoading(true);
      const startDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
      const endDate = moment().format('YYYY-MM-DD');
      
      const response = await attendanceAPI.getMyAttendance(startDate, endDate);
      if (response.success) {
        setAttendances(response.data || []);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'on-time':
        return '#52c41a';
      case 'late':
        return '#ff4d4f';
      case 'early':
        return '#faad14';
      case 'overtime':
        return '#1890ff';
      default:
        return '#999';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'on-time':
        return 'Đúng giờ';
      case 'late':
        return 'Muộn';
      case 'early':
        return 'Về sớm';
      case 'overtime':
        return 'Làm thêm';
      default:
        return status;
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.dateText}>
          {moment(item.date).format('DD/MM/YYYY')}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.checkIn?.status) }]}>
          <Text style={styles.statusText}>
            {getStatusText(item.checkIn?.status || item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.timeRow}>
        <View style={styles.timeItem}>
          <Ionicons name="log-in-outline" size={16} color="#52c41a" />
          <Text style={styles.timeText}>
            {item.checkIn?.time
              ? moment(item.checkIn.time).format('HH:mm')
              : 'Chưa check-in'}
          </Text>
        </View>
        <View style={styles.timeItem}>
          <Ionicons name="log-out-outline" size={16} color="#ff4d4f" />
          <Text style={styles.timeText}>
            {item.checkOut?.time
              ? moment(item.checkOut.time).format('HH:mm')
              : 'Chưa check-out'}
          </Text>
        </View>
      </View>

      {item.workingHours > 0 && (
        <View style={styles.workingHours}>
          <Ionicons name="time-outline" size={16} color="#1890ff" />
          <Text style={styles.workingHoursText}>
            Tổng giờ làm: {item.workingHours.toFixed(2)}h
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={attendances}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Chưa có dữ liệu chấm công</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 16,
  },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  workingHours: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  workingHoursText: {
    fontSize: 14,
    color: '#1890ff',
    marginLeft: 8,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
});



