// import React, { useState, useEffect, useRef } from 'react';
// import { Row, Col, Card, List, Avatar, Badge, Input, Typography, Spin, Empty, message } from 'antd';
// import { UserOutlined, SearchOutlined } from '@ant-design/icons';
// import InternalChat from '../../components/InternalChat';
// import axios from 'axios';
// import { getAPIUrl } from '../../utils/configManager';
// import { useAuth } from '../../contexts/AuthContext';
// import { useSocket } from '../../hooks/useSocket';

// const { Title, Text } = Typography;

// const InternalChatPage = () => {
//   const { user } = useAuth();
//   const { socket, connected } = useSocket();
//   const [users, setUsers] = useState([]);
//   const [conversations, setConversations] = useState([]);
//   const [selectedUserId, setSelectedUserId] = useState(null);
//   const [selectedUserName, setSelectedUserName] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [searchTerm, setSearchTerm] = useState('');
//   const lastUnreadCountsRef = useRef({}); // Lưu unread count của từng conversation

//   useEffect(() => {
//     loadUsers();
//     loadConversations();
//   }, []);

//   // ✅ Listen for new messages via socket to refresh conversations
//   useEffect(() => {
//     if (!socket || !connected || !user) return;

//     const currentUserId = user._id || user.id;

//     const handleNewMessage = (msg) => {
//       // Kiểm tra tin nhắn có gửi tới mình không
//       const receiverId = msg.receiver?._id || msg.receiver;
//       const senderId = msg.sender?._id || msg.sender;
      
//       // ✅ Refresh conversations khi nhận tin nhắn mới (không phải tin nhắn mình gửi)
//       if (receiverId === currentUserId && senderId !== currentUserId) {
//         loadConversations(true);
//       }
//     };

//     socket.on('new_message', handleNewMessage);

//     return () => {
//       socket.off('new_message', handleNewMessage);
//     };
//   }, [socket, connected, user]);

//   // ✅ Polling để check tin nhắn mới và hiển thị thông báo (giống mobile)
//   useEffect(() => {
//     if (!user) return;

//     const currentUserId = user._id || user.id;

//     const checkNewMessages = async () => {
//       try {
//         const API_URL = getAPIUrl();
//         const token = localStorage.getItem('token');
//         const response = await axios.get(`${API_URL}/internal-chat/conversations`, {
//           headers: { Authorization: `Bearer ${token}` }
//         });

//         if (response.data.success) {
//           const newConversations = response.data.data || [];
          
//           // ✅ So sánh với unread count cũ để phát hiện tin nhắn mới
//           newConversations.forEach(conv => {
//             const userId = conv.userId?.toString() || String(conv.userId);
//             const lastCount = lastUnreadCountsRef.current[userId] || 0;
//             const currentCount = conv.unreadCount || 0;

//             // ✅ Nếu có tin nhắn mới (unread count tăng) và không đang ở trang chat hoặc không phải conversation đang chọn
//             if (currentCount > lastCount && lastCount >= 0 && selectedUserId?.toString() !== userId) {
//               const senderName = conv.username || conv.email || 'Ai đó';
//               message.info({
//                 content: `💬 Tin nhắn mới từ ${senderName}`,
//                 duration: 5,
//                 onClick: () => {
//                   setSelectedUserId(conv.userId);
//                   setSelectedUserName(senderName);
//                 }
//               });
//             }

//             // Cập nhật last count
//             lastUnreadCountsRef.current[userId] = currentCount;
//           });

//           setConversations(newConversations);
//         }
//       } catch (error) {
//         console.error('Error checking new messages:', error);
//       }
//     };

//     // Poll mỗi 3 giây để check tin nhắn mới
//     const interval = setInterval(checkNewMessages, 3000);
    
//     // Check ngay lập tức
//     checkNewMessages();

//     return () => clearInterval(interval);
//   }, [user, selectedUserId]);

//   // ✅ Refresh conversations when selected user changes (để cập nhật badge khi chuyển conversation)
//   useEffect(() => {
//     if (selectedUserId) {
//       // Refresh conversations ngay lập tức và sau một chút để đảm bảo mark as read đã hoàn thành
//       loadConversations();
//       const timer = setTimeout(() => {
//         loadConversations();
//       }, 500);
//       return () => clearTimeout(timer);
//     }
//   }, [selectedUserId]);

//   const loadUsers = async () => {
//     try {
//       const API_URL = getAPIUrl();
//       const token = localStorage.getItem('token');
//       const currentUserId = user?._id || user?.id;
//       const currentUserRole = user?.role;
//       const allowedRoles = getAllowedRolesForChat(currentUserRole);
      
//       // Get employees with user accounts
//       const employeesResponse = await axios.get(`${API_URL}/employees`, {
//         headers: { Authorization: `Bearer ${token}` }
//       });
      
//       let allUsers = [];
      
//       if (employeesResponse.data.success) {
//         const employees = employeesResponse.data.data || [];
//         // Filter employees with user accounts and allowed roles
//         const employeeUsers = employees
//           .filter(emp => {
//             if (!emp.user || !emp.user._id) return false;
//             if (emp.user._id.toString() === currentUserId?.toString()) return false;
//             return allowedRoles.includes(emp.user.role);
//           })
//           .map(emp => ({
//             _id: emp.user._id,
//             name: emp.name,
//             employeeId: emp.employeeId,
//             department: emp.department,
//             role: emp.user.role,
//             email: emp.user.email || emp.email,
//             user: emp.user
//           }));
        
//         allUsers = [...allUsers, ...employeeUsers];
//       }
      
//       // Get admin and accountant users (they don't have employee records)
//       if (allowedRoles.includes('manager') || allowedRoles.includes('accountant')) {
//         try {
//           // Query users directly - we'll need to create an endpoint or use a workaround
//           // For now, we'll get them from employees API if available
//           // In a real scenario, you'd create a /api/users endpoint
//         } catch (err) {
//           console.log('Could not fetch admin/accountant users:', err);
//         }
//       }
      
//       setUsers(allUsers);
//     } catch (error) {
//       console.error('Error loading users:', error);
//       message.error('Không thể tải danh sách người dùng');
//     }
//   };

//   // Get allowed roles for chat based on current user role
//   const getAllowedRolesForChat = (currentRole) => {
//     switch (currentRole) {
//       case 'manager': // Admin chỉ chat với nhân viên
//         return ['employee'];
//       case 'employee': // Nhân viên chat với admin và kế toán
//         return ['manager', 'accountant'];
//       case 'accountant': // Kế toán chat với admin và nhân viên
//         return ['manager', 'employee'];
//       default:
//         return [];
//     }
//   };

//   const loadConversations = async (silent = false) => {
//     if (!silent) {
//       setLoading(true);
//     }
//     try {
//       const API_URL = getAPIUrl();
//       const token = localStorage.getItem('token');
//       const response = await axios.get(`${API_URL}/internal-chat/conversations`, {
//         headers: { Authorization: `Bearer ${token}` }
//       });
      
//       if (response.data.success) {
//         setConversations(response.data.data || []);
//       }
//     } catch (error) {
//       console.error('Error loading conversations:', error);
//     } finally {
//       if (!silent) {
//         setLoading(false);
//       }
//     }
//   };

//   const handleSelectUser = async (userId, userName) => {
//     setSelectedUserId(userId);
//     setSelectedUserName(userName);
    
//     // ✅ Mark as read ngay khi click vào conversation (giống mobile)
//     try {
//       const API_URL = getAPIUrl();
//       const token = localStorage.getItem('token');
//       const currentUserId = user?._id || user?.id;
      
//       // Load messages để tìm unread messages
//       const response = await axios.get(`${API_URL}/internal-chat/messages/${userId}`, {
//         headers: { Authorization: `Bearer ${token}` }
//       });
      
//       if (response.data.success) {
//         const messages = response.data.data || [];
//         const unreadIds = messages
//           .filter(msg => {
//             const receiverId = msg.receiver?._id || msg.receiver;
//             return !msg.read && receiverId === currentUserId;
//           })
//           .map(msg => msg._id);
        
//         if (unreadIds.length > 0) {
//           // Mark as read ngay lập tức
//           await axios.put(`${API_URL}/internal-chat/messages/mark-read`, 
//             { messageIds: unreadIds },
//             { headers: { Authorization: `Bearer ${token}` } }
//           );
//           // Refresh conversations ngay để badge biến mất
//           await loadConversations(true);
//         }
//       }
//     } catch (error) {
//       console.error('Error marking messages as read:', error);
//     }
//   };

//   const filteredUsers = users.filter(user => {
//     const name = user.name || '';
//     const employeeId = user.employeeId || '';
//     const search = searchTerm.toLowerCase();
//     return name.toLowerCase().includes(search) || 
//            employeeId.toLowerCase().includes(search);
//   });

//   const currentUserId = user?._id || user?.id;

//   return (
//     <div style={{ padding: '16px', height: 'calc(100vh - 64px)' }}>
//       <Title level={3} style={{ marginBottom: '16px' }}>Chat nội bộ</Title>
      
//       <Row gutter={16} style={{ height: 'calc(100vh - 120px)' }}>
//         {/* Left sidebar - User list */}
//         <Col span={8}>
//           <Card 
//             title="Danh sách người dùng" 
//             style={{ height: '100%' }}
//             bodyStyle={{ padding: 0, height: 'calc(100% - 57px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
//           >
//             <div style={{ padding: '12px', borderBottom: '1px solid #f0f0f0' }}>
//               <Input
//                 placeholder="Tìm kiếm..."
//                 prefix={<SearchOutlined />}
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 allowClear
//               />
//             </div>
            
//             <div style={{ flex: 1, overflowY: 'auto' }}>
//               <Spin spinning={loading}>
//                 {filteredUsers.length === 0 ? (
//                   <Empty description="Không có người dùng nào" style={{ marginTop: '50px' }} />
//                 ) : (
//                   <List
//                     dataSource={filteredUsers}
//                     renderItem={(item) => {
//                       const itemUserId = item._id || item.user?._id;
//                       // ✅ Normalize IDs để so sánh đúng (có thể là string hoặc ObjectId)
//                       const conversation = conversations.find(c => {
//                         const convUserId = c.userId?.toString ? c.userId.toString() : String(c.userId);
//                         const itemId = itemUserId?.toString ? itemUserId.toString() : String(itemUserId);
//                         return convUserId === itemId;
//                       });
//                       const unreadCount = conversation?.unreadCount || 0;
                      
//                       return (
//                         <List.Item
//                           style={{
//                             cursor: 'pointer',
//                             backgroundColor: selectedUserId === itemUserId ? '#e6f7ff' : 'transparent',
//                             padding: '12px 16px'
//                           }}
//                           onClick={() => handleSelectUser(itemUserId, item.name)}
//                         >
//                           <List.Item.Meta
//                             avatar={
//                               unreadCount > 0 ? (
//                                 <Badge 
//                                   count={unreadCount > 9 ? '9+' : unreadCount}
//                                   offset={[-5, 5]}
//                                   style={{ 
//                                     backgroundColor: '#ff4d4f' 
//                                   }}
//                                 >
//                                   <Avatar icon={<UserOutlined />} />
//                                 </Badge>
//                               ) : (
//                                 <Avatar icon={<UserOutlined />} />
//                               )
//                             }
//                             title={
//                               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//                                 <Text strong style={{ color: unreadCount > 0 ? '#1890ff' : 'inherit' }}>
//                                   {item.name}
//                                 </Text>
//                                 {conversation?.lastMessageTime && (
//                                   <Text type="secondary" style={{ fontSize: '12px' }}>
//                                     {new Date(conversation.lastMessageTime).toLocaleTimeString('vi-VN', { 
//                                       hour: '2-digit', 
//                                       minute: '2-digit' 
//                                     })}
//                                   </Text>
//                                 )}
//                               </div>
//                             }
//                             description={
//                               <div>
//                                 <Text type="secondary" style={{ fontSize: '12px' }}>
//                                   {item.employeeId} • {item.department || 'N/A'}
//                                 </Text>
//                                 {conversation?.lastMessage && (
//                                   <div style={{ marginTop: '4px' }}>
//                                     <Text 
//                                       ellipsis 
//                                       style={{ 
//                                         fontSize: '12px',
//                                         fontWeight: unreadCount > 0 ? 'bold' : 'normal',
//                                         color: unreadCount > 0 ? '#1890ff' : 'inherit'
//                                       }}
//                                     >
//                                       {conversation.lastMessage.content}
//                                     </Text>
//                                   </div>
//                                 )}
//                               </div>
//                             }
//                           />
//                         </List.Item>
//                       );
//                     }}
//                   />
//                 )}
//               </Spin>
//             </div>
//           </Card>
//         </Col>

//         {/* Right side - Chat window */}
//         <Col span={16}>
//           <InternalChat
//             receiverId={selectedUserId}
//             receiverName={selectedUserName}
//             currentUserId={currentUserId}
//             onConversationRead={() => loadConversations(true)}
//           />
//         </Col>
//       </Row>
//     </div>
//   );
// };

// export default InternalChatPage;

import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Card, List, Avatar, Badge, Input, Typography, Spin, Empty, message } from 'antd';
import { UserOutlined, SearchOutlined } from '@ant-design/icons';
import InternalChat from '../../components/InternalChat';
import axios from 'axios';
import { getAPIUrl } from '../../utils/configManager';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../hooks/useSocket';

const { Title, Text } = Typography;

const InternalChatPage = () => {
  const { user } = useAuth();
  const { socket, connected } = useSocket();

  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);

  // ✅ lưu selectedUserId dạng string để so sánh chắc chắn
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const lastUnreadCountsRef = useRef({});

  // ✅ helper normalize id (ObjectId / string)
  const normalizeId = (val) => {
    if (!val) return '';
    if (typeof val === 'object') return normalizeId(val._id || val.id);
    return String(val);
  };
  

  useEffect(() => {
    loadUsers();
    loadConversations();
  }, []);

  // ✅ Listen for new messages via socket to refresh conversations
  useEffect(() => {
    if (!socket || !connected || !user) return;

    const currentUserId = normalizeId(user._id || user.id);

    const handleNewMessage = (msg) => {
      const receiverId = normalizeId(msg.receiver?._id || msg.receiver);
      const senderId = normalizeId(msg.sender?._id || msg.sender);

      if (receiverId === currentUserId && senderId !== currentUserId) {
        loadConversations(true);
      }
    };

    socket.on('new_message', handleNewMessage);
    return () => socket.off('new_message', handleNewMessage);
  }, [socket, connected, user]);

  // ✅ Polling để refresh conversations
  useEffect(() => {
    if (!user) return;

    const checkNewMessages = async () => {
      try {
        const API_URL = getAPIUrl();
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/internal-chat/conversations`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
          const newConversations = response.data.data || [];

          newConversations.forEach(conv => {
            const uid = normalizeId(conv.userId);
            lastUnreadCountsRef.current[uid] = conv.unreadCount || 0;
          });

          setConversations(newConversations);
        }
      } catch (error) {
        console.error('Error checking new messages:', error);
      }
    };

    const interval = setInterval(checkNewMessages, 3000);
    checkNewMessages();

    return () => clearInterval(interval);
  }, [user, selectedUserId]);

  // ✅ Refresh conversations when selected user changes
  useEffect(() => {
    if (selectedUserId) {
      loadConversations();
      const timer = setTimeout(() => loadConversations(), 500);
      return () => clearTimeout(timer);
    }
  }, [selectedUserId]);

  const loadUsers = async () => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      const currentUserId = normalizeId(user?._id || user?.id);
      const currentUserRole = user?.role;
      const allowedRoles = getAllowedRolesForChat(currentUserRole);

      const employeesResponse = await axios.get(`${API_URL}/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      let allUsers = [];

      if (employeesResponse.data.success) {
        const employees = employeesResponse.data.data || [];
        const employeeUsers = employees
          .filter(emp => {
            if (!emp.user || !emp.user._id) return false;
            if (normalizeId(emp.user._id) === currentUserId) return false;
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

      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      message.error('Không thể tải danh sách người dùng');
    }
  };

  const getAllowedRolesForChat = (currentRole) => {
    switch (currentRole) {
      case 'manager':
        return ['employee'];
      case 'employee':
        return ['manager', 'accountant'];
      case 'accountant':
        return ['manager', 'employee'];
      default:
        return [];
    }
  };

  const loadConversations = async (silent = false) => {
    if (!silent) setLoading(true);
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
      if (!silent) setLoading(false);
    }
  };

  // ✅ CLICK user => badge mất ngay + mark read server
  const handleSelectUser = async (userId, userName) => {
    const receiverId = normalizeId(userId);
  
    setSelectedUserId(receiverId);
    setSelectedUserName(userName);
  
    // ✅ tắt badge ngay lập tức
    setConversations(prev =>
      prev.map(c => normalizeId(c.userId) === receiverId ? { ...c, unreadCount: 0 } : c)
    );
    lastUnreadCountsRef.current[receiverId] = 0;
  
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
  
      await axios.put(
        `${API_URL}/internal-chat/conversations/${receiverId}/mark-read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
  
      // ✅ đồng bộ lại conversations (nếu cần)
      await loadConversations(true);
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      loadConversations(true);
    }
  };
  

  const filteredUsers = users.filter(u => {
    const name = (u.name || '').toLowerCase();
    const employeeId = (u.employeeId || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return name.includes(search) || employeeId.includes(search);
  });

  const currentUserId = normalizeId(user?._id || user?.id);

  return (
    <div style={{ padding: '16px', height: 'calc(100vh - 64px)' }}>
      <Title level={3} style={{ marginBottom: '16px' }}>Chat nội bộ</Title>

      <Row gutter={16} style={{ height: 'calc(100vh - 120px)' }}>
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

            <div className="chat-users-list" style={{ flex: 1, overflowY: 'auto' }}>
              <Spin spinning={loading}>
                {filteredUsers.length === 0 ? (
                  <Empty description="Không có người dùng nào" style={{ marginTop: '50px' }} />
                ) : (
                  <List
                    dataSource={filteredUsers}
                    renderItem={(item) => {
                      const itemUserId = normalizeId(item._id || item.user?._id);

                      const conversation = conversations.find(c => normalizeId(c.userId) === itemUserId);
                      const unreadCount = conversation?.unreadCount || 0;

                      return (
                        <List.Item
                          style={{
                            cursor: 'pointer',
                            backgroundColor: normalizeId(selectedUserId) === itemUserId ? '#e6f7ff' : 'transparent',
                            padding: '12px 16px'
                          }}
                          onClick={() => handleSelectUser(itemUserId, item.name)}
                        >
                          <List.Item.Meta
                            avatar={
                              unreadCount > 0 ? (
                                <Badge
                                  count={unreadCount > 9 ? '9+' : unreadCount}
                                  offset={[-5, 5]}
                                  style={{ backgroundColor: '#ff4d4f' }}
                                >
                                  <Avatar icon={<UserOutlined />} />
                                </Badge>
                              ) : (
                                <Avatar icon={<UserOutlined />} />
                              )
                            }
                            title={
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text strong style={{ color: unreadCount > 0 ? '#1890ff' : 'inherit' }}>
                                  {item.name}
                                </Text>
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
                                        fontWeight: unreadCount > 0 ? 'bold' : 'normal',
                                        color: unreadCount > 0 ? '#1890ff' : 'inherit'
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

        <Col span={16}>
          <InternalChat
            receiverId={selectedUserId}
            receiverName={selectedUserName}
            currentUserId={currentUserId}
            onConversationRead={() => loadConversations(true)}
          />
        </Col>
      </Row>
    </div>
  );
};

export default InternalChatPage;
