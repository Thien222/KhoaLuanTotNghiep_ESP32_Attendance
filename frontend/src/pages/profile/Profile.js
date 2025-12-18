import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Typography, 
  Form, 
  Input, 
  Button, 
  Row, 
  Col,
  Divider,
  Avatar,
  Tag,
  Select,
  Alert,
  message,
  Modal,
  DatePicker,
  Space
} from 'antd';
import { 
  UserOutlined, 
  MailOutlined, 
  PhoneOutlined,
  HomeOutlined,
  SaveOutlined,
  WarningOutlined,
  BankOutlined,
  IdcardOutlined,
  LockOutlined,
  CalendarOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { getAPIUrl } from '../../utils/configManager';

const { Option } = Select;
const { Title, Text } = Typography;

const Profile = () => {
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);

  const fetchProfileData = useCallback(async () => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      const userData = localStorage.getItem('user');
      let user = null;
      if (userData) {
        try {
          user = JSON.parse(userData);
          setUserInfo(user);
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }

      if (user && user.role === 'employee') {
        try {
          const response = await axios.get(`${API_URL}/employees/profile/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data.success && response.data.data.employee) {
            const employee = response.data.data.employee;
            
            const updatedUser = {
              ...user,
              ...employee,
              phone: employee.phone || user.phone || '',
              address: employee.address || user.address || '',
              citizenId: employee.citizenId || user.citizenId || '',
              dateOfBirth: employee.dateOfBirth || user.dateOfBirth || '',
              gender: employee.gender || user.gender || '',
              bankAccount: employee.bankAccount || user.bankAccount || {},
              profileCompleted: employee.profileCompleted || false
            };
            
            setUserInfo(updatedUser);
            
            if (!employee.profileCompleted) {
              setProfileIncomplete(true);
            }
        
            form.setFieldsValue({
              name: updatedUser.name || updatedUser.email || user.email,
              email: updatedUser.email || user.email,
              phone: updatedUser.phone || employee.phone || '',
              address: updatedUser.address || employee.address || '',
              citizenId: updatedUser.citizenId || employee.citizenId || '',
              dateOfBirth: employee.dateOfBirth ? moment(employee.dateOfBirth) : (user.dateOfBirth ? moment(user.dateOfBirth) : null),
              gender: updatedUser.gender || employee.gender || '',
              bankName: employee.bankAccount?.bankName || user.bankAccount?.bankName || '',
              accountNumber: employee.bankAccount?.accountNumber || user.bankAccount?.accountNumber || '',
              accountName: employee.bankAccount?.accountName || user.bankAccount?.accountName || ''
            });
            
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
        } catch (apiError) {
          console.error('Error fetching profile from API:', apiError);
          if (user) {
            form.setFieldsValue({
              name: user.name || user.email,
              email: user.email,
              phone: user.phone || '',
              address: user.address || '',
              citizenId: user.citizenId || '',
              dateOfBirth: user.dateOfBirth ? moment(user.dateOfBirth) : null,
              gender: user.gender || '',
              bankName: user.bankAccount?.bankName || '',
              accountNumber: user.bankAccount?.accountNumber || '',
              accountName: user.bankAccount?.accountName || ''
            });
          }
        }
      } else if (user) {
        form.setFieldsValue({
          name: user.name || user.email,
          email: user.email,
          phone: user.phone || '',
          address: user.address || '',
          citizenId: user.citizenId || '',
          dateOfBirth: user.dateOfBirth ? moment(user.dateOfBirth) : null,
          gender: user.gender || '',
          bankName: user.bankAccount?.bankName || '',
          accountNumber: user.bankAccount?.accountNumber || '',
          accountName: user.bankAccount?.accountName || ''
        });
      }
    } catch (error) {
      console.error('Error in fetchProfileData:', error);
    }
  }, [form]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const API_URL = getAPIUrl();
      const userData = localStorage.getItem('user');
      
      if (!userData) {
        message.error('Không tìm thấy thông tin người dùng');
        return;
      }
      
      const user = JSON.parse(userData);
      
      const response = await axios.put(
        `${API_URL}/employees/profile/me`,
        {
          phone: values.phone,
          address: values.address,
          citizenId: values.citizenId,
          dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : null,
          gender: values.gender,
          bankAccount: {
            bankName: values.bankName,
            accountNumber: values.accountNumber,
            accountName: values.accountName
          }
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (response.data.success) {
        message.success('Cập nhật hồ sơ thành công!');
        await fetchProfileData();
        setProfileIncomplete(false);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      message.error(error.response?.data?.message || 'Lỗi khi cập nhật thông tin');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (values) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('Mật khẩu xác nhận không khớp');
      return;
    }

    setPasswordLoading(true);
    try {
      const API_URL = getAPIUrl();
      const response = await axios.put(
        `${API_URL}/auth/change-password`,
        {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        message.success('Đổi mật khẩu thành công!');
        setPasswordModalVisible(false);
        passwordForm.resetFields();
      }
    } catch (error) {
      console.error('Error changing password:', error);
      message.error(error.response?.data?.message || 'Lỗi khi đổi mật khẩu');
    } finally {
      setPasswordLoading(false);
    }
  };

  const getRoleText = (role) => {
    const roles = {
      manager: 'Quản lý',
      accountant: 'Kế toán',
      employee: 'Nhân viên'
    };
    return roles[role] || role;
  };

  const getRoleColor = (role) => {
    const colors = {
      manager: 'gold',
      accountant: 'blue',
      employee: 'green'
    };
    return colors[role] || 'default';
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>
          <UserOutlined style={{ marginRight: 8 }} />
          Thông tin cá nhân
        </Title>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <Row gutter={[16, 16]} style={{ height: '100%' }}>
          {/* Left Column - Avatar & Read-only Info (25-30%) */}
          <Col xs={24} md={7}>
            <Card 
              size="small" 
              style={{ 
                textAlign: 'center',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}
              bodyStyle={{ 
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                flex: 1
              }}
            >
              <Avatar 
                size={100} 
                icon={<UserOutlined />} 
                style={{ marginBottom: 12, backgroundColor: '#1890ff' }}
              />
              <Title level={5} style={{ marginBottom: 8, fontSize: 16 }}>
                {userInfo?.name || userInfo?.email || 'User'}
              </Title>
              <Tag color={getRoleColor(userInfo?.role)} style={{ marginBottom: 16, fontSize: 12 }}>
                {getRoleText(userInfo?.role)}
              </Tag>
              
              <Divider style={{ margin: '12px 0' }} />
              
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Email:</Text>
                  <br />
                  <Text strong style={{ fontSize: 13 }}>{userInfo?.email || 'N/A'}</Text>
                </div>
                
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Mã nhân viên:</Text>
                  <br />
                  <Text strong style={{ fontSize: 13 }}>{userInfo?.employeeId || 'N/A'}</Text>
                </div>
                
              
                
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Trạng thái:</Text>
                  <br />
                  <Tag color="green" style={{ fontSize: 12 }}>Hoạt động</Tag>
                </div>
              </div>
            </Card>
          </Col>

          {/* Right Column - Edit Form (70-75%) */}
          <Col xs={24} md={17}>
            {profileIncomplete && (
              <Alert
                message="Hồ sơ chưa hoàn thiện"
                description="Vui lòng điền đầy đủ thông tin cá nhân bên dưới."
                type="warning"
                showIcon
                icon={<WarningOutlined />}
                style={{ marginBottom: 12 }}
                closable
                size="small"
              />
            )}
            
            <Card 
              size="small" 
              title={<span style={{ fontSize: 14 }}>Chỉnh sửa thông tin</span>}
              bodyStyle={{ padding: 16 }}
            >
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                size="small"
              >
                {/* Thông tin cơ bản - Grid Layout */}
                <div style={{ marginBottom: 12 }}>
                  <Text strong style={{ fontSize: 13, color: '#1890ff' }}>Thông tin cơ bản</Text>
                </div>
                
                <Row gutter={[12, 8]}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="name"
                      label={<span style={{ fontSize: 12 }}>Họ và tên</span>}
                      rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
                      style={{ marginBottom: 8 }}
                    >
                      <Input 
                        prefix={<UserOutlined style={{ fontSize: 12 }} />} 
                        placeholder="Nhập họ và tên"
                        disabled
                        size="small"
                      />
                    </Form.Item>
                  </Col>
                  
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="email"
                      label={<span style={{ fontSize: 12 }}>Email</span>}
                      rules={[
                        { required: true, message: 'Vui lòng nhập email' },
                        { type: 'email', message: 'Email không hợp lệ' }
                      ]}
                      style={{ marginBottom: 8 }}
                    >
                      <Input 
                        prefix={<MailOutlined style={{ fontSize: 12 }} />} 
                        placeholder="Nhập email"
                        disabled
                        size="small"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={[12, 8]}>
                  <Col xs={24} sm={8}>
                    <Form.Item
                      name="phone"
                      label={<span style={{ fontSize: 12 }}>Số điện thoại</span>}
                      rules={[{ required: true, message: 'Vui lòng nhập SĐT' }]}
                      style={{ marginBottom: 8 }}
                    >
                      <Input 
                        prefix={<PhoneOutlined style={{ fontSize: 12 }} />} 
                        placeholder="Nhập số điện thoại"
                        size="small"
                      />
                    </Form.Item>
                  </Col>
                  
                  <Col xs={24} sm={8}>
                    <Form.Item
                      name="dateOfBirth"
                      label={<span style={{ fontSize: 12 }}>Ngày sinh</span>}
                      style={{ marginBottom: 8 }}
                    >
                      <DatePicker 
                        style={{ width: '100%' }}
                        format="DD/MM/YYYY"
                        placeholder="Chọn ngày sinh"
                        size="small"
                      />
                    </Form.Item>
                  </Col>
                  
                  <Col xs={24} sm={8}>
                    <Form.Item
                      name="gender"
                      label={<span style={{ fontSize: 12 }}>Giới tính</span>}
                      style={{ marginBottom: 8 }}
                    >
                      <Select placeholder="Chọn giới tính" size="small">
                        <Option value="male">Nam</Option>
                        <Option value="female">Nữ</Option>
                        <Option value="other">Khác</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={[12, 8]}>
                  <Col xs={24}>
                    <Form.Item
                      name="address"
                      label={<span style={{ fontSize: 12 }}>Địa chỉ</span>}
                      rules={[{ required: true, message: 'Vui lòng nhập địa chỉ' }]}
                      style={{ marginBottom: 8 }}
                    >
                      <Input.TextArea 
                        placeholder="Nhập địa chỉ đầy đủ"
                        rows={2}
                        size="small"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {/* Thông tin cá nhân & Ngân hàng - Grid Layout */}
                <div style={{ marginTop: 16, marginBottom: 12 }}>
                  <Text strong style={{ fontSize: 13, color: '#1890ff' }}>Thông tin cá nhân & Ngân hàng</Text>
                </div>

                <Row gutter={[12, 8]}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="citizenId"
                      label={<span style={{ fontSize: 12 }}>Số CCCD/CMND</span>}
                      rules={[
                        { required: true, message: 'Vui lòng nhập số CCCD' },
                        { len: 12, message: 'CCCD phải có 12 số' },
                        {
                          pattern: /^0\d{11}$/,
                          message: 'CCCD phải bắt đầu bằng số 0 và có đúng 12 số'
                        }
                      ]}
                      style={{ marginBottom: 8 }}
                    >
                      <Input 
                        prefix={<IdcardOutlined style={{ fontSize: 12 }} />} 
                        placeholder="Nhập số CCCD (bắt đầu bằng 0, 12 số)"
                        maxLength={12}
                        size="small"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={[12, 8]}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="bankName"
                      label={<span style={{ fontSize: 12 }}>Tên ngân hàng</span>}
                      style={{ marginBottom: 8 }}
                    >
                      <Input 
                        prefix={<BankOutlined style={{ fontSize: 12 }} />} 
                        placeholder="Ví dụ: Vietcombank, ACB..."
                        size="small"
                      />
                    </Form.Item>
                  </Col>
                  
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="accountNumber"
                      label={<span style={{ fontSize: 12 }}>Số tài khoản</span>}
                      style={{ marginBottom: 8 }}
                    >
                      <Input 
                        placeholder="Nhập số tài khoản"
                        size="small"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={[12, 8]}>
                  <Col xs={24}>
                    <Form.Item
                      name="accountName"
                      label={<span style={{ fontSize: 12 }}>Tên tài khoản</span>}
                      style={{ marginBottom: 8 }}
                    >
                      <Input 
                        placeholder="Nhập tên tài khoản (viết hoa)"
                        size="small"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <div style={{ 
                  marginTop: 16, 
                  paddingTop: 12, 
                  borderTop: '1px solid #f0f0f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <Button 
                    type="default"
                    icon={<LockOutlined />}
                    onClick={() => setPasswordModalVisible(true)}
                    size="small"
                  >
                    Đổi mật khẩu
                  </Button>
                  
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    icon={<SaveOutlined />}
                    loading={loading}
                    size="small"
                  >
                    {profileIncomplete ? 'Hoàn thiện hồ sơ' : 'Lưu thay đổi'}
                  </Button>
                </div>
              </Form>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Change Password Modal */}
      <Modal
        title={
          <span>
            <LockOutlined style={{ marginRight: 8 }} />
            Đổi mật khẩu
          </span>
        }
        open={passwordModalVisible}
        onCancel={() => {
          setPasswordModalVisible(false);
          passwordForm.resetFields();
        }}
        footer={null}
        width={450}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleChangePassword}
          size="small"
        >
          <Form.Item
            label="Mật khẩu hiện tại"
            name="currentPassword"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}
          >
            <Input.Password 
              placeholder="Nhập mật khẩu hiện tại"
              size="small"
            />
          </Form.Item>

          <Form.Item
            label="Mật khẩu mới"
            name="newPassword"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới' },
              { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' }
            ]}
          >
            <Input.Password 
              placeholder="Nhập mật khẩu mới"
              size="small"
            />
          </Form.Item>

          <Form.Item
            label="Xác nhận mật khẩu mới"
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
                },
              }),
            ]}
          >
            <Input.Password 
              placeholder="Xác nhận mật khẩu mới"
              size="small"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setPasswordModalVisible(false);
                passwordForm.resetFields();
              }}>
                Hủy
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={passwordLoading}
              >
                Đổi mật khẩu
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Profile;
