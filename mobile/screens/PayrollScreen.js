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
          payrolls.map((payroll) => {
            // Tính toán tổng thu nhập và tổng khấu trừ để hiển thị thực lãnh đúng
            // Bỏ weekendWorkPay và seniorityAllowance
            const totalIncome = (payroll.proratedSalary || payroll.baseSalary || payroll.basicSalary || 0) +
              (payroll.generalAllowance || payroll.allowance || 0) +
              (payroll.positionAllowance || 0) +
              (payroll.overtimePay || 0) +
              (payroll.holidayWorkPay || 0) +
              (payroll.bonus || 0) +
              (payroll.performanceBonus || 0) +
              (payroll.otherAllowances || 0);

            // Thực lãnh = Tổng thu nhập - Tiền phạt (không trừ bảo hiểm + thuế)
            const latePenalty = payroll.latePenalty || 0;
            const netPay = totalIncome - latePenalty;

            return (
              <View key={payroll._id} style={styles.payrollCard}>
                <View style={styles.payrollHeader}>
                  <View>
                    <Text style={styles.payrollMonth}>
                      Bảng lương tháng {payroll.month || payroll.monthStr || `${selectedMonth}/${selectedYear}`}
                    </Text>
                    <Text style={styles.workingDaysText}>
                      {payroll.workingDays || 0} ngày công • {(payroll.overtimeHours || 0).toFixed(2)}h OT
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: payroll.status === 'paid' ? '#52c41a' : '#faad14' }]}>
                    <Text style={styles.statusText}>
                      {payroll.status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                    </Text>
                  </View>
                </View>

                <View style={styles.payrollSection}>
                  <Text style={styles.sectionTitle}>
                    <Ionicons name="add-circle" size={18} color="#52c41a" /> Thu nhập
                  </Text>

                  {/* Lương cơ bản tháng - Tham chiếu (chỉ để tham khảo, không tính vào tổng) */}
                  <View style={[styles.amountRow, { opacity: 0.6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 8, marginBottom: 8 }]}>
                    <Text style={[styles.amountLabel, { fontSize: 12, fontStyle: 'italic' }]}>
                      💡 Lương cơ bản (tháng) - Tham chiếu:
                    </Text>
                    <Text style={[styles.amountValue, { fontSize: 12, fontStyle: 'italic' }]}>
                      {formatCurrency(payroll.basicSalaryFull || payroll.employee?.baseSalary || payroll.employee?.salary || 0)}
                    </Text>
                  </View>

                  {/* Lương theo ngày công - Tính vào thu nhập */}
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>
                      Lương theo ngày công ({payroll.workingDays || 0} ngày):
                    </Text>
                    <Text style={[styles.amountValue, { fontWeight: 'bold' }]}>
                      {formatCurrency(payroll.proratedSalary || payroll.baseSalary || payroll.basicSalary || 0)}
                    </Text>
                  </View>

                  {/* Luôn hiển thị phụ cấp chung - Dùng giá trị từ backend */}
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Phụ cấp chung (5%):</Text>
                    <Text style={styles.amountValue}>
                      {formatCurrency(
                        payroll.generalAllowance ||
                        payroll.allowance ||
                        (payroll.basicSalaryFull || payroll.employee?.baseSalary || 0) * 0.05 ||
                        0
                      )}
                    </Text>
                  </View>
                  {(payroll.positionAllowance || 0) > 0 && (
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>PC Chức vụ:</Text>
                      <Text style={styles.amountValue}>
                        {formatCurrency(payroll.positionAllowance)}
                      </Text>
                    </View>
                  )}
                  {(payroll.overtimePay || 0) > 0 && (
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>Tiền OT ({(payroll.overtimeHours || 0).toFixed(2)}h):</Text>
                      <Text style={styles.amountValue}>
                        {formatCurrency(payroll.overtimePay)}
                      </Text>
                    </View>
                  )}
                  {/* Highlight tiền làm ngày lễ */}
                  {(payroll.holidayWorkPay || 0) > 0 && (
                    <View style={[styles.amountRow, { backgroundColor: '#fffbe6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginHorizontal: -8 }]}>
                      <Text style={[styles.amountLabel, { fontWeight: '600', color: '#faad14' }]}>
                        ⚡ Làm ngày lễ ({payroll.holidayWorkDays || 0} ngày):
                      </Text>
                      <Text style={[styles.amountValue, { color: '#faad14', fontWeight: 'bold' }]}>
                        {formatCurrency(payroll.holidayWorkPay)}
                      </Text>
                    </View>
                  )}
                  {(payroll.bonus || 0) > 0 && (
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>Thưởng:</Text>
                      <Text style={styles.amountValue}>
                        {formatCurrency(payroll.bonus)}
                      </Text>
                    </View>
                  )}
                  {(payroll.performanceBonus || 0) > 0 && (
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>Thưởng hiệu suất:</Text>
                      <Text style={styles.amountValue}>
                        {formatCurrency(payroll.performanceBonus)}
                      </Text>
                    </View>
                  )}
                  {(payroll.otherAllowances || 0) > 0 && (
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>Phụ cấp khác:</Text>
                      <Text style={styles.amountValue}>
                        {formatCurrency(payroll.otherAllowances)}
                      </Text>
                    </View>
                  )}

                  {/* Tổng thu nhập - Đồng bộ với web */}
                  <View style={[styles.amountRow, {
                    backgroundColor: '#f6ffed',
                    padding: 12,
                    marginTop: 8,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: '#b7eb8f'
                  }]}>
                    <Text style={[styles.amountLabel, { fontWeight: 'bold', color: '#52c41a' }]}>
                      Tổng thu nhập:
                    </Text>
                    <Text style={[styles.amountValue, { fontWeight: 'bold', color: '#52c41a', fontSize: 16 }]}>
                      {formatCurrency(totalIncome)}
                    </Text>
                  </View>
                </View>

                {/* Tiền phạt đi muộn - Chỉ hiển thị nếu có */}
                {latePenalty > 0 && (
                  <View style={[styles.payrollSection, { marginTop: 12 }]}>
                    <View style={{
                      backgroundColor: '#fff1f0',
                      padding: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#ffa39e',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <Text style={{ color: '#ff4d4f', fontSize: 14 }}>
                        Tiền phạt đi muộn ({payroll.lateMinutes || 0}p, {payroll.lateCount || 0} lần):
                      </Text>
                      <Text style={{ color: '#ff4d4f', fontWeight: 'bold', fontSize: 16 }}>
                        -{formatCurrency(latePenalty)}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={[styles.netSalary, {
                  backgroundColor: netPay < 0 ? '#fff2f0' : '#e6f7ff',
                  borderColor: netPay < 0 ? '#ff4d4f' : '#1890ff',
                }]}>
                  <Text style={[
                    styles.netSalaryLabel,
                    { color: netPay < 0 ? '#ff4d4f' : '#1890ff' }
                  ]}>
                    THỰC LÃNH (NET PAY):
                  </Text>
                  <Text style={[
                    styles.netSalaryValue,
                    { color: netPay < 0 ? '#ff4d4f' : '#1890ff' }
                  ]}>
                    {formatCurrency(netPay)}
                  </Text>
                </View>
              </View>
            );
          })
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
  workingDaysText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
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
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 3,
    alignItems: 'center',
  },
  netSalaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  netSalaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
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
  breakdownSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
    textAlign: 'right',
  },
});

