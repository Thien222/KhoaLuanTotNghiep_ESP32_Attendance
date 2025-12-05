import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { overtimeAPI } from '../services/api';
import moment from 'moment';

export default function ApplyOvertimeScreen({ navigation }) {
  const [date, setDate] = useState(moment().format('YYYY-MM-DD'));
  const [startTime, setStartTime] = useState('17:30');
  const [endTime, setEndTime] = useState('20:00');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const calculateOTHours = () => {
    try {
      const start = moment(`${date} ${startTime}`, 'YYYY-MM-DD HH:mm');
      const end = moment(`${date} ${endTime}`, 'YYYY-MM-DD HH:mm');
      
      if (end.isBefore(start)) {
        return 0;
      }
      
      const hours = end.diff(start, 'minutes') / 60;
      return hours.toFixed(1);
    } catch (error) {
      return 0;
    }
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập lý do làm thêm giờ');
      return;
    }

    // Validate date format
    if (!moment(date, 'YYYY-MM-DD', true).isValid()) {
      Alert.alert('Lỗi', 'Ngày không hợp lệ. Vui lòng nhập theo định dạng YYYY-MM-DD (ví dụ: 2024-12-03)');
      return;
    }

    // Validate time format
    if (!moment(startTime, 'HH:mm', true).isValid()) {
      Alert.alert('Lỗi', 'Giờ bắt đầu không hợp lệ. Vui lòng nhập theo định dạng HH:mm (ví dụ: 17:30)');
      return;
    }

    if (!moment(endTime, 'HH:mm', true).isValid()) {
      Alert.alert('Lỗi', 'Giờ kết thúc không hợp lệ. Vui lòng nhập theo định dạng HH:mm (ví dụ: 20:00)');
      return;
    }

    const start = moment(`${date} ${startTime}`, 'YYYY-MM-DD HH:mm');
    const end = moment(`${date} ${endTime}`, 'YYYY-MM-DD HH:mm');
    
    if (end.isBefore(start) || end.isSame(start)) {
      Alert.alert('Lỗi', 'Giờ kết thúc phải sau giờ bắt đầu');
      return;
    }

    const otHours = calculateOTHours();
    if (otHours <= 0) {
      Alert.alert('Lỗi', 'Số giờ OT phải lớn hơn 0');
      return;
    }

    setLoading(true);
    try {
      const response = await overtimeAPI.createRequest({
        date: date,
        startTime: startTime,
        endTime: endTime,
        reason: reason.trim(),
      });

      if (response.success) {
        Alert.alert('Thành công', 'Đơn xin OT đã được gửi', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Lỗi', response.message || 'Không thể tạo đơn xin OT');
      }
    } catch (error) {
      console.error('Error submitting OT request:', error);
      Alert.alert('Lỗi', error.message || 'Không thể kết nối đến server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Ngày làm OT</Text>
          <View style={styles.dateInputContainer}>
            <Ionicons name="calendar-outline" size={20} color="#1890ff" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD (ví dụ: 2024-12-03)"
              value={date}
              onChangeText={setDate}
              keyboardType="default"
            />
          </View>
          <Text style={styles.hint}>Nhập ngày theo định dạng YYYY-MM-DD</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Giờ bắt đầu</Text>
          <View style={styles.dateInputContainer}>
            <Ionicons name="time-outline" size={20} color="#1890ff" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="HH:mm (ví dụ: 17:30)"
              value={startTime}
              onChangeText={setStartTime}
              keyboardType="default"
            />
          </View>
          <Text style={styles.hint}>Nhập giờ theo định dạng HH:mm (24h)</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Giờ kết thúc</Text>
          <View style={styles.dateInputContainer}>
            <Ionicons name="time-outline" size={20} color="#1890ff" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="HH:mm (ví dụ: 20:00)"
              value={endTime}
              onChangeText={setEndTime}
              keyboardType="default"
            />
          </View>
          <Text style={styles.hint}>Nhập giờ theo định dạng HH:mm (24h)</Text>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.hoursCard}>
            <Ionicons name="flash" size={24} color="#722ed1" />
            <View style={styles.hoursInfo}>
              <Text style={styles.hoursLabel}>Tổng giờ OT</Text>
              <Text style={styles.hoursValue}>{calculateOTHours()} giờ</Text>
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Lý do làm OT</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Nhập lý do làm thêm giờ..."
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Ionicons name="send" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.submitButtonText}>
            {loading ? 'Đang gửi...' : 'Gửi đơn xin OT'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 12,
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  hoursCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f5ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d6e4ff',
  },
  hoursInfo: {
    marginLeft: 12,
    flex: 1,
  },
  hoursLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  hoursValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#722ed1',
  },
  submitButton: {
    backgroundColor: '#722ed1',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#722ed1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});


