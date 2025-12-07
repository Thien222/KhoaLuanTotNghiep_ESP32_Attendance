import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { leaveAPI } from '../services/api';
import moment from 'moment';

export default function LeaveDetailScreen({ route, navigation }) {
  const { leaveId } = route.params;
  const [leave, setLeave] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaveDetail();
  }, [leaveId]);

  const loadLeaveDetail = async () => {
    try {
      setLoading(true);
      const response = await leaveAPI.getMyLeaves();
      if (response.success) {
        const foundLeave = response.data.find((l) => l._id === leaveId);
        setLeave(foundLeave);
      }
    } catch (error) {
      console.error('Error loading leave detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return '#52c41a';
      case 'rejected':
        return '#ff4d4f';
      case 'pending':
        return '#faad14';
      default:
        return '#999';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved':
        return 'Đã duyệt';
      case 'rejected':
        return 'Từ chối';
      case 'pending':
        return 'Chờ duyệt';
      default:
        return status;
    }
  };

  const getLeaveTypeText = (type) => {
    const map = {
      annual: 'Nghỉ phép năm',
      sick: 'Nghỉ ốm',
      unpaid: 'Nghỉ không lương',
      maternity: 'Thai sản',
      other: 'Khác'
    };
    return map[type] || type;
  };

  if (!leave) {
    return (
      <View style={styles.container}>
        <Text>Đang tải...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.leaveType}>{getLeaveTypeText(leave.leaveType || leave.type)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(leave.status) }]}>
            <Text style={styles.statusText}>{getStatusText(leave.status)}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={20} color="#1890ff" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Ngày bắt đầu</Text>
            <Text style={styles.detailValue}>
              {moment(leave.startDate).format('DD/MM/YYYY')}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={20} color="#1890ff" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Ngày kết thúc</Text>
            <Text style={styles.detailValue}>
              {moment(leave.endDate).format('DD/MM/YYYY')}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={20} color="#1890ff" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Số ngày</Text>
            <Text style={styles.detailValue}>{leave.days} ngày</Text>
          </View>
        </View>

        {leave.reason && (
          <View style={styles.detailRow}>
            <Ionicons name="document-text-outline" size={20} color="#1890ff" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Lý do</Text>
              <Text style={styles.detailValue}>{leave.reason}</Text>
            </View>
          </View>
        )}

        {leave.status === 'pending' && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              Alert.alert(
                'Hủy đơn',
                'Bạn có chắc chắn muốn hủy đơn nghỉ phép này?',
                [
                  { text: 'Không', style: 'cancel' },
                  {
                    text: 'Có',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        const response = await leaveAPI.cancelLeave(leave._id);
                        if (response.success) {
                          Alert.alert('Thành công', 'Đã hủy đơn nghỉ phép');
                          navigation.goBack();
                        }
                      } catch (error) {
                        Alert.alert('Lỗi', 'Không thể hủy đơn nghỉ phép');
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Text style={styles.cancelButtonText}>Hủy đơn nghỉ phép</Text>
          </TouchableOpacity>
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  leaveType: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  detailContent: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#ff4d4f',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});














