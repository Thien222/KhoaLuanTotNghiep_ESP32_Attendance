import React, { useState, useEffect } from 'react';
import { Row, Col, Card, List, Avatar, Badge, Input, Typography, Spin, Empty, message } from 'antd';
import { UserOutlined, SearchOutlined } from '@ant-design/icons';
import InternalChat from '../../components/InternalChat';
import axios from 'axios';
import { getAPIUrl } from '../../utils/configManager';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;

const InternalChatPage = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadUsers();
    loadConversations();
  }, []);

  const loadUsers = async () => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      const currentUserId = user?._id || user?.id;
      const currentUserRole = user?.role;
      const allowedRoles = getAllowedRolesForChat(currentUserRole);
      
      // Get employees with user accounts
      const employeesResponse = await axios.get(`${API_URL}/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let allUsers = [];
      
      if (employeesResponse.data.success) {
        const employees = employeesResponse.data.data || [];
        // Filter employees with user accounts and allowed roles
        const employeeUsers = employees
          .filter(emp => {
            if (!emp.user || !emp.user._id) return false;
            if (emp.user._id.toString() === currentUserId?.toString()) return false;
            return allowedRoles.includes(emp.user.role);
          })
          .map(emp => ({
            _id: emp.user._id,
            name: emp.name,
            employeeId: emp.employeeId,
            department: emp.department,
            role: emp.user.role,
            email: emp.user.email || emp.email,
            user: emp.user
          }));
        
        allUsers = [...allUsers, ...employeeUsers];
      }
      
      // Get admin and accountant users (they don't have employee records)
      if (allowedRoles.includes('manager') || allowedRoles.includes('accountant')) {
        try {
          // Query users directly - we'll need to create an endpoint or use a workaround
          // For now, we'll get them from employees API if available
          // In a real scenario, you'd create a /api/users endpoint
        } catch (err) {
          console.log('Could not fetch admin/accountant users:', err);
        }
      }
      
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      message.error('Không thể tải danh sách người dùng');
    }
  };

  // Get allowed roles for chat based on current user role
  const getAllowedRolesForChat = (currentRole) => {
    switch (currentRole) {
      case 'manager': // Admin chỉ chat với nhân viên
        return ['employee'];
      case 'employee': // Nhân viên chat với admin và kế toán
        return ['manager', 'accountant'];
      case 'accountant': // Kế toán chat với admin và nhân viên
        return ['manager', 'employee'];
      default:
        return [];
    }
  };

  const loadConversations = async () => {
    setLoading(true);
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/internal-chat/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setConversations(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (userId, userName) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
  };

  const filteredUsers = users.filter(user => {
    const name = user.name || '';
    const employeeId = user.employeeId || '';
    const search = searchTerm.toLowerCase();
    return name.toLowerCase().includes(search) || 
           employeeId.toLowerCase().includes(search);
  });

  const currentUserId = user?._id || user?.id;

  return (
    <div style={{ padding: '16px', height: 'calc(100vh - 64px)' }}>
      <Title level={3} style={{ marginBottom: '16px' }}>Chat nội bộ</Title>
      
      <Row gutter={16} style={{ height: 'calc(100vh - 120px)' }}>
        {/* Left sidebar - User list */}
        <Col span={8}>
          <Card 
            title="Danh sách người dùng" 
            style={{ height: '100%' }}
            bodyStyle={{ padding: 0, height: 'calc(100% - 57px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ padding: '12px', borderBottom: '1px solid #f0f0f0' }}>
              <Input
                placeholder="Tìm kiếm..."
                prefix={<SearchOutlined />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                allowClear
              />
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <Spin spinning={loading}>
                {filteredUsers.length === 0 ? (
                  <Empty description="Không có người dùng nào" style={{ marginTop: '50px' }} />
                ) : (
                  <List
                    dataSource={filteredUsers}
                    renderItem={(item) => {
                      const conversation = conversations.find(c => c.userId === (item._id || item.user?._id));
                      const unreadCount = conversation?.unreadCount || 0;
                      
                      return (
                        <List.Item
                          style={{
                            cursor: 'pointer',
                            backgroundColor: selectedUserId === (item._id || item.user?._id) ? '#e6f7ff' : 'transparent',
                            padding: '12px 16px'
                          }}
                          onClick={() => handleSelectUser(item.user?._id, item.name)}
                        >
                          <List.Item.Meta
                            avatar={
                              <Badge count={unreadCount} offset={[-5, 5]}>
                                <Avatar icon={<UserOutlined />} />
                              </Badge>
                            }
                            title={
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text strong>{item.name}</Text>
                                {conversation?.lastMessageTime && (
                                  <Text type="secondary" style={{ fontSize: '12px' }}>
                                    {new Date(conversation.lastMessageTime).toLocaleTimeString('vi-VN', { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </Text>
                                )}
                              </div>
                            }
                            description={
                              <div>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                  {item.employeeId} • {item.department || 'N/A'}
                                </Text>
                                {conversation?.lastMessage && (
                                  <div style={{ marginTop: '4px' }}>
                                    <Text 
                                      ellipsis 
                                      style={{ 
                                        fontSize: '12px',
                                        fontWeight: unreadCount > 0 ? 'bold' : 'normal'
                                      }}
                                    >
                                      {conversation.lastMessage.content}
                                    </Text>
                                  </div>
                                )}
                              </div>
                            }
                          />
                        </List.Item>
                      );
                    }}
                  />
                )}
              </Spin>
            </div>
          </Card>
        </Col>

        {/* Right side - Chat window */}
        <Col span={16}>
          <InternalChat
            receiverId={selectedUserId}
            receiverName={selectedUserName}
            currentUserId={currentUserId}
          />
        </Col>
      </Row>
    </div>
  );
};

export default InternalChatPage;

