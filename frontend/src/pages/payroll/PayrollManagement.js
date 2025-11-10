import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  DatePicker, 
  Select, 
  Card, 
  Typography,
  Tag,
  message,
  Modal,
  Form,
  Input,
  InputNumber,
  Descriptions,
  Divider,
  List,
  Row,
  Col,
  Statistic
} from 'antd';
import { 
  DollarOutlined, 
  EyeOutlined,
  CalculatorOutlined,
  EditOutlined,
  PlusOutlined,
  MinusOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { getAPIUrl } from '../../utils/configManager';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const PayrollManagement = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(moment());
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchPayrolls();
  }, [selectedMonth]);

  const fetchPayrolls = async () => {
    setLoading(true);
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      if (!token) {
        message.error('Chưa đăng nhập');
        return;
      }
      
      const month = selectedMonth.month() + 1;
      const year = selectedMonth.year();
      
      const response = await axios.get(`${API_URL}/payroll`, {
        params: { month, year },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setPayrolls(response.data.data || []);
      } else {
        message.error(response.data.message || 'Lỗi khi tải dữ liệu');
      }
    } catch (error) {
      console.error('Error fetching payrolls:', error);
      message.error(error.response?.data?.message || 'Lỗi khi tải dữ liệu bảng lương');
      setPayrolls([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (payroll) => {
    setSelectedPayroll(payroll);
    setDetailModalVisible(true);
  };

  const handleAdjustSalary = (payroll) => {
    setSelectedPayroll(payroll);
    setAdjustModalVisible(true);
    form.resetFields();
  };

  const handleCalculatePayroll = async () => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      const month = selectedMonth.month() + 1;
      const year = selectedMonth.year();
      
      const response = await axios.post(
        `${API_URL}/payroll/calculate`,
        { month, year },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        message.success('Tính lương thành công');
        fetchPayrolls();
      } else {
        message.error(response.data.message || 'Lỗi khi tính lương');
      }
    } catch (error) {
      console.error('Error calculating payroll:', error);
      message.error(error.response?.data?.message || 'Lỗi khi tính lương');
    }
  };

  const handleAdjustSubmit = async (values) => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${API_URL}/payroll/${selectedPayroll._id}/adjust`,
        {
          type: values.type,
          amount: values.amount,
          reason: values.reason
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        message.success('Điều chỉnh lương thành công');
        setAdjustModalVisible(false);
        form.resetFields();
        fetchPayrolls();
      } else {
        message.error(response.data.message || 'Lỗi khi điều chỉnh lương');
      }
    } catch (error) {
      console.error('Error adjusting salary:', error);
      message.error(error.response?.data?.message || 'Lỗi khi điều chỉnh lương');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'calculated': return 'blue';
      case 'paid': return 'green';
      case 'pending': return 'orange';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'calculated': return 'Đã tính';
      case 'paid': return 'Đã thanh toán';
      case 'pending': return 'Chờ xử lý';
      default: return status;
    }
  };

  const getAdjustmentTypeText = (type) => {
    const types = {
      bonus: 'Thưởng',
      penalty: 'Phạt',
      increase: 'Tăng',
      decrease: 'Giảm'
    };
    return types[type] || type;
  };

  const getAdjustmentTypeColor = (type) => {
    const colors = {
      bonus: 'green',
      penalty: 'red',
      increase: 'blue',
      decrease: 'orange'
    };
    return colors[type] || 'default';
  };

  const columns = [
    {
      title: 'Nhân viên',
      dataIndex: ['employee', 'name'],
      key: 'employeeName',
      width: 150,
    },
    {
      title: 'Tháng',
      dataIndex: 'month',
      key: 'month',
      render: (month) => `${month}/`,
      width: 80,
    },
    {
      title: 'Năm',
      dataIndex: 'year',
      key: 'year',
      width: 70,
    },
    {
      title: 'Lương CB',
      dataIndex: 'basicSalary',
      key: 'basicSalary',
      render: (amount) => new Intl.NumberFormat('vi-VN', { 
        style: 'currency', 
        currency: 'VND' 
      }).format(amount || 0),
      width: 120,
    },
    {
      title: 'Muộn',
      dataIndex: 'lateMinutes',
      key: 'lateMinutes',
      render: (minutes, record) => minutes > 0 ? (
        <Tag color="warning">{minutes}p ({record.lateCount || 0} lần)</Tag>
      ) : '-',
      width: 100,
    },
    {
      title: 'Khấu trừ',
      dataIndex: 'deductions',
      key: 'deductions',
      render: (amount) => amount > 0 ? (
        <Tag color="error">{new Intl.NumberFormat('vi-VN').format(amount)} đ</Tag>
      ) : '-',
      width: 100,
    },
    {
      title: 'Thưởng',
      dataIndex: 'bonus',
      key: 'bonus',
      render: (amount) => amount > 0 ? (
        <Tag color="green">{new Intl.NumberFormat('vi-VN').format(amount)} đ</Tag>
      ) : '-',
      width: 100,
    },
    {
      title: 'Tổng lương',
      dataIndex: 'totalSalary',
      key: 'totalSalary',
      render: (amount) => (
        <Text strong style={{ color: '#52c41a' }}>
          {new Intl.NumberFormat('vi-VN', { 
            style: 'currency', 
            currency: 'VND' 
          }).format(amount || 0)}
        </Text>
      ),
      width: 130,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
      width: 100,
    },
    {
      title: 'Hành động',
      key: 'action',
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="primary" 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
          >
            Chi tiết
          </Button>
          <Button 
            type="default" 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => handleAdjustSalary(record)}
          >
            Điều chỉnh
          </Button>
        </Space>
      ),
      width: 180,
    },
  ];

  // Calculate totals
  const totalBasicSalary = payrolls.reduce((sum, p) => sum + (p.basicSalary || 0), 0);
  const totalDeductions = payrolls.reduce((sum, p) => sum + (p.deductions || 0), 0);
  const totalBonus = payrolls.reduce((sum, p) => sum + (p.bonus || 0), 0);
  const totalSalary = payrolls.reduce((sum, p) => sum + (p.totalSalary || 0), 0);

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>Quản lý bảng lương</Title>
        </div>

        {/* Summary Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="Tổng lương cơ bản"
                value={totalBasicSalary}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#1890ff' }}
                formatter={(value) => new Intl.NumberFormat('vi-VN').format(value)}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="Tổng khấu trừ"
                value={totalDeductions}
                prefix={<MinusOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
                formatter={(value) => new Intl.NumberFormat('vi-VN').format(value)}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="Tổng thưởng"
                value={totalBonus}
                prefix={<PlusOutlined />}
                valueStyle={{ color: '#52c41a' }}
                formatter={(value) => new Intl.NumberFormat('vi-VN').format(value)}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="Tổng chi trả"
                value={totalSalary}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#722ed1', fontWeight: 'bold' }}
                formatter={(value) => new Intl.NumberFormat('vi-VN').format(value)}
              />
            </Card>
          </Col>
        </Row>

        <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <DatePicker
            picker="month"
            value={selectedMonth}
            onChange={setSelectedMonth}
            format="MM/YYYY"
          />
          <Button 
            type="primary" 
            icon={<CalculatorOutlined />}
            onClick={handleCalculatePayroll}
          >
            Tính lương
          </Button>
          <Button 
            icon={<DollarOutlined />}
            onClick={fetchPayrolls}
          >
            Tải lại
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={payrolls}
          loading={loading}
          rowKey="_id"
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Tổng ${total} nhân viên`
          }}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title={`Chi tiết bảng lương - ${selectedPayroll?.employee?.name || ''}`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={700}
      >
        {selectedPayroll && (
          <div>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Nhân viên" span={2}>
                {selectedPayroll.employee?.name}
              </Descriptions.Item>
              <Descriptions.Item label="Tháng">
                {selectedPayroll.month}/{selectedPayroll.year}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={getStatusColor(selectedPayroll.status)}>
                  {getStatusText(selectedPayroll.status)}
                </Tag>
              </Descriptions.Item>
              
              <Descriptions.Item label="Lương cơ bản" span={2}>
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedPayroll.basicSalary || 0)}
              </Descriptions.Item>
              
              <Descriptions.Item label="Số giờ làm">
                {selectedPayroll.workingHours || 0} giờ
              </Descriptions.Item>
              <Descriptions.Item label="Số ngày làm">
                {selectedPayroll.workingDays || 0} ngày
              </Descriptions.Item>
              
              <Descriptions.Item label="Đi muộn">
                {selectedPayroll.lateMinutes || 0} phút ({selectedPayroll.lateCount || 0} lần)
              </Descriptions.Item>
              <Descriptions.Item label="Làm thêm (OT)">
                {selectedPayroll.overtimeHours || 0} giờ
              </Descriptions.Item>
              
              <Descriptions.Item label="Khấu trừ" span={2}>
                <Text type="danger">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedPayroll.deductions || 0)}
                </Text>
              </Descriptions.Item>
              
              <Descriptions.Item label="Thưởng">
                <Text type="success">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedPayroll.bonus || 0)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Lương OT">
                <Text type="success">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedPayroll.overtimePay || 0)}
                </Text>
              </Descriptions.Item>
              
              {selectedPayroll.yearEndBonus > 0 && (
                <Descriptions.Item label="Thưởng cuối năm" span={2}>
                  <Text strong style={{ color: '#52c41a' }}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedPayroll.yearEndBonus)}
                  </Text>
                </Descriptions.Item>
              )}
              
              <Descriptions.Item label="Tổng lương" span={2}>
                <Text strong style={{ fontSize: 18, color: '#722ed1' }}>
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedPayroll.totalSalary || 0)}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            {selectedPayroll.manualAdjustments && selectedPayroll.manualAdjustments.length > 0 && (
              <>
                <Divider>Điều chỉnh thủ công</Divider>
                <List
                  size="small"
                  dataSource={selectedPayroll.manualAdjustments}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <Space>
                            <Tag color={getAdjustmentTypeColor(item.type)}>
                              {getAdjustmentTypeText(item.type)}
                            </Tag>
                            <Text strong>
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.amount)}
                            </Text>
                          </Space>
                        }
                        description={
                          <>
                            <div>{item.reason}</div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {moment(item.date).format('DD/MM/YYYY HH:mm')} - Bởi: {item.createdBy || 'Admin'}
                            </Text>
                          </>
                        }
                      />
                    </List.Item>
                  )}
                />
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Adjust Salary Modal */}
      <Modal
        title={`Điều chỉnh lương - ${selectedPayroll?.employee?.name || ''}`}
        open={adjustModalVisible}
        onCancel={() => {
          setAdjustModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAdjustSubmit}
        >
          <Form.Item
            name="type"
            label="Loại điều chỉnh"
            rules={[{ required: true, message: 'Vui lòng chọn loại điều chỉnh' }]}
          >
            <Select placeholder="Chọn loại điều chỉnh">
              <Option value="bonus">Thưởng</Option>
              <Option value="penalty">Phạt</Option>
              <Option value="increase">Tăng lương</Option>
              <Option value="decrease">Giảm lương</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="amount"
            label="Số tiền (VND)"
            rules={[
              { required: true, message: 'Vui lòng nhập số tiền' },
              { type: 'number', min: 0, message: 'Số tiền phải lớn hơn 0' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/\$\s?|(,*)/g, '')}
              min={0}
              placeholder="Nhập số tiền"
            />
          </Form.Item>

          <Form.Item
            name="reason"
            label="Lý do"
            rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}
          >
            <TextArea 
              rows={3} 
              placeholder="Nhập lý do điều chỉnh (ví dụ: Hoàn thành xuất sắc dự án X, Đi trễ nhiều lần, ...)" 
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setAdjustModalVisible(false);
                form.resetFields();
              }}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit">
                Xác nhận
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PayrollManagement;




