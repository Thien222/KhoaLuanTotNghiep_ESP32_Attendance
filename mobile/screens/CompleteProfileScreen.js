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

export default function CompleteProfileScreen({ navigation }) {
    const { user, checkAuth } = useAuth();
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
        idCardNumber: '',
        idCardIssueDate: null,
        idCardIssuePlace: '',
        bankAccountNumber: '',
        bankName: '',
        bankBranch: '',
        socialInsuranceNumber: '',
        taxCode: '',
        emergencyContact: '',
        emergencyPhone: '',
    });

    useEffect(() => {
        fetchCurrentProfile();
    }, []);

    const fetchCurrentProfile = async () => {
        setLoading(true);
        try {
            const response = await employeeAPI.getMyProfile();
            if (response.success && response.data) {
                const data = response.data;
                setProfile({
                    name: data.name || '',
                    phone: data.phone || '',
                    email: data.email || '',
                    dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
                    gender: data.gender || 'male',
                    address: data.address || '',
                    idCardNumber: data.idCardNumber || '',
                    idCardIssueDate: data.idCardIssueDate ? new Date(data.idCardIssueDate) : null,
                    idCardIssuePlace: data.idCardIssuePlace || '',
                    bankAccountNumber: data.bankAccountNumber || '',
                    bankName: data.bankName || '',
                    bankBranch: data.bankBranch || '',
                    socialInsuranceNumber: data.socialInsuranceNumber || '',
                    taxCode: data.taxCode || '',
                    emergencyContact: data.emergencyContact || '',
                    emergencyPhone: data.emergencyPhone || '',
                });
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
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
        if (!date) return 'Chon ngay';
        return date.toLocaleDateString('vi-VN');
    };

    const validateProfile = () => {
        if (!profile.name.trim()) {
            Alert.alert('Loi', 'Vui long nhap ho ten');
            return false;
        }
        if (!profile.phone.trim()) {
            Alert.alert('Loi', 'Vui long nhap so dien thoai');
            return false;
        }
        if (!profile.dateOfBirth) {
            Alert.alert('Loi', 'Vui long chon ngay sinh');
            return false;
        }
        if (!profile.address.trim()) {
            Alert.alert('Loi', 'Vui long nhap dia chi');
            return false;
        }
        if (!profile.idCardNumber.trim()) {
            Alert.alert('Loi', 'Vui long nhap so CCCD/CMND');
            return false;
        }
        return true;
    };

    const handleSave = async () => {
        if (!validateProfile()) return;

        setSaving(true);
        try {
            const response = await employeeAPI.updateMyProfile({
                ...profile,
                profileCompleted: true,
            });

            if (response.success) {
                // Update local storage with new profile data
                const userData = await AsyncStorage.getItem('user');
                if (userData) {
                    const parsed = JSON.parse(userData);
                    parsed.employee = { ...parsed.employee, profileCompleted: true };
                    await AsyncStorage.setItem('user', JSON.stringify(parsed));
                }

                Alert.alert('Thanh cong', 'Da cap nhat thong tin ca nhan', [
                    { text: 'OK', onPress: () => checkAuth() }
                ]);
            } else {
                Alert.alert('Loi', response.message || 'Khong the cap nhat thong tin');
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            Alert.alert('Loi', 'Co loi xay ra khi luu thong tin');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1890ff" />
                <Text style={styles.loadingText}>Dang tai...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <View style={styles.header}>
                    <Ionicons name="person-circle" size={60} color="#1890ff" />
                    <Text style={styles.headerTitle}>Hoan thanh ho so</Text>
                    <Text style={styles.headerSubtitle}>
                        Vui long cap nhat thong tin ca nhan de tiep tuc su dung ung dung
                    </Text>
                </View>

                <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
                    {/* Basic Info */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Thong tin co ban</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Ho va ten *</Text>
                            <TextInput
                                style={styles.input}
                                value={profile.name}
                                onChangeText={(text) => setProfile(prev => ({ ...prev, name: text }))}
                                placeholder="Nhap ho ten"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>So dien thoai *</Text>
                            <TextInput
                                style={styles.input}
                                value={profile.phone}
                                onChangeText={(text) => setProfile(prev => ({ ...prev, phone: text }))}
                                placeholder="Nhap so dien thoai"
                                keyboardType="phone-pad"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={styles.input}
                                value={profile.email}
                                onChangeText={(text) => setProfile(prev => ({ ...prev, email: text }))}
                                placeholder="Nhap email"
                                keyboardType="email-address"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Ngay sinh *</Text>
                            <TouchableOpacity
                                style={styles.dateButton}
                                onPress={() => showDatePickerFor('dateOfBirth')}
                            >
                                <Text style={styles.dateText}>{formatDate(profile.dateOfBirth)}</Text>
                                <Ionicons name="calendar" size={20} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Gioi tinh</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={profile.gender}
                                    onValueChange={(value) => setProfile(prev => ({ ...prev, gender: value }))}
                                    style={styles.picker}
                                >
                                    <Picker.Item label="Nam" value="male" />
                                    <Picker.Item label="Nu" value="female" />
                                    <Picker.Item label="Khac" value="other" />
                                </Picker>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Dia chi *</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={profile.address}
                                onChangeText={(text) => setProfile(prev => ({ ...prev, address: text }))}
                                placeholder="Nhap dia chi"
                                multiline
                                numberOfLines={2}
                            />
                        </View>
                    </View>

                    {/* ID Card */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>CCCD/CMND</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>So CCCD/CMND *</Text>
                            <TextInput
                                style={styles.input}
                                value={profile.idCardNumber}
                                onChangeText={(text) => setProfile(prev => ({ ...prev, idCardNumber: text }))}
                                placeholder="Nhap so CCCD/CMND"
                                keyboardType="number-pad"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Ngay cap</Text>
                            <TouchableOpacity
                                style={styles.dateButton}
                                onPress={() => showDatePickerFor('idCardIssueDate')}
                            >
                                <Text style={styles.dateText}>{formatDate(profile.idCardIssueDate)}</Text>
                                <Ionicons name="calendar" size={20} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Noi cap</Text>
                            <TextInput
                                style={styles.input}
                                value={profile.idCardIssuePlace}
                                onChangeText={(text) => setProfile(prev => ({ ...prev, idCardIssuePlace: text }))}
                                placeholder="Nhap noi cap"
                            />
                        </View>
                    </View>

                    {/* Bank Info */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Thong tin ngan hang</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>So tai khoan</Text>
                            <TextInput
                                style={styles.input}
                                value={profile.bankAccountNumber}
                                onChangeText={(text) => setProfile(prev => ({ ...prev, bankAccountNumber: text }))}
                                placeholder="Nhap so tai khoan"
                                keyboardType="number-pad"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Ten ngan hang</Text>
                            <TextInput
                                style={styles.input}
                                value={profile.bankName}
                                onChangeText={(text) => setProfile(prev => ({ ...prev, bankName: text }))}
                                placeholder="VD: Vietcombank, BIDV, ..."
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Chi nhanh</Text>
                            <TextInput
                                style={styles.input}
                                value={profile.bankBranch}
                                onChangeText={(text) => setProfile(prev => ({ ...prev, bankBranch: text }))}
                                placeholder="Nhap chi nhanh"
                            />
                        </View>
                    </View>

                    {/* Insurance & Tax */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Bao hiem & Thue</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>So BHXH</Text>
                            <TextInput
                                style={styles.input}
                                value={profile.socialInsuranceNumber}
                                onChangeText={(text) => setProfile(prev => ({ ...prev, socialInsuranceNumber: text }))}
                                placeholder="Nhap so BHXH"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Ma so thue ca nhan</Text>
                            <TextInput
                                style={styles.input}
                                value={profile.taxCode}
                                onChangeText={(text) => setProfile(prev => ({ ...prev, taxCode: text }))}
                                placeholder="Nhap ma so thue"
                            />
                        </View>
                    </View>

                    {/* Emergency Contact */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Lien he khan cap</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Nguoi lien he</Text>
                            <TextInput
                                style={styles.input}
                                value={profile.emergencyContact}
                                onChangeText={(text) => setProfile(prev => ({ ...prev, emergencyContact: text }))}
                                placeholder="Ten nguoi lien he"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>So dien thoai</Text>
                            <TextInput
                                style={styles.input}
                                value={profile.emergencyPhone}
                                onChangeText={(text) => setProfile(prev => ({ ...prev, emergencyPhone: text }))}
                                placeholder="So dien thoai lien he"
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>

                    <View style={styles.buttonContainer}>
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
                                    <Text style={styles.saveButtonText}>Hoan tat</Text>
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
    header: {
        backgroundColor: '#fff',
        padding: 20,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e8e8e8',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 10,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginTop: 5,
        paddingHorizontal: 20,
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
    buttonContainer: {
        marginTop: 10,
    },
    saveButton: {
        backgroundColor: '#1890ff',
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
