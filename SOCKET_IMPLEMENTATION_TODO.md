# 📱 Socket Implementation TODO

## 🎯 Feature Request: Real-time Chat & Notifications

### **Scope:**
Implement full socket.io integration for:
1. Chat tin nhắn real-time
2. Badge unread count  
3. Status đã xem/chưa xem
4. Online/offline indicator
5. Enhanced pop-up notifications

---

## 📊 Current Status:

### ✅ **Already Implemented:**
- Socket infrastructure (`backend/socket/socketServer.js`)
- Basic socket connection (`frontend/src/hooks/useSocket.js`)
- Leave request notifications (`new_leave_request`)
- OT request notifications (`new_ot_request`)
- Badge counter in Layout

### ⏳ **TODO - Backend:**

#### **1. Chat Messages (socket events)**
```javascript
// backend/socket/socketServer.js

// Event: Send message
socket.on('send_message', async (data) => {
  const { receiverId, content } = data;
  // Save to DB...
  // Emit to receiver
  io.to(receiverSocketId).emit('new_message', messageData);
});

// Event: Mark as read
socket.on('mark_read', async (data) => {
  const { messageIds } = data;
  // Update DB...
  // Emit to sender
  io.to(senderSocketId).emit('messages_read', { messageIds });
});
```

#### **2. Online Status**
```javascript
// Track online users
const onlineUsers = new Map(); // userId -> socketId

socket.on('user_online', (userId) => {
  onlineUsers.set(userId, socket.id);
  io.emit('user_status', { userId, status: 'online' });
});

socket.on('disconnect', () => {
  // Remove from online users
  const userId = getUserIdBySocketId(socket.id);
  onlineUsers.delete(userId);
  io.emit('user_status', { userId, status: 'offline' });
});
```

#### **3. Typing Indicator**
```javascript
socket.on('typing', (data) => {
  const { receiverId } = data;
  io.to(receiverSocketId).emit('user_typing', { userId: socket.userId });
});
```

---

### ⏳ **TODO - Frontend:**

#### **1. Chat Component Updates**
File: `frontend/src/pages/chat/InternalChatScreen.js` (or similar)

```javascript
// Listen for new messages
useEffect(() => {
  if (!socket) return;
  
  socket.on('new_message', (message) => {
    setMessages(prev => [...prev, message]);
    // Update unread count
    if (currentConversation !== message.senderId) {
      setUnreadCount(prev => prev + 1);
    }
  });
  
  socket.on('messages_read', ({ messageIds }) => {
    setMessages(prev => prev.map(m => 
      messageIds.includes(m._id) ? { ...m, read: true } : m
    ));
  });
  
  return () => {
    socket.off('new_message');
    socket.off('messages_read');
  };
}, [socket, current Conversation]);
```

#### **2. Badge Component**
File: `frontend/src/components/Layout.js`

```javascript
const [unreadCount, setUnreadCount] = useState(0);

useEffect(() => {
  if (!socket) return;
  
  socket.on('new_message', () => {
    setUnreadCount(prev => prev + 1);
  });
  
  return () => socket.off('new_message');
}, [socket]);

// In render:
<Badge count={unreadCount + notificationCount}>
  <BellOutlined />
</Badge>
```

#### **3. Online Status**
```javascript
const [onlineUsers, setOnlineUsers] = useState(new Set());

useEffect(() => {
  if (!socket) return;
  
  socket.on('user_status', ({ userId, status }) => {
    setOnlineUsers(prev => {
      const next = new Set(prev);
      if (status === 'online') next.add(userId);
      else next.delete(userId);
      return next;
    });
  });
}, [socket]);

// Render indicator:
{onlineUsers.has(userId) && <Badge status="success" />}
```

---

## 📝 **Implementation Plan:**

### **Phase 1: Chat Messages (Priority)**
- [ ] Backend: `send_message`, `new_message` events
- [ ] Frontend: Update chat component to listen
- [ ] Test: Send message → Receive in real-time

### **Phase 2: Read Status**
- [ ] Backend: `mark_read`, `messages_read` events
- [ ] Frontend: Mark messages as read when viewed
- [ ] UI: Show read/unread indicators

### **Phase 3: Unread Badge**
- [ ] Backend: Count unread messages API
- [ ] Frontend: Display badge on chat icon
- [ ] Update count on new messages

### **Phase 4: Online Status**
- [ ] Backend: Track online users (Map)
- [ ] Frontend: Display online/offline indicator
- [ ] Handle connect/disconnect

### **Phase 5: Enhanced Notifications**
- [ ] Notification sound
- [ ] Desktop notifications (if permitted)
- [ ] Notification history panel

---

## 🧪 **Testing Checklist:**

- [ ] User A sends message → User B receives immediately
- [ ] User B reads message → User A sees "read" status
- [ ] Badge count updates correctly
- [ ] Online/offline status shows accurately
- [ ] Works on mobile (React Native)
- [ ] Performance: No lag with 100+ messages
- [ ] Reconnection handling after network drop

---

## ⏱️ **Estimated Time:**
- Chat messages: 2-3 hours
- Read status: 1 hour
- Unread badge: 1 hour
- Online status: 1-2 hours
- Testing & Polish: 1 hour
- **Total: 6-8 hours**

---

## 🚀 **Priority:**
**Medium** - Not blocking, but important for UX

Can be done after:
1. Testing current fixes (mode switch, scroll, LLM)
2. Confirming deployment success

---

**Status:** TODO  
**Assignee:** TBD  
**Target:** After v1.0 release
