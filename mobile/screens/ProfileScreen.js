import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { authAPI, employeeAPI } from '../services/api';
import moment from 'moment';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      // Dùng employeeAPI để lấy đầy đủ thông tin employee
      const response = await employeeAPI.getMyProfile();

      if (response.success) {
        // Backend trả về data.employee
        const profileData = response.data?.employee || response.data;
        setProfile(profileData);
        console.log('Loaded profile:', profileData);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      // Fallback: thử authAPI
      try {
        const response = await authAPI.getProfile();
        if (response.success) {
          const profileData = response.data?.employee || response.data?.user;
          setProfile(profileData);
        }
      } catch (e) {
        console.error('Both API calls failed:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const InfoRow = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color="#1890ff" />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'Chưa cập nhật'}</Text>
      </View>
    </View>
  );

  // FIX: Lấy employee từ profile hoặc user, ưu tiên profile
  const employee = profile || user?.employee || {};

  const formatDate = (date) => {
    if (!date) return 'Chưa cập nhật';
    return moment(date).format('DD/MM/YYYY');
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'Chưa cập nhật';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const getContractTypeLabel = (type) => {
    const labels = {
      'official': 'Chính thức',
      'probation': 'Thử việc',
      'intern': 'Thực tập'
    };
    return labels[type] || type || 'Chưa cập nhật';
  };

  const getGenderLabel = (gender) => {
    const labels = {
      'male': 'Nam',
      'female': 'Nữ',
      'other': 'Khác'
    };
    return labels[gender] || 'Chưa cập nhật';
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={48} color="#fff" />
        </View>
        <Text style={styles.name}>{employee?.name || user?.username || 'User'}</Text>
        <Text style={styles.role}>
          {user?.role === 'manager' ? 'Quản lý' : user?.role === 'accountant' ? 'Kế toán' : 'Nhân viên'}
        </Text>
      </View>

      {/* Thông tin cá nhân */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
        <View style={styles.card}>
          <InfoRow
            icon="id-card-outline"
            label="Mã nhân viên"
            value={employee?.employeeId}
          />
          <InfoRow
            icon="mail-outline"
            label="Email"
            value={employee?.email || user?.email}
          />
          <InfoRow
            icon="call-outline"
            label="Số điện thoại"
            value={employee?.phone}
          />
          <InfoRow
            icon="calendar-outline"
            label="Ngày sinh"
            value={formatDate(employee?.dateOfBirth)}
          />
          <InfoRow
            icon="male-female-outline"
            label="Giới tính"
            value={getGenderLabel(employee?.gender)}
          />
          <InfoRow
            icon="location-outline"
            label="Địa chỉ"
            value={employee?.address}
          />
          <InfoRow
            icon="card-outline"
            label="Số CCCD/CMND"
            value={employee?.citizenId}
          />
          <InfoRow
            icon="shield-checkmark-outline"
            label="Mã số BHXH"
            value={employee?.socialInsuranceNumber}
          />
        </View>
      </View>

      {/* Thông tin công việc */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin công việc</Text>
        <View style={styles.card}>
          <InfoRow
            icon="briefcase-outline"
            label="Chức vụ"
            value={employee?.position}
          />
          <InfoRow
            icon="business-outline"
            label="Phòng ban"
            value={employee?.department}
          />
          <InfoRow
            icon="document-text-outline"
            label="Loại hợp đồng"
            value={getContractTypeLabel(employee?.contractType)}
          />
          <InfoRow
            icon="calendar-number-outline"
            label="Ngày vào làm"
            value={formatDate(employee?.joinDate)}
          />
          <InfoRow
            icon="time-outline"
            label="Thâm niên"
            value={employee?.seniorityYears ? `${employee.seniorityYears} năm` : 'Chưa cập nhật'}
          />
        </View>
      </View>

      {/* Thông tin ngân hàng */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin ngân hàng</Text>
        <View style={styles.card}>
          <InfoRow
            icon="business-outline"
            label="Tên ngân hàng"
            value={employee?.bankAccount?.bankName}
          />
          <InfoRow
            icon="wallet-outline"
            label="Số tài khoản"
            value={employee?.bankAccount?.accountNumber}
          />
          <InfoRow
            icon="person-outline"
            label="Tên tài khoản"
            value={employee?.bankAccount?.accountName}
          />
        </View>
      </View>

      {/* Thông tin tài khoản */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin tài khoản</Text>
        <View style={styles.card}>
          <InfoRow
            icon="person-outline"
            label="Tên đăng nhập"
            value={user?.username || employee?.employeeId}
          />
          <InfoRow
            icon="finger-print-outline"
            label="ID Vân tay"
            value={employee?.fingerprintId ? `#${employee.fingerprintId}` : 'Chưa đăng ký'}
          />
          <InfoRow
            icon="checkmark-circle-outline"
            label="Trạng thái vân tay"
            value={employee?.fingerprintEnrolled ? 'Đã đăng ký' : 'Chưa đăng ký'}
          />
        </View>
      </View>

      {/* Menu Actions */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('ChangePassword')}
        >
          <Ionicons name="lock-closed-outline" size={24} color="#1890ff" />
          <Text style={styles.menuText}>Đổi mật khẩu</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#ff4d4f" />
          <Text style={[styles.menuText, { color: '#ff4d4f' }]}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Spacing */}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#667eea',
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  role: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
});
