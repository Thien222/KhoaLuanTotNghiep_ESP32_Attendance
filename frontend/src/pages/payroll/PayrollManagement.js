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
  Input
} from 'antd';
import { 
  DollarOutlined, 
  EyeOutlined,
  CalculatorOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const PayrollManagement = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(moment());
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchPayrolls();
  }, [selectedMonth]);

  const fetchPayrolls = async () => {
    setLoading(true);
    try {
      // Mock data for demo
      const mockPayrolls = [
        {
          _id: '1',
          employee: { name: 'Nguyễn Văn A' },
          month: '2024-01-01',
          basicSalary: 8000000,
          workingHours: 176,
          actualSalary: 8000000,
          status: 'calculated'
        },
        {
          _id: '2',
          employee: { name: 'Trần Thị B' },
          month: '2024-01-01',
          basicSalary: 10000000,
          workingHours: 180,
          actualSalary: 10500000,
          status: 'paid'
        },
        {
          _id: '3',
          employee: { name: 'Lê Văn C' },
          month: '2024-01-01',
          basicSalary: 7000000,
          workingHours: 160,
          actualSalary: 7000000,
          status: 'pending'
        }
      ];
      setPayrolls(mockPayrolls);
    } catch (error) {
      message.error('Lỗi khi tải dữ liệu bảng lương');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (payroll) => {
    setSelectedPayroll(payroll);
    setModalVisible(true);
  };

  const handleCalculatePayroll = async () => {
    try {
      // Mock calculate
      message.success('Tính lương thành công');
      fetchPayrolls();
    } catch (error) {
      message.error('Lỗi khi tính lương');
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

  const columns = [
    {
      title: 'Nhân viên',
      dataIndex: ['employee', 'name'],
      key: 'employeeName',
    },
    {
      title: 'Tháng',
      dataIndex: 'month',
      key: 'month',
      render: (month) => moment(month).format('MM/YYYY'),
    },
    {
      title: 'Lương cơ bản',
      dataIndex: 'basicSalary',
      key: 'basicSalary',
      render: (amount) => amount ? amount.toLocaleString('vi-VN') + ' VNĐ' : '-',
    },
    {
      title: 'Số giờ làm',
      dataIndex: 'workingHours',
      key: 'workingHours',
      render: (hours) => hours ? `${hours}h` : '-',
    },
    {
      title: 'Lương thực tế',
      dataIndex: 'actualSalary',
      key: 'actualSalary',
      render: (amount) => amount ? amount.toLocaleString('vi-VN') + ' VNĐ' : '-',
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
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="primary" 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
          >
            Xem chi tiết
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>Quản lý bảng lương</Title>
        </div>

        <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
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
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
        />
      </Card>

      <Modal
        title="Chi tiết bảng lương"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedPayroll && (
          <div>
            <p><strong>Nhân viên:</strong> {selectedPayroll.employee?.name}</p>
            <p><strong>Tháng:</strong> {moment(selectedPayroll.month).format('MM/YYYY')}</p>
            <p><strong>Lương cơ bản:</strong> {selectedPayroll.basicSalary?.toLocaleString('vi-VN')} VNĐ</p>
            <p><strong>Số giờ làm:</strong> {selectedPayroll.workingHours}h</p>
            <p><strong>Lương thực tế:</strong> {selectedPayroll.actualSalary?.toLocaleString('vi-VN')} VNĐ</p>
            <p><strong>Trạng thái:</strong> {getStatusText(selectedPayroll.status)}</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PayrollManagement;