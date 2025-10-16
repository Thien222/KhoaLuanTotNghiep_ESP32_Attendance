import React, { useState, useRef, useEffect } from 'react';
import { 
  Card, 
  Input, 
  Button, 
  Typography, 
  Space, 
  Avatar,
  message
} from 'antd';
import { 
  SendOutlined, 
  RobotOutlined, 
  UserOutlined 
} from '@ant-design/icons';
import axios from 'axios';

const { Title } = Typography;
const { TextArea } = Input;

const ChatBot = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Xin chào! Tôi là ChatBot hỗ trợ hệ thống quản lý nhân sự. Tôi có thể giúp bạn về chấm công, nghỉ phép, bảng lương và các vấn đề khác. Bạn cần hỗ trợ gì?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      // Mock chatbot response
      const responses = [
        'Tôi có thể giúp bạn về chấm công, nghỉ phép, bảng lương và các vấn đề khác.',
        'Để xem lịch sử chấm công, bạn có thể vào mục "Chấm công" trong menu.',
        'Để gửi yêu cầu nghỉ phép, bạn có thể vào mục "Nghỉ phép" và nhấn "Gửi yêu cầu nghỉ phép".',
        'Bảng lương được tính dựa trên số giờ làm việc và lương cơ bản của bạn.',
        'Nếu bạn có thắc mắc gì khác, hãy liên hệ với bộ phận HR.'
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      const botMessage = {
        id: Date.now() + 1,
        text: randomResponse,
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('ChatBot error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>
            <RobotOutlined /> ChatBot Hỗ trợ
          </Title>
        </div>

        <div style={{ 
          height: '500px', 
          border: '1px solid #d9d9d9', 
          borderRadius: '8px',
          padding: '16px',
          overflowY: 'auto',
          marginBottom: '16px',
          backgroundColor: '#fafafa'
        }}>
          {messages.map((message) => (
            <div
              key={message.id}
              style={{
                display: 'flex',
                justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: '16px'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                maxWidth: '70%',
                flexDirection: message.sender === 'user' ? 'row-reverse' : 'row'
              }}>
                <Avatar
                  icon={message.sender === 'user' ? <UserOutlined /> : <RobotOutlined />}
                  style={{
                    backgroundColor: message.sender === 'user' ? '#1890ff' : '#52c41a',
                    margin: message.sender === 'user' ? '0 0 0 8px' : '0 8px 0 0'
                  }}
                />
                <div style={{
                  backgroundColor: message.sender === 'user' ? '#1890ff' : '#fff',
                  color: message.sender === 'user' ? '#fff' : '#000',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  wordWrap: 'break-word'
                }}>
                  {message.text}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#52c41a', marginRight: '8px' }} />
              <div style={{
                backgroundColor: '#fff',
                padding: '8px 12px',
                borderRadius: '12px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}>
                Đang suy nghĩ...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <TextArea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Nhập câu hỏi của bạn..."
            autoSize={{ minRows: 1, maxRows: 4 }}
            style={{ flex: 1 }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendMessage}
            loading={loading}
            disabled={!inputMessage.trim()}
          >
            Gửi
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ChatBot;