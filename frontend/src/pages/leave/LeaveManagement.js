import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Modal, 
  Form, 
  DatePicker, 
  Input, 
  Select, 
  message, 
  Card,
  Typography,
  Tag
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Option } = Select;

const LeaveManagement = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLeave, setEditingLeave] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      // Mock data for demo
      const mockLeaves = [
        {
          _id: '1',
          employee: { name: 'Nguyễn Văn A' },
          startDate: '2024-01-20',
          endDate: '2024-01-22',
          reason: 'Nghỉ phép cá nhân',
          status: 'pending'
        },
        {
          _id: '2',
          employee: { name: 'Trần Thị B' },
          startDate: '2024-01-25',
          endDate: '2024-01-25',
          reason: 'Khám bệnh',
          status: 'approved'
        },
        {
          _id: '3',
          employee: { name: 'Lê Văn C' },
          startDate: '2024-01-30',
          endDate: '2024-02-02',
          reason: 'Nghỉ lễ Tết',
          status: 'rejected'
        }
      ];
      setLeaves(mockLeaves);
    } catch (error) {
      message.error('Lỗi khi tải danh sách nghỉ phép');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingLeave(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (leave) => {
    setEditingLeave(leave);
    form.setFieldsValue({
      ...leave,
      dateRange: [moment(leave.startDate), moment(leave.endDate)]
    });
    setModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      const { dateRange, ...otherValues } = values;
      const data = {
        ...otherValues,
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD')
      };

      if (editingLeave) {
        // Mock update
        message.success('Cập nhật yêu cầu nghỉ phép thành công');
      } else {
        // Mock add
        const newLeave = {
          _id: Date.now().toString(),
          ...data,
          employee: { name: 'Nguyễn Văn Demo' },
          status: 'pending'
        };
        setLeaves(prev => [...prev, newLeave]);
        message.success('Gửi yêu cầu nghỉ phép thành công');
      }
      setModalVisible(false);
    } catch (error) {
      message.error('Lỗi khi lưu yêu cầu nghỉ phép');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'approved': return 'green';
      case 'rejected': return 'red';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Chờ duyệt';
      case 'approved': return 'Đã duyệt';
      case 'rejected': return 'Từ chối';
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
      title: 'Từ ngày',
      dataIndex: 'startDate',
      key: 'startDate',
      render: (date) => moment(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Đến ngày',
      dataIndex: 'endDate',
      key: 'endDate',
      render: (date) => moment(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Số ngày',
      key: 'days',
      render: (_, record) => {
        const start = moment(record.startDate);
        const end = moment(record.endDate);
        return end.diff(start, 'days') + 1;
      },
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
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
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Sửa
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>Quản lý nghỉ phép</Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            Gửi yêu cầu nghỉ phép
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={leaves}
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
        title={editingLeave ? 'Sửa yêu cầu nghỉ phép' : 'Gửi yêu cầu nghỉ phép'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="dateRange"
            label="Thời gian nghỉ"
            rules={[{ required: true, message: 'Vui lòng chọn thời gian nghỉ' }]}
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="reason"
            label="Lý do nghỉ"
            rules={[{ required: true, message: 'Vui lòng nhập lý do nghỉ' }]}
          >
            <TextArea rows={4} placeholder="Nhập lý do nghỉ phép..." />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit">
                {editingLeave ? 'Cập nhật' : 'Gửi yêu cầu'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LeaveManagement;