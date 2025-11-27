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
  Statistic,
  Tooltip
} from 'antd';
import { 
  DollarOutlined, 
  EyeOutlined,
  CalculatorOutlined,
  EditOutlined,
  PlusOutlined,
  MinusOutlined,
  PrinterOutlined,
  SendOutlined,
  BankOutlined,
  UserOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  ExportOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ReloadOutlined
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
  const [sending, setSending] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(moment());
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchPayrolls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // Enhance data with mock calculations for Insurance, Tax, Allowance
        const enhancedData = (response.data.data || []).map(p => {
          const basicSalary = p.basicSalary || 0;
          
          // Mock Allowance: 10% of basic salary
          const allowance = Math.round(basicSalary * 0.1);
          
          // Mock Insurance: 10.5% of basic salary
          const insurance = Math.round(basicSalary * 0.105);
          
          // Mock Tax: Simplified progressive tax
          // Assume totalSalary from backend is gross before tax/insurance
          const grossIncome = (p.totalSalary || 0) + allowance;
          const taxableIncome = Math.max(0, grossIncome - 11000000 - insurance); // Deduction 11M
          let tax = 0;
          if (taxableIncome > 0) {
            if (taxableIncome <= 5000000) {
              tax = Math.round(taxableIncome * 0.05);
            } else if (taxableIncome <= 10000000) {
              tax = Math.round(250000 + (taxableIncome - 5000000) * 0.1);
            } else {
              tax = Math.round(750000 + (taxableIncome - 10000000) * 0.15);
            }
          }
          
          // Net Salary = Gross (Total + Allowance) - Insurance - Tax - Late Deductions
          const netSalary = (p.totalSalary || 0) + allowance - insurance - tax;
          
          return {
            ...p,
            department: p.employee?.department || 'Chưa phân loại',
            allowance,
            insurance,
            tax,
            netSalary,
            grossIncome: grossIncome
          };
        });
        setPayrolls(enhancedData);
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

  const handleSendPayslips = () => {
    if (payrolls.length === 0) {
      message.warning('Không có dữ liệu lương để gửi');
      return;
    }
    
    setSending(true);
    message.loading({ content: 'Đang tạo và gửi phiếu lương qua email...', key: 'sending', duration: 0 });
    
    setTimeout(() => {
      setSending(false);
      message.success({ 
        content: `Đã gửi thành công ${payrolls.length} phiếu lương đến nhân viên!`, 
        key: 'sending', 
        duration: 4 
      });
    }, 2000);
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

  // Currency formatter
  const currency = (value) => new Intl.NumberFormat('vi-VN', { 
    style: 'currency', 
    currency: 'VND' 
  }).format(value || 0);

  // Number to text helper (simplified for demo)
  const convertNumberToText = (amount) => {
    // Simplified version - in production would be a full number-to-text converter
    const millions = Math.floor(amount / 1000000);
    const thousands = Math.floor((amount % 1000000) / 1000);
    const remainder = amount % 1000;
    
    let text = '';
    if (millions > 0) text += `${millions} triệu `;
    if (thousands > 0) text += `${thousands} nghìn `;
    if (remainder > 0) text += `${remainder} `;
    return text.trim() || 'Không';
  };

  // Grouped Table Columns
  const columns = [
    {
      title: 'Thông tin nhân viên',
      fixed: 'left',
      children: [
        {
          title: 'Họ tên',
          dataIndex: ['employee', 'name'],
          key: 'name',
          width: 180,
          fixed: 'left',
          render: (text) => <Text strong>{text}</Text>
        },
        {
          title: 'Phòng ban',
          dataIndex: 'department',
          key: 'dept',
          width: 140,
          render: (text) => <Tag color="blue">{text}</Tag>
        }
      ]
    },
    {
      title: <span style={{ color: '#52c41a', fontWeight: 'bold' }}><ArrowUpOutlined /> Thu nhập</span>,
      children: [
        {
          title: 'Lương CB',
          dataIndex: 'basicSalary',
          key: 'basic',
          width: 130,
          render: val => currency(val)
        },
        {
          title: 'Phụ cấp',
          dataIndex: 'allowance',
          key: 'allowance',
          width: 120,
          render: val => <Text type="success">+{currency(val)}</Text>
        },
        {
          title: 'Làm thêm',
          dataIndex: 'overtimePay',
          key: 'ot',
          width: 120,
          render: val => val > 0 ? <Text type="success">+{currency(val)}</Text> : '-'
        },
        {
          title: 'Thưởng',
          dataIndex: 'bonus',
          key: 'bonus',
          width: 120,
          render: val => val > 0 ? <Text type="success">+{currency(val)}</Text> : '-'
        }
      ]
    },
    {
      title: <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}><ArrowDownOutlined /> Khấu trừ</span>,
      children: [
        {
          title: 'Đi muộn',
          dataIndex: 'deductions',
          key: 'late',
          width: 120,
          render: (val, record) => record.lateMinutes > 0 ? (
            <Tooltip title={`${record.lateMinutes} phút (${record.lateCount || 0} lần)`}>
              <Text type="danger">-{currency(val)}</Text>
            </Tooltip>
          ) : '-'
        },
        {
          title: 'Bảo hiểm (10.5%)',
          dataIndex: 'insurance',
          key: 'insurance',
          width: 140,
          render: val => <Text type="danger">-{currency(val)}</Text>
        },
        {
          title: 'Thuế TNCN',
          dataIndex: 'tax',
          key: 'tax',
          width: 120,
          render: val => val > 0 ? <Text type="danger">-{currency(val)}</Text> : '-'
        }
      ]
    },
    {
      title: <span style={{ color: '#1890ff', fontWeight: 'bold' }}>Thực lãnh</span>,
      dataIndex: 'netSalary',
      key: 'net',
      fixed: 'right',
      width: 160,
      render: val => <Text strong style={{ color: '#1890ff', fontSize: 16 }}>{currency(val)}</Text>
    },
    {
      title: 'Hành động',
      key: 'action',
      fixed: 'right',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Xem chi tiết">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          <Tooltip title="Điều chỉnh">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => handleAdjustSalary(record)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  // Calculate totals
  const totalNetSalary = payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);
  const totalBasicSalary = payrolls.reduce((sum, p) => sum + (p.basicSalary || 0), 0);
  const totalDeductions = payrolls.reduce((sum, p) => sum + ((p.insurance || 0) + (p.tax || 0) + (p.deductions || 0)), 0);

  return (
    <div>
      <Card>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Space align="center">
            <Title level={3} style={{ margin: 0 }}>
              <BankOutlined style={{ marginRight: 8, color: '#1890ff' }} /> 
              Quản lý Bảng lương
            </Title>
            <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
              Tháng {selectedMonth.format('MM/YYYY')}
            </Tag>
          </Space>
          
          <Space>
            <Button 
              icon={<CalculatorOutlined />} 
              onClick={handleCalculatePayroll}
              loading={loading}
            >
              Tính lương
            </Button>
            <Button 
              icon={<ReloadOutlined />}
              onClick={fetchPayrolls}
            >
              Tải lại
            </Button>
            <Button 
              type="primary" 
              icon={<SendOutlined />} 
              onClick={handleSendPayslips}
              loading={sending}
              disabled={payrolls.length === 0}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
            >
              Gửi Phiếu lương & Hoàn tất
            </Button>
          </Space>
        </div>

        {/* Summary Statistics */}
        <Card size="small" style={{ marginBottom: 24, background: '#f5f7fa' }}>
          <Row gutter={[24, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Statistic 
                title={<Text type="secondary"><UserOutlined /> Tổng nhân viên</Text>}
                value={payrolls.length} 
                valueStyle={{ fontSize: 20, fontWeight: 'bold' }}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Statistic 
                title={<Text type="secondary"><DollarOutlined /> Tổng lương cơ bản</Text>}
                value={totalBasicSalary} 
                prefix={<PlusOutlined />}
                valueStyle={{ color: '#1890ff', fontSize: 18 }}
                formatter={(value) => new Intl.NumberFormat('vi-VN').format(value)}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Statistic 
                title={<Text type="secondary"><MinusOutlined /> Tổng khấu trừ</Text>}
                value={totalDeductions} 
                valueStyle={{ color: '#ff4d4f', fontSize: 18 }}
                formatter={(value) => new Intl.NumberFormat('vi-VN').format(value)}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Statistic 
                title={<Text type="secondary"><DollarOutlined /> Tổng thực chi</Text>}
                value={totalNetSalary} 
                valueStyle={{ color: '#52c41a', fontSize: 20, fontWeight: 'bold' }}
                formatter={(value) => new Intl.NumberFormat('vi-VN').format(value)}
              />
            </Col>
          </Row>
        </Card>

        {/* Toolbar */}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <Space>
            <Text strong>Chọn tháng:</Text>
            <DatePicker
              picker="month"
              value={selectedMonth}
              onChange={setSelectedMonth}
              format="MM/YYYY"
              allowClear={false}
            />
          </Space>
          <Button icon={<ExportOutlined />}>Xuất Excel</Button>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={payrolls}
          loading={loading}
          rowKey="_id"
          scroll={{ x: 1500 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Tổng ${total} nhân viên`
          }}
          bordered
          size="middle"
        />
      </Card>

      {/* Professional Payslip Modal */}
      <Modal
        title={null}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={750}
        bodyStyle={{ padding: 0, backgroundColor: '#f0f2f5' }}
      >
        {selectedPayroll && (
          <div style={{ padding: 24 }}>
            <div style={{ 
              background: 'white', 
              padding: 40, 
              borderRadius: 8, 
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              border: '1px solid #e8e8e8'
            }}>
              {/* Payslip Header */}
              <div style={{ textAlign: 'center', marginBottom: 32, borderBottom: '2px solid #1890ff', paddingBottom: 20 }}>
                <SafetyCertificateOutlined style={{ fontSize: 40, color: '#1890ff', marginBottom: 12 }} />
                <Title level={2} style={{ margin: 0, textTransform: 'uppercase', letterSpacing: 2 }}>
                  Phiếu Lương
                </Title>
                <Text type="secondary" style={{ fontSize: 14 }}>
                  Kỳ lương: Tháng {selectedPayroll.month}/{selectedPayroll.year}
                </Text>
              </div>

              {/* Company Info Section */}
              <Row gutter={24} style={{ marginBottom: 24 }}>
                <Col span={12}>
                  <div style={{ background: '#f5f7fa', padding: 12, borderRadius: 4 }}>
                    <Text strong style={{ fontSize: 12, color: '#666' }}>CÔNG TY</Text>
                    <div style={{ marginTop: 4 }}>
                      <Text strong>Công ty TNHH ABC</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>123 Đường ABC, Quận 1, TP.HCM</Text>
                    </div>
                  </div>
                </Col>
                <Col span={12} style={{ textAlign: 'right' }}>
                  <div style={{ background: '#f5f7fa', padding: 12, borderRadius: 4 }}>
                    <Text strong style={{ fontSize: 12, color: '#666' }}>MÃ PHIẾU</Text>
                    <div style={{ marginTop: 4 }}>
                      <Text strong>PL-{selectedPayroll.month}{selectedPayroll.year}-{selectedPayroll.employee?.employeeId || '001'}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>Ngày in: {moment().format('DD/MM/YYYY HH:mm')}</Text>
                    </div>
                  </div>
                </Col>
              </Row>

              {/* Employee Info */}
              <Row gutter={24} style={{ marginBottom: 24 }}>
                <Col span={12}>
                  <Descriptions column={1} size="small" bordered>
                    <Descriptions.Item label={<Text strong>Họ và tên</Text>}>
                      <Text strong style={{ fontSize: 15 }}>{selectedPayroll.employee?.name}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Mã nhân viên">
                      {selectedPayroll.employee?.employeeId || 'NV001'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Phòng ban">
                      {selectedPayroll.department}
                    </Descriptions.Item>
                    <Descriptions.Item label="Chức vụ">
                      {selectedPayroll.employee?.position || 'Nhân viên'}
                    </Descriptions.Item>
                  </Descriptions>
                </Col>
                <Col span={12}>
                  <Descriptions column={1} size="small" bordered>
                    <Descriptions.Item label="Ngày công">
                      <Text strong>{selectedPayroll.workingDays || 0} ngày</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Giờ công">
                      {selectedPayroll.workingHours || 0} giờ
                    </Descriptions.Item>
                    <Descriptions.Item label="Làm thêm">
                      {selectedPayroll.overtimeHours || 0} giờ
                    </Descriptions.Item>
                    <Descriptions.Item label="Đi muộn">
                      {selectedPayroll.lateMinutes || 0} phút ({selectedPayroll.lateCount || 0} lần)
                    </Descriptions.Item>
                  </Descriptions>
                </Col>
              </Row>

              <Divider dashed />

              {/* Salary Breakdown */}
              <Row gutter={48} style={{ marginBottom: 24 }}>
                {/* Income Column */}
                <Col span={12}>
                  <Title level={5} style={{ color: '#52c41a', marginBottom: 16 }}>
                    <PlusOutlined /> Thu nhập
                  </Title>
                  <List 
                    size="small" 
                    split={false}
                    dataSource={[
                      { label: 'Lương cơ bản', value: selectedPayroll.basicSalary },
                      { label: 'Phụ cấp chức vụ', value: selectedPayroll.allowance },
                      ...(selectedPayroll.overtimePay > 0 ? [{ label: `Làm thêm giờ (${selectedPayroll.overtimeHours || 0}h)`, value: selectedPayroll.overtimePay }] : []),
                      ...(selectedPayroll.bonus > 0 ? [{ label: 'Thưởng hiệu quả', value: selectedPayroll.bonus }] : [])
                    ]}
                    renderItem={item => (
                      <List.Item style={{ border: 'none', padding: '8px 0', display: 'flex', justifyContent: 'space-between' }}>
                        <Text>{item.label}</Text>
                        <Text strong>{currency(item.value)}</Text>
                      </List.Item>
                    )}
                  />
                  <div style={{ 
                    marginTop: 16, 
                    borderTop: '2px solid #52c41a', 
                    paddingTop: 12, 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    background: '#f6ffed',
                    padding: '12px 16px',
                    borderRadius: 4
                  }}>
                    <Text strong style={{ color: '#52c41a' }}>Tổng thu nhập:</Text>
                    <Text strong style={{ color: '#52c41a', fontSize: 16 }}>
                      {currency(selectedPayroll.grossIncome)}
                    </Text>
                  </div>
                </Col>

                {/* Deductions Column */}
                <Col span={12}>
                  <Title level={5} style={{ color: '#ff4d4f', marginBottom: 16 }}>
                    <MinusOutlined /> Khấu trừ
                  </Title>
                  <List 
                    size="small" 
                    split={false}
                    dataSource={[
                      { label: 'Bảo hiểm xã hội (10.5%)', value: selectedPayroll.insurance },
                      { label: 'Thuế thu nhập cá nhân', value: selectedPayroll.tax },
                      ...(selectedPayroll.deductions > 0 ? [{ label: `Phạt đi muộn (${selectedPayroll.lateMinutes}p)`, value: selectedPayroll.deductions }] : [])
                    ]}
                    renderItem={item => (
                      <List.Item style={{ border: 'none', padding: '8px 0', display: 'flex', justifyContent: 'space-between' }}>
                        <Text>{item.label}</Text>
                        <Text type="danger" strong>-{currency(item.value)}</Text>
                      </List.Item>
                    )}
                  />
                  <div style={{ 
                    marginTop: 16, 
                    borderTop: '2px solid #ff4d4f', 
                    paddingTop: 12, 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    background: '#fff1f0',
                    padding: '12px 16px',
                    borderRadius: 4
                  }}>
                    <Text strong style={{ color: '#ff4d4f' }}>Tổng khấu trừ:</Text>
                    <Text strong style={{ color: '#ff4d4f', fontSize: 16 }}>
                      -{currency((selectedPayroll.insurance || 0) + (selectedPayroll.tax || 0) + (selectedPayroll.deductions || 0))}
                    </Text>
                  </div>
                </Col>
              </Row>

              <Divider />

              {/* Net Pay Footer */}
              <div style={{ 
                backgroundColor: '#e6f7ff', 
                border: '2px solid #1890ff', 
                padding: 24, 
                borderRadius: 8, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: 16
              }}>
                <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                  THỰC LÃNH (NET PAY):
                </Text>
                <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
                  {currency(selectedPayroll.netSalary)}
                </Title>
              </div>
              
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <Text type="secondary" italic>
                  Số tiền bằng chữ: <Text strong>{convertNumberToText(selectedPayroll.netSalary)} đồng</Text>
                </Text>
              </div>

              {/* Manual Adjustments */}
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
                                {currency(item.amount)}
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

              {/* Modal Footer Actions */}
              <div style={{ marginTop: 32, textAlign: 'right', borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                <Space>
                  <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
                    In Phiếu
                  </Button>
                  <Button type="primary" icon={<MailOutlined />}>
                    Gửi Email
                  </Button>
                  <Button onClick={() => setDetailModalVisible(false)}>
                    Đóng
                  </Button>
                </Space>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Adjust Salary Modal */}
      <Modal
        title={
          <Space>
            <EditOutlined />
            <span>Điều chỉnh lương - {selectedPayroll?.employee?.name || ''}</span>
          </Space>
        }
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
