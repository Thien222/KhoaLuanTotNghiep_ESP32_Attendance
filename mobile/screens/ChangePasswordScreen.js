import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../services/api';

export default function ChangePasswordScreen({ navigation }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }

    try {
      setLoading(true);
      const response = await authAPI.changePassword(currentPassword, newPassword);
      
      if (response.success) {
        Alert.alert(
          'Thành công',
          'Đổi mật khẩu thành công',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
        // Reset form
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Lỗi', response.message || 'Không thể đổi mật khẩu');
      }
    } catch (error) {
      console.error('Change password error:', error);
      Alert.alert(
        'Lỗi',
        error.response?.data?.message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại.'
      );
    } finally {
      setLoading(false);
    }
  };

  const PasswordInput = ({ label, value, onChangeText, placeholder, show, toggleShow }) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={!show}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={toggleShow} style={styles.eyeIcon}>
          <Ionicons
            name={show ? 'eye-outline' : 'eye-off-outline'}
            size={24}
            color="#999"
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Đổi mật khẩu</Text>
      </View>

      <View style={styles.content}>
        <PasswordInput
          label="Mật khẩu hiện tại"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Nhập mật khẩu hiện tại"
          show={showCurrentPassword}
          toggleShow={() => setShowCurrentPassword(!showCurrentPassword)}
        />

        <PasswordInput
          label="Mật khẩu mới"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
          show={showNewPassword}
          toggleShow={() => setShowNewPassword(!showNewPassword)}
        />

        <PasswordInput
          label="Xác nhận mật khẩu mới"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Nhập lại mật khẩu mới"
          show={showConfirmPassword}
          toggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleChangePassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="lock-closed-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Đổi mật khẩu</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#1890ff" />
          <Text style={styles.infoText}>
            Mật khẩu phải có ít nhất 6 ký tự. Sau khi đổi mật khẩu thành công, bạn sẽ cần đăng nhập lại.
          </Text>
        </View>
      </View>
    </View>
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
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 12,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#1890ff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#d9d9d9',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e6f7ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    marginLeft: 8,
    lineHeight: 18,
  },
});
















