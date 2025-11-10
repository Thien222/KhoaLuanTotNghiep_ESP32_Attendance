import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Space,
  message,
  Popconfirm,
  Tag,
  Typography
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { getAPIUrl } from '../../utils/configManager';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const HolidaySettings = () => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');

      const response = await axios.get(`${API_URL}/holidays`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setHolidays(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching holidays:', error);
      message.error('Lỗi khi tải danh sách ngày lễ');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingHoliday(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (holiday) => {
    setEditingHoliday(holiday);
    form.setFieldsValue({
      ...holiday,
      date: moment(holiday.date)
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');

      const response = await axios.delete(`${API_URL}/holidays/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        message.success('Xóa ngày lễ thành công');
        fetchHolidays();
      }
    } catch (error) {
      console.error('Error deleting holiday:', error);
      message.error('Lỗi khi xóa ngày lễ');
    }
  };

  const handleSubmit = async (values) => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');

      const data = {
        ...values,
        date: values.date.format('YYYY-MM-DD')
      };

      if (editingHoliday) {
        const response = await axios.put(
          `${API_URL}/holidays/${editingHoliday._id}`,
          data,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (response.data.success) {
          message.success('Cập nhật ngày lễ thành công');
          fetchHolidays();
        }
      } else {
        const response = await axios.post(
          `${API_URL}/holidays`,
          data,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (response.data.success) {
          message.success('Thêm ngày lễ thành công');
          fetchHolidays();
        }
      }

      setModalVisible(false);
    } catch (error) {
      console.error('Error saving holiday:', error);
      message.error(error.response?.data?.message || 'Lỗi khi lưu ngày lễ');
    }
  };

  const columns = [
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      render: (date) => moment(date).format('DD/MM/YYYY'),
      sorter: (a, b) => moment(a.date).unix() - moment(b.date).unix(),
      width: 120,
    },
    {
      title: 'Tên ngày lễ',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const colors = { national: 'blue', tet: 'red', custom: 'green' };
        const labels = { national: 'Quốc gia', tet: 'Tết', custom: 'Tùy chỉnh' };
        return <Tag color={colors[type]}>{labels[type] || type}</Tag>;
      },
      width: 120,
    },
    {
      title: 'Hệ số lương',
      dataIndex: 'workRate',
      key: 'workRate',
      render: (rate) => <Tag color="purple">x{rate}</Tag>,
      width: 120,
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Hành động',
      key: 'action',
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Bạn có chắc muốn xóa ngày lễ này?"
            onConfirm={() => handleDelete(record._id)}
            okText="Có"
            cancelText="Không"
          >
            <Button
              type="link"
              danger
              size="small"
              icon={<DeleteOutlined />}
            >
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
      width: 150,
    },
  ];

  return (
    <Card>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>
          <CalendarOutlined /> Quản lý ngày lễ
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          Thêm ngày lễ
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={holidays}
        loading={loading}
        rowKey="_id"
        pagination={{
          pageSize: 20,
          showTotal: (total) => `Tổng ${total} ngày lễ`
        }}
      />

      <Modal
        title={editingHoliday ? 'Sửa ngày lễ' : 'Thêm ngày lễ'}
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
            name="name"
            label="Tên ngày lễ"
            rules={[{ required: true, message: 'Vui lòng nhập tên ngày lễ' }]}
          >
            <Input placeholder="Ví dụ: Tết Nguyên Đán" />
          </Form.Item>

          <Form.Item
            name="date"
            label="Ngày"
            rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item
            name="type"
            label="Loại"
            rules={[{ required: true, message: 'Vui lòng chọn loại' }]}
            initialValue="national"
          >
            <Select>
              <Option value="national">Ngày lễ quốc gia</Option>
              <Option value="tet">Tết</Option>
              <Option value="custom">Tùy chỉnh</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="workRate"
            label="Hệ số lương (nếu làm việc)"
            rules={[{ required: true, message: 'Vui lòng nhập hệ số lương' }]}
            initialValue={2.0}
            help="Ví dụ: 2.0 = lương x2, 3.0 = lương x3"
          >
            <InputNumber
              min={1.0}
              max={5.0}
              step={0.5}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả"
          >
            <TextArea rows={3} placeholder="Mô tả về ngày lễ này..." />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit">
                {editingHoliday ? 'Cập nhật' : 'Thêm'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default HolidaySettings;


