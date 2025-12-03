import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { leaveAPI } from '../services/api';
import moment from 'moment';

export default function ApplyLeaveScreen({ navigation }) {
  const [startDate, setStartDate] = useState(moment().format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(moment().format('YYYY-MM-DD'));
  const [reason, setReason] = useState('');
  const [leaveType, setLeaveType] = useState('annual'); // Đồng nhất với web
  const [loading, setLoading] = useState(false);

  const calculateDays = () => {
    const start = moment(startDate, 'YYYY-MM-DD');
    const end = moment(endDate, 'YYYY-MM-DD');
    const diff = end.diff(start, 'days');
    return diff + 1; // Include both start and end date
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập lý do nghỉ phép');
      return;
    }

    // Validate date format
    if (!moment(startDate, 'YYYY-MM-DD', true).isValid()) {
      Alert.alert('Lỗi', 'Ngày bắt đầu không hợp lệ. Vui lòng nhập theo định dạng YYYY-MM-DD (ví dụ: 2024-12-01)');
      return;
    }
    
    if (!moment(endDate, 'YYYY-MM-DD', true).isValid()) {
      Alert.alert('Lỗi', 'Ngày kết thúc không hợp lệ. Vui lòng nhập theo định dạng YYYY-MM-DD (ví dụ: 2024-12-05)');
      return;
    }

    const start = moment(startDate, 'YYYY-MM-DD');
    const end = moment(endDate, 'YYYY-MM-DD');
    
    if (end.isBefore(start)) {
      Alert.alert('Lỗi', 'Ngày kết thúc phải sau ngày bắt đầu');
      return;
    }

    setLoading(true);
    try {
      // Đồng nhất payload với web: dùng leaveType, bỏ days (backend tự tính)
      const response = await leaveAPI.applyLeave({
        leaveType: leaveType, // Đồng nhất với web
        startDate: startDate,
        endDate: endDate,
        reason: reason.trim(),
      });

      if (response.success) {
        Alert.alert('Thành công', 'Đơn nghỉ phép đã được gửi', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Lỗi', response.message || 'Không thể tạo đơn nghỉ phép');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể kết nối đến server');
    } finally {
      setLoading(false);
    }
  };

  // Đồng nhất loại nghỉ phép với web và backend model
  const leaveTypes = [
    { value: 'annual', label: 'Nghỉ phép năm' },
    { value: 'sick', label: 'Nghỉ ốm' },
    { value: 'unpaid', label: 'Nghỉ không lương' },
    { value: 'maternity', label: 'Thai sản' },
    { value: 'other', label: 'Khác' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Loại nghỉ phép</Text>
          <View style={styles.typeContainer}>
            {leaveTypes.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.typeButton,
                  leaveType === item.value && styles.typeButtonActive,
                ]}
                onPress={() => setLeaveType(item.value)}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    leaveType === item.value && styles.typeButtonTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Ngày bắt đầu</Text>
          <View style={styles.dateInputContainer}>
            <Ionicons name="calendar-outline" size={20} color="#1890ff" style={styles.dateIcon} />
            <TextInput
              style={styles.dateInput}
              placeholder="YYYY-MM-DD (ví dụ: 2024-12-01)"
              value={startDate}
              onChangeText={setStartDate}
              keyboardType="default"
            />
          </View>
          <Text style={styles.hint}>Nhập ngày theo định dạng YYYY-MM-DD</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Ngày kết thúc</Text>
          <View style={styles.dateInputContainer}>
            <Ionicons name="calendar-outline" size={20} color="#1890ff" style={styles.dateIcon} />
            <TextInput
              style={styles.dateInput}
              placeholder="YYYY-MM-DD (ví dụ: 2024-12-05)"
              value={endDate}
              onChangeText={setEndDate}
              keyboardType="default"
            />
          </View>
          <Text style={styles.hint}>Nhập ngày theo định dạng YYYY-MM-DD</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Số ngày: {calculateDays()} ngày
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Lý do nghỉ phép</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Nhập lý do nghỉ phép"
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
          <Text style={styles.submitButtonText}>
            {loading ? 'Đang gửi...' : 'Gửi đơn nghỉ phép'}
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
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    marginRight: 8,
    marginBottom: 8,
  },
  typeButtonActive: {
    backgroundColor: '#1890ff',
    borderColor: '#1890ff',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#333',
  },
  typeButtonTextActive: {
    color: '#fff',
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
  dateIcon: {
    marginRight: 8,
  },
  dateInput: {
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
  submitButton: {
    backgroundColor: '#1890ff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

