import React, { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, List, Avatar, Badge, Typography, Spin, Empty } from 'antd';
import { SendOutlined, UserOutlined } from '@ant-design/icons';
import { useSocket } from '../hooks/useSocket';
import axios from 'axios';
import { getAPIUrl } from '../utils/configManager';
import moment from 'moment';

const { Text } = Typography;

const InternalChat = ({ receiverId, receiverName, receiverAvatar, currentUserId, onConversationRead }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const { socket, connected } = useSocket();

  useEffect(() => {
    if (!receiverId) {
      setMessages([]);
      return;
    }
    
    if (!socket) return;

    // Load message history (sẽ tự động mark as read)
    loadMessages();

    // Listen for new messages
    const handleNewMessage = (message) => {
      console.log('📨 New message received:', message);
      console.log('Current receiverId:', receiverId, 'Current userId:', currentUserId);

      // ✅ Sửa logic check: message có thể có sender/receiver là object hoặc string ID
      const senderId = message.sender?._id || message.sender;
      const receiverIdFromMsg = message.receiver?._id || message.receiver;

      // Check if message is for this conversation
      const isForThisConversation =
        (senderId === receiverId && receiverIdFromMsg === currentUserId) ||
        (senderId === currentUserId && receiverIdFromMsg === receiverId);

      if (isForThisConversation) {
        console.log('✅ Message is for this conversation, adding INSTANTLY...');
        setMessages(prev => {
          // ✅ SMART DEDUPLICATION:
          // 1. Check by ID
          const existsById = prev.some(m => {
            const mId = m._id || m.id;
            const msgId = message._id || message.id;
            return mId === msgId;
          });

          if (existsById) {
            console.log('⚠️ Message with same ID already exists, skipping');
            return prev;
          }

          // 2. Check by content + sender + approximate time (for duplicates within 2 seconds)
          const existsByContent = prev.some(m => {
            const sameContent = m.content === message.content;
            const sameSender = (m.sender?._id || m.sender) === senderId;
            const timeDiff = Math.abs(
              new Date(m.createdAt).getTime() - new Date(message.createdAt).getTime()
            );
            return sameContent && sameSender && timeDiff < 2000; // Within 2 seconds
          });

          if (existsByContent) {
            console.log('⚠️ Message with same content already exists, replacing optimistic with real...');
            // Remove optimistic, keep real message
            return prev
              .filter(m => !(m.isOptimistic && m.content === message.content))
              .concat(message);
          }

          console.log('✅ Adding new message to state');
          return [...prev, message];
        });
        // ✅ Instant scroll - no delay!
        scrollToBottom();
        // Backup scroll after 10ms to ensure DOM updated
        setTimeout(() => scrollToBottom(), 10);
        
        // ✅ Refresh conversations khi nhận tin nhắn mới trong conversation đang mở
        if (onConversationRead) {
          setTimeout(() => {
            onConversationRead();
          }, 200);
        }
      } else {
        console.log('❌ Message is not for this conversation, ignoring');
      }
    };

    // ✅ Remove old listener before adding new one to avoid duplicates
    socket.off('new_message', handleNewMessage);
    socket.on('new_message', handleNewMessage);

    // Listen for typing
    socket.on('user_typing', (data) => {
      if (data.userId === receiverId) {
        setTyping(true);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          setTyping(false);
        }, 3000);
      }
    });

    socket.on('user_stop_typing', (data) => {
      if (data.userId === receiverId) {
        setTyping(false);
      }
    });

    // ✅ Thêm polling dự phòng nếu socket không connected (mỗi 3 giây check 1 lần)
    if (!connected) {
      pollingIntervalRef.current = setInterval(() => {
        console.log('🔄 Polling for new messages (socket not connected)');
        loadMessages(true); // Merge mode để không mất messages mới
      }, 3000);
    } else {
      // Clear polling nếu socket đã connected
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing');
      socket.off('user_stop_typing');
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [socket, receiverId, currentUserId, connected]);

  const loadMessages = async (merge = false) => {
    if (!receiverId) return;

    setLoading(true);
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/internal-chat/messages/${receiverId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const newMessages = response.data.data || [];
        if (merge) {
          // ✅ Merge với messages hiện tại, tránh mất messages mới từ socket
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m._id || m.id));
            const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m._id || m.id));
            return [...prev, ...uniqueNewMessages].sort((a, b) => {
              const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
              const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
              return timeA - timeB;
            });
          });
        } else {
          setMessages(newMessages);
        }
        
        // ✅ Mark unread messages as read (giống mobile) - chỉ khi không phải merge mode
        // Nếu đã mark as read trong handleSelectUser, sẽ không có unreadIds nào ở đây
        if (!merge) {
          const unreadIds = newMessages
            .filter(msg => {
              const receiverIdFromMsg = msg.receiver?._id || msg.receiver;
              return !msg.read && receiverIdFromMsg === currentUserId;
            })
            .map(msg => msg._id);
          
          if (unreadIds.length > 0) {
            try {
              const markReadResponse = await axios.post(`${API_URL}/internal-chat/mark-read`, 
                { messageIds: unreadIds },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              
              if (markReadResponse.data.success) {
                // ✅ Update messages state to reflect read status
                setMessages(prev => prev.map(msg => {
                  if (unreadIds.includes(msg._id)) {
                    return { ...msg, read: true };
                  }
                  return msg;
                }));
                
                // ✅ Callback để refresh conversations list (để cập nhật badge) - gọi ngay lập tức
                if (onConversationRead) {
                  onConversationRead();
                }
              }
            } catch (error) {
              console.error('Error marking messages as read:', error);
            }
          } else {
            // ✅ Nếu không có unread messages, vẫn refresh conversations để đảm bảo UI đúng
            if (onConversationRead) {
              onConversationRead();
            }
          }
        }
        
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || !socket || !connected || sending) return;

    const messageContent = inputValue.trim();
    const tempId = `temp-${Date.now()}`;

    // ✅ OPTIMISTIC UI: Show message INSTANTLY
    const optimisticMessage = {
      _id: tempId,
      content: messageContent,
      sender: { _id: currentUserId },
      receiver: { _id: receiverId },
      createdAt: new Date().toISOString(),
      isOptimistic: true
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setInputValue('');
    scrollToBottom();

    setSending(true);
    try {
      socket.emit('send_message', {
        receiverId,
        content: messageContent
      });
      socket.emit('stop_typing', { receiverId });
      
      // ✅ Refresh conversations sau khi gửi tin nhắn để cập nhật badge real-time
      if (onConversationRead) {
        setTimeout(() => {
          onConversationRead();
        }, 300); // Delay nhỏ để đảm bảo message đã được lưu vào DB
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => m._id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    if (!socket || !connected) return;

    socket.emit('typing', { receiverId });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { receiverId });
    }, 2000);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  if (!receiverId) {
    return (
      <Card style={{ height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description="Chọn người để bắt đầu chat" />
      </Card>
    );
  }

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Avatar icon={<UserOutlined />} src={receiverAvatar} />
          <Text strong>{receiverName}</Text>
          {!connected && <Text type="secondary" style={{ fontSize: '12px' }}>(Đang kết nối...)</Text>}
        </div>
      }
      style={{ height: '600px', display: 'flex', flexDirection: 'column' }}
      bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px' }}
    >
      <Spin spinning={loading}>
        <div style={{
          flex: 1,
          height: '450px',
          overflowY: 'auto',
          marginBottom: '16px',
          padding: '8px',
          backgroundColor: '#fafafa',
          borderRadius: '8px'
        }}>
          {messages.length === 0 && !loading ? (
            <Empty description="Chưa có tin nhắn nào" style={{ marginTop: '100px' }} />
          ) : (
            <List
              dataSource={messages}
              renderItem={(msg) => {
                const isOwnMessage = msg.sender && msg.sender._id === currentUserId;
                return (
                  <List.Item style={{
                    justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                    padding: '4px 0',
                    border: 'none'
                  }}>
                    <div style={{
                      maxWidth: '70%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isOwnMessage ? 'flex-end' : 'flex-start'
                    }}>
                      {!isOwnMessage && (
                        <Text type="secondary" style={{ fontSize: '12px', marginBottom: '4px' }}>
                          {msg.sender?.username || msg.sender?.email || 'Unknown'}
                        </Text>
                      )}
                      <div style={{
                        padding: '8px 12px',
                        borderRadius: '12px',
                        backgroundColor: isOwnMessage ? '#1890ff' : '#ffffff',
                        color: isOwnMessage ? 'white' : 'black',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        wordBreak: 'break-word'
                      }}>
                        {msg.content}
                      </div>
                      <Text type="secondary" style={{ fontSize: '10px', marginTop: '4px' }}>
                        {moment(msg.createdAt).format('HH:mm')}
                      </Text>
                    </div>
                  </List.Item>
                );
              }}
            />
          )}
          {typing && (
            <div style={{ padding: '8px', fontStyle: 'italic', color: '#999' }}>
              {receiverName} đang gõ...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </Spin>

      <Input.Group compact style={{ display: 'flex' }}>
        <Input
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            handleTyping();
          }}
          onPressEnter={sendMessage}
          placeholder="Nhập tin nhắn..."
          disabled={!connected || sending}
          style={{ flex: 1 }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={sendMessage}
          disabled={!connected || sending || !inputValue.trim()}
          loading={sending}
        >
          Gửi
        </Button>
      </Input.Group>
    </Card>
  );
};

export default InternalChat;











