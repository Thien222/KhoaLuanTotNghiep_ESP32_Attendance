import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  DatePicker,
  Select,
  Button,
  Steps,
  message,
  Alert,
  App
} from 'antd';
import { UserOutlined, IdcardOutlined, BankOutlined } from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { getAPIUrl } from '../../utils/configManager';

const { Step } = Steps;
const { Option } = Select;
const { TextArea } = Input;

const CompleteProfile = () => {
  const { message: messageApi } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [employee, setEmployee] = useState(null);
  const [fingerprintEnrolled, setFingerprintEnrolled] = useState(false);

  useEffect(() => {
    fetchMyProfile();
  }, []);

  const fetchMyProfile = async () => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_URL}/employees/profile/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        const emp = response.data.data.employee;
        setEmployee(emp);
        setFingerprintEnrolled(emp.fingerprintEnrolled);
        
        // Pre-fill form if data exists
        form.setFieldsValue({
          address: emp.address,
          citizenId: emp.citizenId,
          dateOfBirth: emp.dateOfBirth ? moment(emp.dateOfBirth) : null,
          gender: emp.gender,
          bankName: emp.bankAccount?.bankName,
          accountNumber: emp.bankAccount?.accountNumber,
          accountName: emp.bankAccount?.accountName,
          socialInsuranceNumber: emp.socialInsuranceNumber
        });
        
        if (emp.profileCompleted) {
          setCurrentStep(2);
        } else if (emp.fingerprintEnrolled) {
          setCurrentStep(1);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      messageApi.error('Lỗi khi tải thông tin');
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      const profileData = {
        address: values.address,
        citizenId: values.citizenId,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.toDate() : null,
        gender: values.gender,
        bankAccount: {
          bankName: values.bankName,
          accountNumber: values.accountNumber,
          accountName: values.accountName
        },
        socialInsuranceNumber: values.socialInsuranceNumber
      };
      
      const response = await axios.post(
        `${API_URL}/employees/profile/complete`,
        profileData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        messageApi.success('Hoàn thiện thông tin thành công!');
        
        // Update localStorage with profileCompleted status
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            user.profileCompleted = true;
            localStorage.setItem('user', JSON.stringify(user));
          } catch (error) {
            console.error('Error updating localStorage:', error);
          }
        }
        
        setCurrentStep(2);
        fetchMyProfile();
        
        // Redirect to requests after a short delay
        setTimeout(() => {
          window.location.href = '/requests';
        }, 2000);
      }
    } catch (error) {
      console.error('Error completing profile:', error);
      messageApi.error(error.response?.data?.message || 'Lỗi khi lưu thông tin');
    } finally {
      setLoading(false);
    }
  };

  if (!employee) {
    return <Card loading>Đang tải...</Card>;
  }

  if (employee.profileCompleted) {
    return (
      <Card>
        <Alert
          message="Thông tin đã hoàn thiện"
          description="Bạn đã hoàn thiện thông tin cá nhân. Bạn có thể cập nhật thông tin trong trang Profile."
          type="success"
          showIcon
        />
      </Card>
    );
  }

  return (
    <Card>
      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        <Step title="Đăng ký vân tay" status={fingerprintEnrolled ? 'finish' : 'wait'} />
        <Step title="Hoàn thiện thông tin" status={currentStep === 1 ? 'process' : 'wait'} />
        <Step title="Hoàn thành" />
      </Steps>

      {!fingerprintEnrolled && (
        <Alert
          message="Chưa đăng ký vân tay"
          description="Vui lòng liên hệ quản lý để đăng ký vân tay trước khi hoàn thiện thông tin."
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {fingerprintEnrolled && (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          disabled={loading}
        >
          <Card title={<><UserOutlined /> Thông tin cá nhân</>} style={{ marginBottom: 16 }}>
            <Form.Item
              label="Địa chỉ"
              name="address"
              rules={[{ required: true, message: 'Vui lòng nhập địa chỉ' }]}
            >
              <TextArea rows={2} placeholder="Nhập địa chỉ thường trú" />
            </Form.Item>

            <Form.Item
              label="Số CMND/CCCD"
              name="citizenId"
              rules={[
                { required: true, message: 'Vui lòng nhập số CMND/CCCD' },
                { pattern: /^[0-9]{9,12}$/, message: 'Số CMND/CCCD không hợp lệ' }
              ]}
            >
              <Input placeholder="Nhập số CMND/CCCD" />
            </Form.Item>

            <Form.Item
              label="Ngày sinh"
              name="dateOfBirth"
              rules={[{ required: true, message: 'Vui lòng chọn ngày sinh' }]}
            >
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>

            <Form.Item
              label="Giới tính"
              name="gender"
              rules={[{ required: true, message: 'Vui lòng chọn giới tính' }]}
            >
              <Select placeholder="Chọn giới tính">
                <Option value="male">Nam</Option>
                <Option value="female">Nữ</Option>
                <Option value="other">Khác</Option>
              </Select>
            </Form.Item>
          </Card>

          <Card title={<><IdcardOutlined /> Thông tin bảo hiểm</>} style={{ marginBottom: 16 }}>
            <Form.Item
              label="Số BHXH"
              name="socialInsuranceNumber"
              rules={[
                { required: true, message: 'Vui lòng nhập số BHXH' },
                { pattern: /^[0-9]{10}$/, message: 'Số BHXH phải có 10 chữ số' }
              ]}
            >
              <Input placeholder="Nhập số BHXH" />
            </Form.Item>
          </Card>

          <Card title={<><BankOutlined /> Thông tin tài khoản ngân hàng</>} style={{ marginBottom: 16 }}>
            <Form.Item
              label="Tên ngân hàng"
              name="bankName"
              rules={[{ required: true, message: 'Vui lòng nhập tên ngân hàng' }]}
            >
              <Input placeholder="VD: Vietcombank, Techcombank..." />
            </Form.Item>

            <Form.Item
              label="Số tài khoản"
              name="accountNumber"
              rules={[
                { required: true, message: 'Vui lòng nhập số tài khoản' },
                { pattern: /^[0-9]{8,20}$/, message: 'Số tài khoản không hợp lệ' }
              ]}
            >
              <Input placeholder="Nhập số tài khoản" />
            </Form.Item>

            <Form.Item
              label="Tên chủ tài khoản"
              name="accountName"
              rules={[{ required: true, message: 'Vui lòng nhập tên chủ tài khoản' }]}
            >
              <Input placeholder="Nhập tên chủ tài khoản (đúng như trên thẻ)" />
            </Form.Item>
          </Card>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              Hoàn thiện thông tin
            </Button>
          </Form.Item>
        </Form>
      )}
    </Card>
  );
};

export default CompleteProfile;




