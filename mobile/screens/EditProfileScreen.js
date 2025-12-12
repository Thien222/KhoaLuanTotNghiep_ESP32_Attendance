import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { employeeAPI } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';

export default function EditProfileScreen({ navigation }) {
    const { checkAuth } = useAuth();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateField, setDateField] = useState(null);

    const [profile, setProfile] = useState({
        name: '',
        phone: '',
        email: '',
        dateOfBirth: null,
        gender: 'male',
        address: '',
        citizenId: '',
        bankAccountNumber: '',
        bankName: '',
        accountName: '',
        socialInsuranceNumber: '',
    });

    useEffect(() => {
        fetchCurrentProfile();
    }, []);

    const fetchCurrentProfile = async () => {
        setLoading(true);
        try {
            const response = await employeeAPI.getMyProfile();
            if (response.success && response.data) {
                const data = response.data.employee || response.data;
                setProfile({
                    name: data.name || '',
                    phone: data.phone || '',
                    email: data.email || '',
                    dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
                    gender: data.gender || 'male',
                    address: data.address || '',
                    citizenId: data.citizenId || data.idCardNumber || '',
                    bankAccountNumber: data.bankAccount?.accountNumber || data.bankAccountNumber || '',
                    bankName: data.bankAccount?.bankName || data.bankName || '',
                    accountName: data.bankAccount?.accountName || data.accountName || '',
                    socialInsuranceNumber: data.socialInsuranceNumber || '',
                });
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            Alert.alert('Lỗi', 'Không thể tải thông tin hồ sơ');
        } finally {
            setLoading(false);
        }
    };

    const handleDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate && dateField) {
            setProfile(prev => ({ ...prev, [dateField]: selectedDate }));
        }
    };

    const showDatePickerFor = (field) => {
        setDateField(field);
        setShowDatePicker(true);
    };

    const formatDate = (date) => {
        if (!date) return 'Chọn ngày';
        return date.toLocaleDateString('vi-VN');
    };

    const validateProfile = () => {
        if (!profile.phone.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
            return false;
        }
        if (!profile.address.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ');
            return false;
        }
        if (!profile.citizenId.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập số CCCD/CMND');
            return false;
        }
        return true;
    };

    const handleSave = async () => {
        if (!validateProfile()) return;

        setSaving(true);
        try {
            const response = await employeeAPI.updateMyProfile({
                phone: profile.phone,
                address: profile.address,
                citizenId: profile.citizenId,
                dateOfBirth: profile.dateOfBirth,
                gender: profile.gender,
                socialInsuranceNumber: profile.socialInsuranceNumber,
                bankAccount: {
                    bankName: profile.bankName,
                    accountNumber: profile.bankAccountNumber,
                    accountName: profile.accountName,
                },
            });

            if (response.success) {
                // Update local storage with new profile data
                const userData = await AsyncStorage.getItem('user');
                if (userData) {
                    const parsed = JSON.parse(userData);
                    parsed.profileCompleted = true;
                    await AsyncStorage.setItem('user', JSON.stringify(parsed));
                }

                Alert.alert('Thành công', 'Đã cập nhật thông tin cá nhân', [
                    { text: 'OK', onPress: () => {
                        checkAuth();
                        navigation.goBack();
                    }}
                ]);
            } else {
                Alert.alert('Lỗi', response.message || 'Không thể cập nhật thông tin');
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            Alert.alert('Lỗi', 'Có lỗi xảy ra khi lưu thông tin');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1890ff" />
                <Text style={styles.loadingText}>Đang tải...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
                    {/* Basic Info */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Họ và tên</Text>
                            <TextInput
                                style={[styles.input, styles.inputDisabled]}
                                value={profile.name}
                                editable={false}
                                placeholder="Họ tên"
                            />
                            <Text style={styles.hint}>Liên hệ quản lý để thay đổi</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={[styles.input, styles.inputDisabled]}
                                value={profile.email}
                                editable={false}
                                placeholder="Email"
                            />
                            <Text style={styles.hint}>Liên hệ quản lý để thay đổi</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Số điện thoại *</Text>
                            <TextInput
                                style={styles.input}
                                value={profile.phone}
                                onChangeText={(text) => setProfile(prev => ({ ...prev, phone: text }))}
                                placeholder="Nhập số điện thoại"
                                keyboardType="phone-pad"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Ngày sinh</Text>
                            <TouchableOpacity
                                style={styles.dateButton}
                                onPress={() => showDatePickerFor('dateOfBirth')}
                            >
                                <Text style={styles.dateText}>{formatDate(profile.dateOfBirth)}</Text>
                                <Ionicons name="calendar" size={20} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Giới tính</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={profile.gender}
                                    onValueChange={(value) => setProfile(prev => ({ ...prev, gender: value }))}
                                    style={styles.picker}
                                >
                                    <Picker.Item label="Nam" value="male" />
                                    <Picker.Item label="Nữ" value="female" />
                                    <Picker.Item label="Khác" value="other" />
                                </Picker>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Địa chỉ *</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={profile.address}
                                onChangeText={(text) => setProfile(prev => ({ ...prev, address: text }))}
                                placeholder="Nhập địa chỉ đầy đủ"
                                multiline
                                numberOfLines={2}
                            />
                        </View>
                    </View>

                    {/* ID Card */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Số CCCD/CMND *</Text>
                            <TextInput
                                style={styles.input}
                                value={profile.citizenId}
                                onChangeText={(text) => setProfile(prev => ({ ...prev, citizenId: text }))}
                                placeholder="Nhập số CCCD (12 số)"
                                keyboardType="number-pad"
                                maxLength={12}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Mã số BHXH</Text>
                            <TextInput
                                style={styles.input}
                                value={profile.socialInsuranceNumber}
                                onChangeText={(text) => setProfile(prev => ({ ...prev, socialInsuranceNumber: text }))}
                                placeholder="Nhập mã số BHXH"
                            />
                        </View>
                    </View>

                    {/* Bank Info */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Thông tin ngân hàng</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Tên ngân hàng</Text>
                            <TextInput
                                style={styles.input}
                                value={profile.bankName}
                                onChangeText={(text) => setProfile(prev => ({ ...prev, bankName: text }))}
                                placeholder="VD: Vietcombank, ACB, BIDV..."
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Số tài khoản</Text>
                            <TextInput
                                style={styles.input}
                                value={profile.bankAccountNumber}
                                onChangeText={(text) => setProfile(prev => ({ ...prev, bankAccountNumber: text }))}
                                placeholder="Nhập số tài khoản"
                                keyboardType="number-pad"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Tên tài khoản</Text>
                            <TextInput
                                style={styles.input}
                                value={profile.accountName}
                                onChangeText={(text) => setProfile(prev => ({ ...prev, accountName: text.toUpperCase() }))}
                                placeholder="Tên chủ tài khoản (viết hoa)"
                                autoCapitalize="characters"
                            />
                        </View>
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={styles.cancelButtonText}>Hủy</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                    <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={{ height: 50 }} />
                </ScrollView>

                {showDatePicker && (
                    <DateTimePicker
                        value={profile[dateField] || new Date()}
                        mode="date"
                        display="default"
                        onChange={handleDateChange}
                        maximumDate={new Date()}
                    />
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
    },
    form: {
        flex: 1,
        padding: 16,
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1890ff',
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        color: '#666',
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#d9d9d9',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    inputDisabled: {
        backgroundColor: '#f0f0f0',
        color: '#999',
    },
    textArea: {
        minHeight: 60,
        textAlignVertical: 'top',
    },
    dateButton: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#d9d9d9',
        borderRadius: 8,
        padding: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateText: {
        fontSize: 16,
        color: '#333',
    },
    pickerContainer: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#d9d9d9',
        borderRadius: 8,
        overflow: 'hidden',
    },
    picker: {
        height: 50,
    },
    hint: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
        fontStyle: 'italic',
    },
    buttonContainer: {
        flexDirection: 'row',
        marginTop: 10,
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#d9d9d9',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },
    saveButton: {
        flex: 2,
        backgroundColor: '#52c41a',
        borderRadius: 8,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButtonDisabled: {
        backgroundColor: '#ccc',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});

