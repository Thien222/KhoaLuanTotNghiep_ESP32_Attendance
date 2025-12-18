import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { chatAPI } from '../services/api';

const CHAT_HISTORY_KEY = 'chatbot_history';

const QUICK_QUESTIONS = [
  'Lương tháng này của tôi?',
  'Còn bao nhiêu ngày phép?',
  'Tôi điểm danh chưa?',
  'Chính sách nghỉ phép?',
];

/**
 * ✅ Lọc câu trả lời bot để:
 * - loại bỏ “lương cuối tuần” nếu backend lỡ trả về text đó
 * - loại bỏ các dòng có từ khóa weekendWorkPay/weekend
 * (an toàn 2 lớp, BE vẫn nên bỏ weekendWorkPay như mình hướng dẫn trước)
 */
function sanitizeBotReply(text) {
  if (!text) return '';

  const lines = String(text).split('\n');

  const filtered = lines.filter(line => {
    const l = line.toLowerCase();
    if (l.includes('weekendworkpay')) return false;
    if (l.includes('lương cuối tuần')) return false;
    if (l.includes('làm cuối tuần')) return false;
    // nếu bạn muốn mạnh tay hơn thì bỏ luôn từ "cuối tuần":
    // if (l.includes('cuối tuần')) return false;
    return true;
  });

  // nếu bị lọc hết thì trả về text gốc (tránh rỗng)
  const out = filtered.join('\n').trim();
  return out || String(text).trim();
}

export default function ChatBotScreen() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef(null);

  // ✅ Scroll an toàn hơn (Android hay lỗi scrollToEnd)
  const scrollToBottom = useCallback(() => {
    if (!flatListRef.current) return;
    setTimeout(() => {
      try {
        flatListRef.current.scrollToOffset({ offset: 999999, animated: true });
      } catch (e) {
        // ignore
      }
    }, 80);
  }, []);

  const getInitialMessages = async () => {
    try {
      const saved = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }

    return [
      {
        id: '1',
        text: 'Xin chào! Tôi là ChatBot hỗ trợ hệ thống quản lý nhân sự. Tôi có thể giúp bạn về chấm công, nghỉ phép, bảng lương và các vấn đề khác. Bạn cần hỗ trợ gì?',
        isBot: true,
        timestamp: new Date(),
      },
    ];
  };

  // Load lịch sử khi component mount
  useEffect(() => {
    const loadHistory = async () => {
      const initialMessages = await getInitialMessages();
      setMessages(initialMessages);
    };
    loadHistory();
  }, []);

  // Lưu lịch sử chat vào AsyncStorage mỗi khi messages thay đổi
  useEffect(() => {
    const saveHistory = async () => {
      if (messages.length > 0) {
        try {
          await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
        } catch (error) {
          console.error('Error saving chat history:', error);
        }
      }
    };
    saveHistory();
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      text: text.trim(),
      isBot: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const response = await chatAPI.sendMessage(text.trim());

      const botText = sanitizeBotReply(response?.reply || 'Xin lỗi, tôi không hiểu câu hỏi của bạn.');

      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: botText,
        isBot: true,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);

      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.',
        isBot: true,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickQuestion = (question) => sendMessage(question);

  const handleClearHistory = () => {
    Alert.alert(
      'Xóa lịch sử chat',
      'Bạn có chắc muốn xóa toàn bộ lịch sử chat?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            const defaultMessage = [
              {
                id: '1',
                text: 'Xin chào! Tôi là ChatBot hỗ trợ hệ thống quản lý nhân sự. Tôi có thể giúp bạn về chấm công, nghỉ phép, bảng lương và các vấn đề khác. Bạn cần hỗ trợ gì?',
                isBot: true,
                timestamp: new Date(),
              },
            ];
            setMessages(defaultMessage);
            try {
              await AsyncStorage.removeItem(CHAT_HISTORY_KEY);
            } catch (error) {
              console.error('Error clearing chat history:', error);
            }
          },
        },
      ]
    );
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.messageContainer,
        item.isBot ? styles.botMessage : styles.userMessage,
      ]}
    >
      {item.isBot && (
        <View style={styles.botAvatar}>
          <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
        </View>
      )}

      <View
        style={[
          styles.messageBubble,
          item.isBot ? styles.botBubble : styles.userBubble,
        ]}
      >
        <Text style={[styles.messageText, item.isBot ? styles.botText : styles.userText]}>
          {item.text}
        </Text>

        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>ChatBot Hỗ trợ</Text>
            <Text style={styles.headerSubtitle}>Luôn sẵn sàng hỗ trợ bạn</Text>
          </View>

          <TouchableOpacity onPress={handleClearHistory} style={styles.refreshButton}>
            <Ionicons name="refresh" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Questions */}
      <View style={styles.quickQuestionsContainer}>
        <FlatList
          horizontal
          data={QUICK_QUESTIONS}
          keyExtractor={(item, index) => index.toString()}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.quickQuestion} onPress={() => handleQuickQuestion(item)}>
              <Text style={styles.quickQuestionText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        keyboardShouldPersistTaps="handled"
      />

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#1890ff" />
          <Text style={styles.loadingText}>Đang xử lý...</Text>
        </View>
      )}

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Nhập câu hỏi của bạn..."
            placeholderTextColor="#999"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || loading}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  header: {
    backgroundColor: '#1890ff',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  quickQuestionsContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  quickQuestion: {
    backgroundColor: '#e6f7ff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#91d5ff',
  },
  quickQuestionText: { color: '#1890ff', fontSize: 13, fontWeight: '500' },

  messagesList: { padding: 16, paddingBottom: 8 },

  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  botMessage: { justifyContent: 'flex-start' },
  userMessage: { justifyContent: 'flex-end' },

  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#52c41a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },

  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  botBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userBubble: {
    backgroundColor: '#1890ff',
    borderBottomRightRadius: 4,
    marginLeft: 'auto',
  },

  messageText: { fontSize: 15, lineHeight: 20 },
  botText: { color: '#333' },
  userText: { color: '#fff' },

  timestamp: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },

  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loadingText: { marginLeft: 8, color: '#666', fontSize: 13 },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: '#333',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1890ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: { backgroundColor: '#bfbfbf' },
});
