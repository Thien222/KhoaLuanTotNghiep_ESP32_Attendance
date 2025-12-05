import React, { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, Typography, Space, Avatar, Tag, Popconfirm } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined, ReloadOutlined } from '@ant-design/icons';
import { chatApi } from '../../services/api'; // giữ nguyên path theo dự án của bạn

const { Title } = Typography;
const { TextArea } = Input;

const CHAT_HISTORY_KEY = 'chatbot_history';

const SUGGESTS_EMP = [
  'Cho tui xem lương tháng này của tôi',
  'Nếu tôi nghỉ 2 ngày thì lương tháng này là bao nhiêu?',
  'Chính sách nghỉ phép bên mình thế nào?'
];

const SUGGESTS_ELEVATED = [
  'Tổng lương tháng 9 của tất cả nhân viên là bao nhiêu?',
  'Hôm nay có ai chưa điểm danh không?',
  'Cho tui xem bảng lương tháng 9 của nhân viên A.'
];

const ChatBot = () => {
  // Lấy lịch sử chat từ localStorage khi component mount
  const getInitialMessages = () => {
    try {
      const saved = localStorage.getItem(CHAT_HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Parse lại timestamp từ string về Date object
        return parsed.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
    // Message mặc định nếu không có lịch sử
    return [
      {
        id: 1,
        text:
          'Xin chào! Tôi là ChatBot hỗ trợ hệ thống quản lý nhân sự. ' +
          'Tôi có thể giúp bạn về chấm công, nghỉ phép, bảng lương và các vấn đề khác. ' +
          'Bạn cần hỗ trợ gì?',
        sender: 'bot',
        timestamp: new Date()
      }
    ];
  };

  const [messages, setMessages] = useState(getInitialMessages);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // (Tùy chọn) gợi ý theo role
  const role = localStorage.getItem('role') || ''; // 'employee' | 'accountant' | 'manager' | 'admin'
  const suggestions =
    role === 'accountant' || role === 'manager' || role === 'admin'
      ? [...SUGGESTS_EMP, ...SUGGESTS_ELEVATED]
      : SUGGESTS_EMP;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Lưu lịch sử chat vào localStorage mỗi khi messages thay đổi
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  }, [messages]);

  const pushMessage = (msg) => setMessages((prev) => [...prev, msg]);

  // Xóa sạch lịch sử chat
  const handleClearHistory = () => {
    const defaultMessage = [
      {
        id: 1,
        text:
          'Xin chào! Tôi là ChatBot hỗ trợ hệ thống quản lý nhân sự. ' +
          'Tôi có thể giúp bạn về chấm công, nghỉ phép, bảng lương và các vấn đề khác. ' +
          'Bạn cần hỗ trợ gì?',
        sender: 'bot',
        timestamp: new Date()
      }
    ];
    setMessages(defaultMessage);
    localStorage.removeItem(CHAT_HISTORY_KEY);
  };

  const handleSendMessage = async () => {
    const text = inputMessage.trim();
    if (!text) return;

    const userMessage = {
      id: Date.now(),
      text,
      sender: 'user',
      timestamp: new Date()
    };
    pushMessage(userMessage);

    setInputMessage('');
    setLoading(true);

    try {
      // Gọi API thật tới backend /api/chat/message
      const resp = await chatApi.send(text);

      const botMessage = {
        id: Date.now() + 1,
        // ĐỌC ĐÚNG TRƯỜNG 'reply' từ backend; fallback 'text' nếu bạn có controller cũ
        text: resp?.reply ?? resp?.text ?? 'Không có phản hồi.',
        sender: 'bot',
        timestamp: new Date()
      };

      pushMessage(botMessage);
    } catch (error) {
      console.error('ChatBot error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: error?.message || 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.',
        sender: 'bot',
        timestamp: new Date()
      };
      pushMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    // Enter để gửi, Shift+Enter để xuống dòng
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>
            <RobotOutlined /> ChatBot Hỗ trợ
          </Title>
          <Popconfirm
            title="Xóa lịch sử chat"
            description="Bạn có chắc muốn xóa toàn bộ lịch sử chat?"
            onConfirm={handleClearHistory}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button 
              icon={<ReloadOutlined />} 
              type="default"
              size="small"
            >
              Xóa lịch sử
            </Button>
          </Popconfirm>
        </div>

        <div
          style={{
            height: '500px',
            border: '1px solid #d9d9d9',
            borderRadius: '8px',
            padding: '16px',
            overflowY: 'auto',
            marginBottom: '16px',
            backgroundColor: '#fafafa'
          }}
        >
          {messages.map((message) => (
            <div
              key={message.id} // ✅ key ổn định cho mỗi message
              style={{
                display: 'flex',
                justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: '16px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  maxWidth: '70%',
                  flexDirection: message.sender === 'user' ? 'row-reverse' : 'row'
                }}
              >
                <Avatar
                  icon={message.sender === 'user' ? <UserOutlined /> : <RobotOutlined />}
                  style={{
                    backgroundColor: message.sender === 'user' ? '#1890ff' : '#52c41a',
                    margin: message.sender === 'user' ? '0 0 0 8px' : '0 8px 0 0'
                  }}
                />
                <div
                  style={{
                    backgroundColor: message.sender === 'user' ? '#1890ff' : '#fff',
                    color: message.sender === 'user' ? '#fff' : '#000',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    wordWrap: 'break-word',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {message.text}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#52c41a', marginRight: '8px' }} />
              <div
                style={{
                  backgroundColor: '#fff',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}
              >
                Đang suy nghĩ...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Gợi ý nhanh */}
        <Space wrap style={{ marginBottom: 12 }}>
          {suggestions.map((s) => (
            <Tag  // ✅ key theo nội dung thay vì index để tránh cảnh báo
              key={s}
              color="blue"
              style={{ cursor: 'pointer' }}
              onClick={() => setInputMessage(s)}
            >
              {s}
            </Tag>
          ))}
        </Space>

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
