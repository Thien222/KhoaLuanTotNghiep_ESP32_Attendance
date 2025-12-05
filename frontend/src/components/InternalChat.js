import React, { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, List, Avatar, Badge, Typography, Spin, Empty } from 'antd';
import { SendOutlined, UserOutlined } from '@ant-design/icons';
import { useSocket } from '../hooks/useSocket';
import axios from 'axios';
import { getAPIUrl } from '../utils/configManager';
import moment from 'moment';

const { Text } = Typography;

const InternalChat = ({ receiverId, receiverName, receiverAvatar, currentUserId }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { socket, connected } = useSocket();

  useEffect(() => {
    if (!socket || !receiverId) return;

    // Load message history
    loadMessages();

    // Listen for new messages
    const handleNewMessage = (message) => {
      // Only add if it's for this conversation
      if (
        (message.receiver && message.receiver._id === receiverId && message.sender._id === currentUserId) ||
        (message.sender && message.sender._id === receiverId && message.receiver && message.receiver._id === currentUserId) ||
        (message.sender && message.sender._id === currentUserId && message.receiver && message.receiver._id === receiverId)
      ) {
        setMessages(prev => {
          // Check if message already exists
          const exists = prev.some(m => m._id === message._id);
          if (exists) return prev;
          return [...prev, message];
        });
        scrollToBottom();
      }
    };

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

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing');
      socket.off('user_stop_typing');
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [socket, receiverId, currentUserId]);

  const loadMessages = async () => {
    if (!receiverId) return;
    
    setLoading(true);
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/internal-chat/messages/${receiverId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setMessages(response.data.data || []);
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

    setSending(true);
    try {
      socket.emit('send_message', {
        receiverId,
        content: inputValue.trim()
      });

      // Stop typing indicator
      socket.emit('stop_typing', { receiverId });
      
      setInputValue('');
    } catch (error) {
      console.error('Error sending message:', error);
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
          <Badge dot={connected} color={connected ? '#52c41a' : '#ff4d4f'}>
            <Avatar icon={<UserOutlined />} src={receiverAvatar} />
          </Badge>
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





