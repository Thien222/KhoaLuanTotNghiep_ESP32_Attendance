import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { payrollAPI } from '../services/api';
import moment from 'moment';

export default function PayrollScreen() {
  const [payrolls, setPayrolls] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(moment().month() + 1);
  const [selectedYear, setSelectedYear] = useState(moment().year());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPayrolls();
  }, [selectedMonth, selectedYear]);

  const loadPayrolls = async () => {
    try {
      setLoading(true);
      const response = await payrollAPI.getMyPayroll(selectedMonth, selectedYear);
      if (response.success) {
        setPayrolls(response.data || []);
      }
    } catch (error) {
      console.error('Error loading payrolls:', error);
      Alert.alert('Lỗi', 'Không thể tải dữ liệu bảng lương');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount || 0);
  };

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: 5 }, (_, i) => moment().year() - i);

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Tháng: {selectedMonth}</Text>
          <View style={styles.pickerButtons}>
            {months.map((month) => (
              <TouchableOpacity
                key={month}
                style={[
                  styles.pickerButton,
                  selectedMonth === month && styles.pickerButtonActive,
                ]}
                onPress={() => setSelectedMonth(month)}
              >
                <Text
                  style={[
                    styles.pickerButtonText,
                    selectedMonth === month && styles.pickerButtonTextActive,
                  ]}
                >
                  {month}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Năm: {selectedYear}</Text>
          <View style={styles.pickerButtons}>
            {years.map((year) => (
              <TouchableOpacity
                key={year}
                style={[
                  styles.pickerButton,
                  selectedYear === year && styles.pickerButtonActive,
                ]}
                onPress={() => setSelectedYear(year)}
              >
                <Text
                  style={[
                    styles.pickerButtonText,
                    selectedYear === year && styles.pickerButtonTextActive,
                  ]}
                >
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {payrolls.length > 0 ? (
          payrolls.map((payroll) => (
            <View key={payroll._id} style={styles.payrollCard}>
              <View style={styles.payrollHeader}>
                <Text style={styles.payrollMonth}>
                  {moment(payroll.month).format('MM/YYYY')}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: payroll.status === 'paid' ? '#52c41a' : '#faad14' }]}>
                  <Text style={styles.statusText}>
                    {payroll.status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                  </Text>
                </View>
              </View>

              <View style={styles.payrollSection}>
                <Text style={styles.sectionTitle}>Thu nhập</Text>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Lương cơ bản:</Text>
                  <Text style={styles.amountValue}>
                    {formatCurrency(payroll.basicSalary)}
                  </Text>
                </View>
                {payroll.allowance > 0 && (
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Phụ cấp:</Text>
                    <Text style={styles.amountValue}>
                      {formatCurrency(payroll.allowance)}
                    </Text>
                  </View>
                )}
                {payroll.overtime > 0 && (
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Làm thêm:</Text>
                    <Text style={styles.amountValue}>
                      {formatCurrency(payroll.overtime)}
                    </Text>
                  </View>
                )}
                {payroll.bonus > 0 && (
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Thưởng:</Text>
                    <Text style={styles.amountValue}>
                      {formatCurrency(payroll.bonus)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={[styles.payrollSection, styles.deductionSection]}>
                <Text style={[styles.sectionTitle, { color: '#ff4d4f' }]}>
                  Khấu trừ
                </Text>
                {payroll.latePenalty > 0 && (
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Phạt muộn:</Text>
                    <Text style={[styles.amountValue, { color: '#ff4d4f' }]}>
                      -{formatCurrency(payroll.latePenalty)}
                    </Text>
                  </View>
                )}
                {payroll.insurance > 0 && (
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Bảo hiểm:</Text>
                    <Text style={[styles.amountValue, { color: '#ff4d4f' }]}>
                      -{formatCurrency(payroll.insurance)}
                    </Text>
                  </View>
                )}
                {payroll.tax > 0 && (
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Thuế:</Text>
                    <Text style={[styles.amountValue, { color: '#ff4d4f' }]}>
                      -{formatCurrency(payroll.tax)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.netSalary}>
                <Text style={styles.netSalaryLabel}>Thực lãnh:</Text>
                <Text style={styles.netSalaryValue}>
                  {formatCurrency(payroll.netSalary)}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="cash-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Chưa có dữ liệu bảng lương</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerContainer: {
    flex: 1,
    marginRight: 8,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pickerButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  pickerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    marginRight: 8,
    marginBottom: 8,
  },
  pickerButtonActive: {
    backgroundColor: '#1890ff',
    borderColor: '#1890ff',
  },
  pickerButtonText: {
    fontSize: 14,
    color: '#333',
  },
  pickerButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  payrollCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  payrollHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  payrollMonth: {
    fontSize: 18,
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
  payrollSection: {
    marginBottom: 16,
  },
  deductionSection: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#52c41a',
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  netSalary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#1890ff',
    marginTop: 8,
  },
  netSalaryLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  netSalaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1890ff',
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

