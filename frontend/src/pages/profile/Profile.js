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
  message
} from 'antd';
import { 
  UserOutlined, 
  MailOutlined, 
  PhoneOutlined,
  HomeOutlined,
  SaveOutlined,
  WarningOutlined,
  BankOutlined,
  IdcardOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { getAPIUrl } from '../../utils/configManager';

const { Option } = Select;

const { Title, Text } = Typography;

const Profile = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [profileIncomplete, setProfileIncomplete] = useState(false);

  const fetchProfileData = useCallback(async () => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      // Get user info from localStorage first (for basic info)
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

      // Fetch latest employee profile from API
      if (user && user.role === 'employee') {
        try {
          const response = await axios.get(`${API_URL}/employees/profile/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data.success && response.data.data.employee) {
            const employee = response.data.data.employee;
            
            // Update userInfo with latest data
            const updatedUser = {
              ...user,
              ...employee,
              phone: employee.phone || user.phone || '',
              address: employee.address || user.address || '',
              citizenId: employee.citizenId || user.citizenId || '',
              socialInsuranceNumber: employee.socialInsuranceNumber || user.socialInsuranceNumber || '',
              dateOfBirth: employee.dateOfBirth || user.dateOfBirth || '',
              gender: employee.gender || user.gender || '',
              bankAccount: employee.bankAccount || user.bankAccount || {},
              profileCompleted: employee.profileCompleted || false
            };
            
            setUserInfo(updatedUser);
            
            // Check if profile is incomplete
            if (!employee.profileCompleted) {
              setProfileIncomplete(true);
            }
            
            // Populate form with latest data
            form.setFieldsValue({
              name: updatedUser.name || updatedUser.email || user.email,
              email: updatedUser.email || user.email,
              phone: updatedUser.phone || employee.phone || '',
              address: updatedUser.address || employee.address || '',
              citizenId: updatedUser.citizenId || employee.citizenId || '',
              socialInsuranceNumber: updatedUser.socialInsuranceNumber || employee.socialInsuranceNumber || '',
              dateOfBirth: employee.dateOfBirth ? (typeof employee.dateOfBirth === 'string' ? employee.dateOfBirth.split('T')[0] : employee.dateOfBirth) : (user.dateOfBirth ? (typeof user.dateOfBirth === 'string' ? user.dateOfBirth.split('T')[0] : user.dateOfBirth) : ''),
              gender: updatedUser.gender || employee.gender || '',
              bankName: employee.bankAccount?.bankName || user.bankAccount?.bankName || '',
              accountNumber: employee.bankAccount?.accountNumber || user.bankAccount?.accountNumber || '',
              accountName: employee.bankAccount?.accountName || user.bankAccount?.accountName || ''
            });
            
            // Update localStorage with latest data
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
        } catch (apiError) {
          console.error('Error fetching profile from API:', apiError);
          // Fallback to localStorage data if API fails
          if (user) {
            form.setFieldsValue({
              name: user.name || user.email,
              email: user.email,
              phone: user.phone || '',
              address: user.address || '',
              citizenId: user.citizenId || '',
              socialInsuranceNumber: user.socialInsuranceNumber || '',
              dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
              gender: user.gender || '',
              bankName: user.bankAccount?.bankName || '',
              accountNumber: user.bankAccount?.accountNumber || '',
              accountName: user.bankAccount?.accountName || ''
            });
          }
        }
      } else if (user) {
        // For non-employee users, use localStorage data
        form.setFieldsValue({
          name: user.name || user.email,
          email: user.email,
          phone: user.phone || '',
          address: user.address || '',
          citizenId: user.citizenId || '',
          socialInsuranceNumber: user.socialInsuranceNumber || '',
          dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
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
      
      // Call API to update profile using updateMyProfile endpoint
      const response = await axios.put(
        `${API_URL}/employees/profile/me`,
        {
          phone: values.phone,
          address: values.address,
          citizenId: values.citizenId,
          socialInsuranceNumber: values.socialInsuranceNumber,
          dateOfBirth: values.dateOfBirth,
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
        
        // Fetch latest data from API to ensure consistency
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
    <div>
      <Card>
        <Title level={3} style={{ margin: 0, marginBottom: 24 }}>
          <UserOutlined /> Thông tin cá nhân
        </Title>

        <Row gutter={[24, 24]}>
          {/* Left Column - Avatar & Basic Info */}
          <Col xs={24} md={8}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Avatar 
                size={120} 
                icon={<UserOutlined />} 
                style={{ marginBottom: 16, backgroundColor: '#1890ff' }}
              />
              <Title level={4} style={{ marginBottom: 8 }}>
                {userInfo?.name || userInfo?.email || 'User'}
              </Title>
              <Tag color={getRoleColor(userInfo?.role)} style={{ marginBottom: 16 }}>
                {getRoleText(userInfo?.role)}
              </Tag>
              <Divider />
              <div style={{ textAlign: 'left' }}>
                <Text type="secondary">Email:</Text>
                <br />
                <Text strong>{userInfo?.email || 'N/A'}</Text>
                <br /><br />
                <Text type="secondary">Mã nhân viên:</Text>
                <br />
                <Text strong>{userInfo?.employeeId || 'N/A'}</Text>
                <br /><br />
                <Text type="secondary">Trạng thái:</Text>
                <br />
                <Tag color="green">Hoạt động</Tag>
              </div>
            </Card>
          </Col>

          {/* Right Column - Edit Form */}
          <Col xs={24} md={16}>
            {profileIncomplete && (
              <Alert
                message="Hồ sơ chưa hoàn thiện"
                description="Vui lòng điền đầy đủ thông tin cá nhân bên dưới để hoàn thiện hồ sơ của bạn."
                type="warning"
                showIcon
                icon={<WarningOutlined />}
                style={{ marginBottom: 16 }}
                closable
              />
            )}
            
            <Card size="small" title="Chỉnh sửa thông tin">
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
              >
                <Divider orientation="left">Thông tin cơ bản</Divider>
                
                <Form.Item
                  name="name"
                  label="Họ và tên"
                  rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
                >
                  <Input 
                    prefix={<UserOutlined />} 
                    placeholder="Nhập họ và tên"
                    disabled
                  />
                </Form.Item>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="email"
                      label="Email"
                      rules={[
                        { required: true, message: 'Vui lòng nhập email' },
                        { type: 'email', message: 'Email không hợp lệ' }
                      ]}
                    >
                      <Input 
                        prefix={<MailOutlined />} 
                        placeholder="Nhập email"
                        disabled
                      />
                    </Form.Item>
                  </Col>
                  
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="phone"
                      label="Số điện thoại"
                      rules={[{ required: true, message: 'Vui lòng nhập SĐT' }]}
                    >
                      <Input 
                        prefix={<PhoneOutlined />} 
                        placeholder="Nhập số điện thoại"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="address"
                  label="Địa chỉ"
                  rules={[{ required: true, message: 'Vui lòng nhập địa chỉ' }]}
                >
                  <Input.TextArea 
                    placeholder="Nhập địa chỉ đầy đủ"
                    rows={2}
                  />
                </Form.Item>

                <Divider orientation="left">Thông tin cá nhân</Divider>
                
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="citizenId"
                      label="Số CCCD/CMND"
                      rules={[
                        { required: true, message: 'Vui lòng nhập số CCCD' },
                        { len: 12, message: 'CCCD phải có 12 số' }
                      ]}
                    >
                      <Input 
                        prefix={<IdcardOutlined />} 
                        placeholder="Nhập số CCCD (12 số)"
                        maxLength={12}
                      />
                    </Form.Item>
                  </Col>
                  
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="socialInsuranceNumber"
                      label="Mã số BHXH"
                    >
                      <Input 
                        placeholder="Nhập mã số BHXH (nếu có)"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="dateOfBirth"
                      label="Ngày sinh"
                    >
                      <Input type="date" />
                    </Form.Item>
                  </Col>
                  
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="gender"
                      label="Giới tính"
                    >
                      <Select placeholder="Chọn giới tính">
                        <Option value="male">Nam</Option>
                        <Option value="female">Nữ</Option>
                        <Option value="other">Khác</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Divider orientation="left">Thông tin ngân hàng</Divider>
                
                <Form.Item
                  name="bankName"
                  label="Tên ngân hàng"
                >
                  <Input 
                    prefix={<BankOutlined />} 
                    placeholder="Ví dụ: Vietcombank, ACB, BIDV..."
                  />
                </Form.Item>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="accountNumber"
                      label="Số tài khoản"
                    >
                      <Input placeholder="Nhập số tài khoản" />
                    </Form.Item>
                  </Col>
                  
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="accountName"
                      label="Tên tài khoản"
                    >
                      <Input placeholder="Nhập tên tài khoản (viết hoa)" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    icon={<SaveOutlined />}
                    loading={loading}
                    size="large"
                  >
                    {profileIncomplete ? 'Hoàn thiện hồ sơ' : 'Lưu thay đổi'}
                  </Button>
                </Form.Item>
              </Form>
            </Card>

            {/* Change Password Section */}
            <Card size="small" title="Đổi mật khẩu" style={{ marginTop: 16 }}>
              <Form layout="vertical">
                <Form.Item
                  label="Mật khẩu hiện tại"
                  name="currentPassword"
                >
                  <Input.Password 
                    placeholder="Nhập mật khẩu hiện tại"
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  label="Mật khẩu mới"
                  name="newPassword"
                >
                  <Input.Password 
                    placeholder="Nhập mật khẩu mới"
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  label="Xác nhận mật khẩu mới"
                  name="confirmPassword"
                >
                  <Input.Password 
                    placeholder="Xác nhận mật khẩu mới"
                    size="large"
                  />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                  <Button 
                    type="default" 
                    size="large"
                    onClick={() => message.info('Tính năng đổi mật khẩu sẽ được cập nhật sau')}
                  >
                    Đổi mật khẩu
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default Profile;

