import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { internalChatAPI } from '../services/api';
import { employeeAPI } from '../services/api';
import moment from 'moment';

export default function InternalChatScreen({ navigation, route }) {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);
  const messagePollInterval = useRef(null);

  useEffect(() => {
    loadUsers();
    loadConversations();

    return () => {
      if (messagePollInterval.current) {
        clearInterval(messagePollInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      loadMessages();
      // ⚡ Poll for new messages every 1 second (faster!)
      messagePollInterval.current = setInterval(() => {
        loadMessages();
      }, 1000);
    } else {
      if (messagePollInterval.current) {
        clearInterval(messagePollInterval.current);
      }
    }

    return () => {
      if (messagePollInterval.current) {
        clearInterval(messagePollInterval.current);
      }
    };
  }, [selectedUserId]);

  const loadUsers = async () => {
    try {
      const currentUserRole = user?.role;
      const allowedRoles = getAllowedRolesForChat(currentUserRole);
    } catch (error) {
      console.error('Error loading users:', error);
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

  const loadConversations = async () => {
    try {
      const response = await internalChatAPI.getConversations();
      if (response.success) {
        setConversations(response.data || []);
        const uniqueUsers = [];
        const userIds = new Set();
        response.data.forEach(conv => {
          if (conv.userId && !userIds.has(conv.userId.toString())) {
            userIds.add(conv.userId.toString());
            uniqueUsers.push({
              _id: conv.userId,
              name: conv.username || 'Unknown',
              email: conv.email,
              role: conv.role,
              unreadCount: conv.unreadCount || 0,
              lastMessage: conv.lastMessage,
              lastMessageTime: conv.lastMessageTime,
            });
          }
        });
        setUsers(uniqueUsers);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadMessages = async () => {
    if (!selectedUserId) return;

    try {
      const response = await internalChatAPI.getConversation(selectedUserId);
      if (response.success) {
        const newMessages = response.data || [];

        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m._id));
          const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m._id));

          if (uniqueNewMessages.length > 0) {
            return [...prev, ...uniqueNewMessages].sort((a, b) =>
              new Date(a.createdAt) - new Date(b.createdAt)
            );
          }

          if (prev.length === newMessages.length) {
            return prev;
          }

          return newMessages;
        });

        const unreadIds = newMessages
          .filter(msg => !msg.read && msg.receiver?._id === (user?._id || user?.id))
          .map(msg => msg._id);
        if (unreadIds.length > 0) {
          await internalChatAPI.markAsRead(unreadIds);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || !selectedUserId || sending) return;

    const messageContent = inputValue.trim();
    const currentUserId = user?._id || user?.id;

    const optimisticMessage = {
      _id: `temp-${Date.now()}`,
      content: messageContent,
      sender: { _id: currentUserId },
      receiver: { _id: selectedUserId },
      createdAt: new Date().toISOString(),
      isOptimistic: true
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setInputValue('');

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    setSending(true);
    try {
      const response = await internalChatAPI.sendMessage(selectedUserId, messageContent);
      if (response.success) {
        setTimeout(() => loadMessages(), 100);
      } else {
        setMessages(prev => prev.filter(m => m._id !== optimisticMessage._id));
        Alert.alert('Lỗi', response.message || 'Không thể gửi tin nhắn');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => m._id !== optimisticMessage._id));
      Alert.alert('Lỗi', 'Không thể gửi tin nhắn');
    } finally {
      setSending(false);
    }
  };

  const handleSelectUser = async (userId, userName) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    setMessages([]);

    try {
      const response = await internalChatAPI.getConversation(userId);
      if (response.success) {
        const messages = response.data || [];
        const unreadIds = messages
          .filter(msg => !msg.read && msg.receiver?._id === (user?._id || user?.id))
          .map(msg => msg._id);

        if (unreadIds.length > 0) {
          await internalChatAPI.markAsRead(unreadIds);
          loadConversations();
        }
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadConversations(), selectedUserId && loadMessages()]);
    setRefreshing(false);
  };

  const renderMessage = ({ item }) => {
    const isOwnMessage = item.sender?._id === (user?._id || user?.id);

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        {!isOwnMessage && (
          <Text style={styles.senderName}>
            {item.sender?.username || item.sender?.email || 'Unknown'}
          </Text>
        )}
        <View
          style={[
            styles.messageBubble,
            isOwnMessage ? styles.ownBubble : styles.otherBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
            ]}
          >
            {item.content}
          </Text>
        </View>
        <Text style={styles.messageTime}>
          {moment(item.createdAt).format('HH:mm')}
        </Text>
      </View>
    );
  };

  const renderUserItem = ({ item }) => {
    const conversation = conversations.find(c => c.userId === item._id);
    const unreadCount = conversation?.unreadCount || item.unreadCount || 0;
    const isSelected = selectedUserId === item._id;

    return (
      <TouchableOpacity
        style={[styles.userItem, isSelected && styles.selectedUserItem]}
        onPress={() => handleSelectUser(item._id, item.name)}
      >
        <View style={styles.userAvatar}>
          <Ionicons name="person" size={20} color="#722ed1" />
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {item.name}
          </Text>
          {conversation?.lastMessage && (
            <Text style={styles.lastMessage} numberOfLines={1}>
              {conversation.lastMessage.content}
            </Text>
          )}
        </View>
        {conversation?.lastMessageTime && (
          <Text style={styles.messageTimeSmall}>
            {moment(conversation.lastMessageTime).format('HH:mm')}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat nội bộ</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {!selectedUserId ? (
          <View style={styles.userListContainer}>
            <FlatList
              data={users}
              renderItem={renderUserItem}
              keyExtractor={(item) => item._id.toString()}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>Chưa có cuộc trò chuyện nào</Text>
                </View>
              }
            />
          </View>
        ) : (
          <KeyboardAvoidingView
            style={styles.chatContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={90}
          >
            <View style={styles.chatHeader}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedUserId(null);
                  setSelectedUserName('');
                }}
                style={styles.backToUsersButton}
              >
                <Ionicons name="arrow-back" size={20} color="#333" />
              </TouchableOpacity>
              <Text style={styles.chatHeaderTitle}>{selectedUserName}</Text>
              <View style={{ width: 20 }} />
            </View>

            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item._id.toString()}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContent}
              onContentSizeChange={() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={
                <View style={styles.emptyChatContainer}>
                  <Text style={styles.emptyChatText}>Chưa có tin nhắn nào</Text>
                </View>
              }
            />

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={inputValue}
                onChangeText={setInputValue}
                placeholder="Nhập tin nhắn..."
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.sendButton, (!inputValue.trim() || sending) && styles.sendButtonDisabled]}
                onPress={sendMessage}
                disabled={!inputValue.trim() || sending}
              >
                <Ionicons
                  name="send"
                  size={18}
                  color={inputValue.trim() && !sending ? '#fff' : '#999'}
                />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  userListContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedUserItem: {
    backgroundColor: '#f0f5ff',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f5ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ff4d4f',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 13,
    color: '#666',
  },
  messageTimeSmall: {
    fontSize: 11,
    color: '#999',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  backToUsersButton: {
    padding: 4,
    marginRight: 8,
  },
  chatHeaderTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageContainer: {
    marginBottom: 8,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  ownBubble: {
    backgroundColor: '#722ed1',
  },
  otherBubble: {
    backgroundColor: '#f0f0f0',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 80,
    fontSize: 14,
    backgroundColor: '#fafafa',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#722ed1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  emptyChatContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyChatText: {
    fontSize: 14,
    color: '#999',
  },
});
