import React, { useState, useEffect, useCallback } from 'react';
import {
    Card,
    Table,
    Button,
    Space,
    Modal,
    Form,
    Input,
    Select,
    message,
    Tag,
    Typography,
    Popconfirm,
    Tooltip,
    Row,
    Col,
    Statistic,
    Badge,
    Switch,
    Descriptions
} from 'antd';
import {
    KeyOutlined,
    UserOutlined,
    EditOutlined,
    LockOutlined,
    UnlockOutlined,
    ReloadOutlined,
    SearchOutlined,
    EyeOutlined,
    EyeInvisibleOutlined,
    MailOutlined,
    TeamOutlined,
    SafetyOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { getAPIUrl } from '../../utils/configManager';

const { Title, Text } = Typography;
const { Option } = Select;

const AccountManagement = () => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    // Modals
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [resetPasswordModalVisible, setResetPasswordModalVisible] = useState(false);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState(null);

    // Forms
    const [editForm] = Form.useForm();
    const [resetPasswordForm] = Form.useForm();

    // Statistics
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        inactive: 0,
        managers: 0,
        accountants: 0,
        employees: 0
    });

    const fetchAccounts = useCallback(async () => {
        setLoading(true);
        try {
            const API_URL = getAPIUrl();
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/auth/accounts`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                const accountData = response.data.data || [];
                setAccounts(accountData);

                // Calculate statistics
                setStats({
                    total: accountData.length,
                    active: accountData.filter(a => a.isActive !== false).length,
                    inactive: accountData.filter(a => a.isActive === false).length,
                    managers: accountData.filter(a => a.role === 'manager').length,
                    accountants: accountData.filter(a => a.role === 'accountant').length,
                    employees: accountData.filter(a => a.role === 'employee').length
                });
            }
        } catch (error) {
            console.error('Error fetching accounts:', error);
            message.error('Không thể tải danh sách tài khoản');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    // Filter accounts
    const filteredAccounts = accounts.filter(account => {
        const matchSearch =
            account.email?.toLowerCase().includes(searchText.toLowerCase()) ||
            account.name?.toLowerCase().includes(searchText.toLowerCase()) ||
            account.employee?.name?.toLowerCase().includes(searchText.toLowerCase());

        const matchRole = roleFilter === 'all' || account.role === roleFilter;
        const matchStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && account.isActive !== false) ||
            (statusFilter === 'inactive' && account.isActive === false);

        return matchSearch && matchRole && matchStatus;
    });

    // Handle edit account
    const handleEdit = (record) => {
        setSelectedAccount(record);
        editForm.setFieldsValue({
            email: record.email,
            role: record.role,
            isActive: record.isActive !== false
        });
        setEditModalVisible(true);
    };

    const handleEditSubmit = async (values) => {
        try {
            const API_URL = getAPIUrl();
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/auth/accounts/${selectedAccount._id}`, values, {
                headers: { Authorization: `Bearer ${token}` }
            });

            message.success('Cập nhật tài khoản thành công');
            setEditModalVisible(false);
            fetchAccounts();
        } catch (error) {
            console.error('Error updating account:', error);
            message.error(error.response?.data?.message || 'Không thể cập nhật tài khoản');
        }
    };

    // Handle reset password
    const handleResetPassword = (record) => {
        setSelectedAccount(record);
        resetPasswordForm.resetFields();
        setResetPasswordModalVisible(true);
    };

    const handleResetPasswordSubmit = async (values) => {
        try {
            const API_URL = getAPIUrl();
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/auth/accounts/${selectedAccount._id}/reset-password`, {
                newPassword: values.newPassword
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            message.success('Đặt lại mật khẩu thành công');
            setResetPasswordModalVisible(false);
        } catch (error) {
            console.error('Error resetting password:', error);
            message.error(error.response?.data?.message || 'Không thể đặt lại mật khẩu');
        }
    };

    // Handle toggle active status
    const handleToggleActive = async (record) => {
        try {
            const API_URL = getAPIUrl();
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/auth/accounts/${record._id}`, {
                isActive: !record.isActive
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            message.success(record.isActive ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản');
            fetchAccounts();
        } catch (error) {
            console.error('Error toggling account status:', error);
            message.error(error.response?.data?.message || 'Không thể thay đổi trạng thái tài khoản');
        }
    };

    // View detail
    const handleViewDetail = (record) => {
        setSelectedAccount(record);
        setDetailModalVisible(true);
    };

    const getRoleTag = (role) => {
        const roleConfig = {
            manager: { color: 'red', label: 'Admin' },
            accountant: { color: 'purple', label: 'Kế toán' },
            employee: { color: 'blue', label: 'Nhân viên' }
        };
        const config = roleConfig[role] || { color: 'default', label: role };
        return <Tag color={config.color}>{config.label}</Tag>;
    };

    const columns = [
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            render: (text) => (
                <Space>
                    <MailOutlined style={{ color: '#1890ff' }} />
                    <Text strong>{text}</Text>
                </Space>
            )
        },
        {
            title: 'Tên nhân viên',
            dataIndex: ['employee', 'name'],
            key: 'employeeName',
            render: (text, record) => (
                <Text>{text || record.name || '-'}</Text>
            )
        },
        {
            title: 'Vai trò',
            dataIndex: 'role',
            key: 'role',
            width: 120,
            render: (role) => getRoleTag(role)
        },
        {
            title: 'Trạng thái',
            dataIndex: 'isActive',
            key: 'isActive',
            width: 120,
            render: (isActive) => (
                isActive !== false ? (
                    <Badge status="success" text={<Text type="success">Hoạt động</Text>} />
                ) : (
                    <Badge status="error" text={<Text type="danger">Đã khóa</Text>} />
                )
            )
        },
        {
            title: 'Profile',
            dataIndex: 'profileCompleted',
            key: 'profileCompleted',
            width: 100,
            render: (completed) => (
                completed ? (
                    <Tag icon={<CheckCircleOutlined />} color="success">Hoàn thành</Tag>
                ) : (
                    <Tag icon={<CloseCircleOutlined />} color="warning">Chưa xong</Tag>
                )
            )
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 200,
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="Xem chi tiết">
                        <Button
                            type="text"
                            icon={<EyeOutlined />}
                            onClick={() => handleViewDetail(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Sửa tài khoản">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => handleEdit(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Đặt lại mật khẩu">
                        <Button
                            type="text"
                            icon={<KeyOutlined />}
                            onClick={() => handleResetPassword(record)}
                        />
                    </Tooltip>
                    <Tooltip title={record.isActive !== false ? 'Khóa tài khoản' : 'Mở khóa'}>
                        <Popconfirm
                            title={record.isActive !== false ? 'Khóa tài khoản này?' : 'Mở khóa tài khoản này?'}
                            onConfirm={() => handleToggleActive(record)}
                        >
                            <Button
                                type="text"
                                danger={record.isActive !== false}
                                icon={record.isActive !== false ? <LockOutlined /> : <UnlockOutlined />}
                            />
                        </Popconfirm>
                    </Tooltip>
                </Space>
            )
        }
    ];

    return (
        <div>
            <Title level={4} style={{ marginBottom: 16 }}>
                <KeyOutlined style={{ marginRight: 8 }} />
                Quản lý tài khoản
            </Title>

            {/* Statistics */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={4}>
                    <Card size="small">
                        <Statistic
                            title="Tổng tài khoản"
                            value={stats.total}
                            prefix={<TeamOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col span={4}>
                    <Card size="small">
                        <Statistic
                            title="Đang hoạt động"
                            value={stats.active}
                            prefix={<CheckCircleOutlined />}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col span={4}>
                    <Card size="small">
                        <Statistic
                            title="Đã khóa"
                            value={stats.inactive}
                            prefix={<LockOutlined />}
                            valueStyle={{ color: '#ff4d4f' }}
                        />
                    </Card>
                </Col>
                <Col span={4}>
                    <Card size="small">
                        <Statistic
                            title="Admin"
                            value={stats.managers}
                            prefix={<SafetyOutlined />}
                            valueStyle={{ color: '#ff4d4f' }}
                        />
                    </Card>
                </Col>
                <Col span={4}>
                    <Card size="small">
                        <Statistic
                            title="Kế toán"
                            value={stats.accountants}
                            prefix={<UserOutlined />}
                            valueStyle={{ color: '#722ed1' }}
                        />
                    </Card>
                </Col>
                <Col span={4}>
                    <Card size="small">
                        <Statistic
                            title="Nhân viên"
                            value={stats.employees}
                            prefix={<UserOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Filters */}
            <Card size="small" style={{ marginBottom: 16 }}>
                <Space wrap>
                    <Input
                        placeholder="Tìm kiếm email, tên..."
                        prefix={<SearchOutlined />}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ width: 250 }}
                        allowClear
                    />
                    <Select
                        value={roleFilter}
                        onChange={setRoleFilter}
                        style={{ width: 150 }}
                    >
                        <Option value="all">Tất cả vai trò</Option>
                        <Option value="manager">Admin</Option>
                        <Option value="accountant">Kế toán</Option>
                        <Option value="employee">Nhân viên</Option>
                    </Select>
                    <Select
                        value={statusFilter}
                        onChange={setStatusFilter}
                        style={{ width: 150 }}
                    >
                        <Option value="all">Tất cả trạng thái</Option>
                        <Option value="active">Hoạt động</Option>
                        <Option value="inactive">Đã khóa</Option>
                    </Select>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={fetchAccounts}
                    >
                        Làm mới
                    </Button>
                </Space>
            </Card>

            {/* Table */}
            <Card size="small">
                <Table
                    columns={columns}
                    dataSource={filteredAccounts}
                    rowKey="_id"
                    loading={loading}
                    pagination={{
                        showSizeChanger: true,
                        showTotal: (total) => `Tổng ${total} tài khoản`
                    }}
                    size="small"
                />
            </Card>

            {/* Edit Modal */}
            <Modal
                title={<><EditOutlined /> Chỉnh sửa tài khoản</>}
                open={editModalVisible}
                onCancel={() => setEditModalVisible(false)}
                footer={null}
            >
                <Form
                    form={editForm}
                    layout="vertical"
                    onFinish={handleEditSubmit}
                >
                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[
                            { required: true, message: 'Vui lòng nhập email' },
                            { type: 'email', message: 'Email không hợp lệ' }
                        ]}
                    >
                        <Input prefix={<MailOutlined />} disabled />
                    </Form.Item>

                    <Form.Item
                        name="role"
                        label="Vai trò"
                        rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
                    >
                        <Select>
                            <Option value="manager">Admin</Option>
                            <Option value="accountant">Kế toán</Option>
                            <Option value="employee">Nhân viên</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="isActive"
                        label="Trạng thái"
                        valuePropName="checked"
                    >
                        <Switch
                            checkedChildren="Hoạt động"
                            unCheckedChildren="Khóa"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                Lưu thay đổi
                            </Button>
                            <Button onClick={() => setEditModalVisible(false)}>
                                Hủy
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Reset Password Modal */}
            <Modal
                title={<><KeyOutlined /> Đặt lại mật khẩu</>}
                open={resetPasswordModalVisible}
                onCancel={() => setResetPasswordModalVisible(false)}
                footer={null}
            >
                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                    Đặt mật khẩu mới cho tài khoản: <Text strong>{selectedAccount?.email}</Text>
                </Text>

                <Form
                    form={resetPasswordForm}
                    layout="vertical"
                    onFinish={handleResetPasswordSubmit}
                >
                    <Form.Item
                        name="newPassword"
                        label="Mật khẩu mới"
                        rules={[
                            { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                            { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' }
                        ]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder="Nhập mật khẩu mới"
                        />
                    </Form.Item>

                    <Form.Item
                        name="confirmPassword"
                        label="Xác nhận mật khẩu"
                        dependencies={['newPassword']}
                        rules={[
                            { required: true, message: 'Vui lòng xác nhận mật khẩu' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('newPassword') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
                                }
                            })
                        ]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder="Xác nhận mật khẩu mới"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                Đặt lại mật khẩu
                            </Button>
                            <Button onClick={() => setResetPasswordModalVisible(false)}>
                                Hủy
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Detail Modal */}
            <Modal
                title={<><EyeOutlined /> Chi tiết tài khoản</>}
                open={detailModalVisible}
                onCancel={() => setDetailModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setDetailModalVisible(false)}>
                        Đóng
                    </Button>
                ]}
            >
                {selectedAccount && (
                    <Descriptions column={1} bordered size="small">
                        <Descriptions.Item label="Email">
                            {selectedAccount.email}
                        </Descriptions.Item>
                        <Descriptions.Item label="Tên nhân viên">
                            {selectedAccount.employee?.name || selectedAccount.name || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Vai trò">
                            {getRoleTag(selectedAccount.role)}
                        </Descriptions.Item>
                        <Descriptions.Item label="Trạng thái">
                            {selectedAccount.isActive !== false ? (
                                <Badge status="success" text="Hoạt động" />
                            ) : (
                                <Badge status="error" text="Đã khóa" />
                            )}
                        </Descriptions.Item>
                        <Descriptions.Item label="Profile hoàn thành">
                            {selectedAccount.profileCompleted ? 'Có' : 'Chưa'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Mã nhân viên">
                            {selectedAccount.employee?.employeeId || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Phòng ban">
                            {selectedAccount.employee?.department || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Ngày tạo">
                            {selectedAccount.createdAt ?
                                new Date(selectedAccount.createdAt).toLocaleDateString('vi-VN') : '-'}
                        </Descriptions.Item>
                    </Descriptions>
                )}
            </Modal>
        </div>
    );
};

export default AccountManagement;
