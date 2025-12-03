import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Modal, 
  Form, 
  Input, 
  Select, 
  Typography,
  Card,
  Tag,
  Row,
  Col,
  Statistic,
  App,
  Tooltip,
  Descriptions,
  Empty
} from 'antd';
import { 
  DeleteOutlined, 
  UserDeleteOutlined,
  SearchOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  CalendarOutlined,
  DollarOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { TableActionDropdown } from '../../components/ActionDropdown';
import axios from 'axios';
import { getAPIUrl } from '../../utils/configManager';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const ResignationManagement = () => {
  const { message } = App.useApp();
  const [terminatedEmployees, setTerminatedEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterReason, setFilterReason] = useState('');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    fetchTerminatedEmployees();
  }, []);

  const fetchTerminatedEmployees = async () => {
    setLoading(true);
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_URL}/terminated-employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setTerminatedEmployees(response.data.data || []);
      } else {
        message.error(response.data.message || 'Lỗi khi tải danh sách nhân viên nghỉ việc');
      }
    } catch (error) {
      console.error('Error fetching terminated employees:', error);
      if (error.response?.status === 401) {
        message.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
      } else {
        message.error('Lỗi kết nối đến server');
      }
      setTerminatedEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (employee) => {
    setSelectedEmployee(employee);
    setDetailModalVisible(true);
  };

  const handleDeletePermanently = async (id) => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      
      const response = await axios.delete(`${API_URL}/terminated-employees/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        message.success('Đã xóa vĩnh viễn thông tin nhân viên');
        fetchTerminatedEmployees();
      } else {
        message.error(response.data.message || 'Lỗi khi xóa thông tin');
      }
    } catch (error) {
      console.error('Error deleting terminated employee:', error);
      message.error('Lỗi khi xóa thông tin nhân viên');
    }
  };

  const getReasonLabel = (reason) => {
    const reasons = {
      resigned: 'Tự nghỉ',
      terminated: 'Sa thải',
      contract_ended: 'Hết hợp đồng',
      retirement: 'Nghỉ hưu',
      other: 'Lý do khác'
    };
    return reasons[reason] || reason;
  };

  const getReasonColor = (reason) => {
    const colors = {
      resigned: 'blue',
      terminated: 'red',
      contract_ended: 'orange',
      retirement: 'green',
      other: 'default'
    };
    return colors[reason] || 'default';
  };

  const columns = [
    {
      title: 'Mã NV',
      dataIndex: 'employeeId',
      key: 'employeeId',
      width: 100,
    },
    {
      title: 'Tên',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Phòng ban',
      dataIndex: 'department',
      key: 'department',
      width: 100,
    },
    {
      title: 'Chức vụ',
      dataIndex: 'position',
      key: 'position',
      width: 120,
      ellipsis: true,
    },
    {
      title: 'Ngày nghỉ',
      dataIndex: 'terminationDate',
      key: 'terminationDate',
      width: 120,
      render: (date) => date ? moment(date).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Lý do',
      dataIndex: 'terminationReason',
      key: 'terminationReason',
      width: 130,
      render: (reason) => (
        <Tag color={getReasonColor(reason)}>
          {getReasonLabel(reason)}
        </Tag>
      ),
    },
    {
      title: 'Tổng ngày công',
      dataIndex: 'totalWorkingDays',
      key: 'totalWorkingDays',
      width: 120,
      render: (days) => (
        <Tooltip title="Số ngày công thực tế">
          <span>{days || 0} ngày</span>
        </Tooltip>
      ),
    },
    {
      title: 'ID Vân tay',
      dataIndex: 'fingerprintId',
      key: 'fingerprintId',
      width: 100,
      render: (id) => id ? (
        <Tag color="red">#{id} (Vô hiệu)</Tag>
      ) : '-',
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 80,
      fixed: 'right',
      align: 'center',
      render: (_, record) => {
        const actionItems = [
          { 
            key: 'view', 
            label: 'Xem chi tiết', 
            icon: <EyeOutlined />,
            onClick: () => handleViewDetail(record)
          },
          { type: 'divider' },
          { 
            key: 'delete', 
            label: 'Xóa vĩnh viễn', 
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => {
              Modal.confirm({
                title: 'Xác nhận xóa vĩnh viễn',
                content: (
                  <div>
                    <p>Bạn có chắc muốn xóa vĩnh viễn thông tin của nhân viên <strong>"{record.name}"</strong>?</p>
                    <p style={{ color: '#ff4d4f' }}>
                      <InfoCircleOutlined /> Hành động này không thể hoàn tác!
                    </p>
                  </div>
                ),
                okText: 'Xóa vĩnh viễn',
                okButtonProps: { danger: true },
                cancelText: 'Hủy',
                onOk: () => handleDeletePermanently(record._id)
              });
            }
          }
        ];
        
        return <TableActionDropdown items={actionItems} />;
      },
    },
  ];

  // Filter employees
  const filteredEmployees = React.useMemo(() => {
    let result = terminatedEmployees;
    
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      result = result.filter(emp => 
        emp.name?.toLowerCase().includes(search) ||
        emp.employeeId?.toLowerCase().includes(search)
      );
    }
    
    if (filterReason) {
      result = result.filter(emp => emp.terminationReason === filterReason);
    }
    
    return result;
  }, [terminatedEmployees, searchText, filterReason]);

  // Statistics
  const stats = React.useMemo(() => {
    const total = terminatedEmployees.length;
    const resigned = terminatedEmployees.filter(e => e.terminationReason === 'resigned').length;
    const terminated = terminatedEmployees.filter(e => e.terminationReason === 'terminated').length;
    const totalWorkingDays = terminatedEmployees.reduce((sum, e) => sum + (e.totalWorkingDays || 0), 0);
    
    return { total, resigned, terminated, totalWorkingDays };
  }, [terminatedEmployees]);

  return (
    <div style={{ width: '100%', overflow: 'hidden' }}>
      <Card style={{ width: '100%', overflow: 'hidden' }} bodyStyle={{ padding: '12px' }}>
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <Title level={3} style={{ margin: 0 }}>
            <UserDeleteOutlined style={{ marginRight: 8 }} />
            Quản lý nghỉ việc
          </Title>
          <Space size="middle" wrap>
            <Input
              placeholder="Tìm theo tên hoặc mã NV"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              style={{ width: 220 }}
            />
            <Select
              placeholder="Lọc theo lý do"
              value={filterReason || undefined}
              onChange={setFilterReason}
              allowClear
              style={{ width: 160 }}
            >
              <Option value="resigned">Tự nghỉ</Option>
              <Option value="terminated">Sa thải</Option>
              <Option value="contract_ended">Hết hợp đồng</Option>
              <Option value="retirement">Nghỉ hưu</Option>
              <Option value="other">Lý do khác</Option>
            </Select>
          </Space>
        </div>

        {/* Statistics */}
        <Row gutter={[8, 8]} style={{ marginBottom: 8 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="Tổng nhân viên nghỉ việc"
                value={stats.total}
                prefix={<UserDeleteOutlined />}
                valueStyle={{ color: '#8c8c8c' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="Tự nghỉ"
                value={stats.resigned}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="Sa thải"
                value={stats.terminated}
                prefix={<UserDeleteOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="Tổng ngày công"
                value={stats.totalWorkingDays}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: '#52c41a' }}
                suffix="ngày"
              />
            </Card>
          </Col>
        </Row>

        {terminatedEmployees.length === 0 && !loading ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chưa có nhân viên nào nghỉ việc"
          />
        ) : (
          <div style={{ 
            width: '100%', 
            overflowX: 'auto',
            overflowY: 'hidden',
            maxWidth: '100%'
          }}>
            <Table
              columns={columns}
              dataSource={filteredEmployees}
              loading={loading}
              rowKey="_id"
              scroll={{ 
                x: 'max-content',
                y: undefined
              }}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `Tổng ${total} nhân viên`,
              }}
              style={{ 
                width: '100%',
                minWidth: '1100px'
              }}
            />
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      <Modal
        title={
          <Space>
            <InfoCircleOutlined />
            <span>Chi tiết nhân viên nghỉ việc</span>
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedEmployee(null);
        }}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Đóng
          </Button>
        ]}
        width={700}
      >
        {selectedEmployee && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Mã nhân viên">
              {selectedEmployee.employeeId}
            </Descriptions.Item>
            <Descriptions.Item label="Họ tên">
              {selectedEmployee.name}
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              {selectedEmployee.email || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">
              {selectedEmployee.phone || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Phòng ban">
              {selectedEmployee.department || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Chức vụ">
              {selectedEmployee.position || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Loại hợp đồng">
              <Tag color={
                selectedEmployee.contractType === 'official' ? 'green' :
                selectedEmployee.contractType === 'probation' ? 'orange' : 'blue'
              }>
                {selectedEmployee.contractType === 'official' ? 'Chính thức' :
                 selectedEmployee.contractType === 'probation' ? 'Thử việc' : 'Thực tập'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Lương cơ bản">
              {selectedEmployee.baseSalary ? 
                new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedEmployee.baseSalary) : 
                '-'
              }
            </Descriptions.Item>
            <Descriptions.Item label="Ngày vào làm">
              {selectedEmployee.joinDate ? moment(selectedEmployee.joinDate).format('DD/MM/YYYY') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày nghỉ việc">
              <Text type="danger">
                {selectedEmployee.terminationDate ? moment(selectedEmployee.terminationDate).format('DD/MM/YYYY') : '-'}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Tổng ngày công">
              <Tag color="green">{selectedEmployee.totalWorkingDays || 0} ngày</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Lý do nghỉ">
              <Tag color={getReasonColor(selectedEmployee.terminationReason)}>
                {getReasonLabel(selectedEmployee.terminationReason)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="ID Vân tay" span={2}>
              {selectedEmployee.fingerprintId ? (
                <Space>
                  <Tag color="red">#{selectedEmployee.fingerprintId}</Tag>
                  <Text type="secondary">(Đã vô hiệu hóa)</Text>
                </Space>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Ghi chú" span={2}>
              {selectedEmployee.terminationNote || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Người xử lý">
              {selectedEmployee.terminatedBy || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Thời gian xử lý">
              {selectedEmployee.createdAt ? moment(selectedEmployee.createdAt).format('DD/MM/YYYY HH:mm') : '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default ResignationManagement;

