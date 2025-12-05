const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const InternalMessage = require('../models/InternalMessage');

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // JWT payload might have 'id' or 'userId' field
      const userId = decoded.id || decoded.userId || decoded._id;
      if (!userId) {
        return next(new Error('Invalid token: no user ID found'));
      }
      const user = await User.findById(userId).populate('employee');
      if (!user) {
        return next(new Error('User not found'));
      }
      
      socket.user = user;
      socket.userId = user._id.toString();
      next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.user.username || socket.user.email} (${socket.user.role}) - Socket ID: ${socket.id}`);
    
    // Join user's personal room
    socket.join(`user_${socket.userId}`);
    
    // Join role-based rooms
    socket.join(`role_${socket.user.role}`);
    
    // Emit online status to user's contacts
    socket.broadcast.emit('user_online', {
      userId: socket.userId,
      username: socket.user.username || socket.user.email
    });

    // Handle private messages
    socket.on('send_message', async (data) => {
      try {
        const { receiverId, content, room } = data;
        
        if (!content || !content.trim()) {
          socket.emit('error', { message: 'Message content cannot be empty' });
          return;
        }

        // Validate receiver if it's a private message
        if (receiverId && !room) {
          const receiver = await User.findById(receiverId);
          if (!receiver) {
            socket.emit('error', { message: 'Receiver not found' });
            return;
          }
          
          // Validate role-based chat permissions:
          // - Admin (manager) chỉ chat với nhân viên (employee)
          // - Nhân viên (employee) chỉ chat với admin (manager) và kế toán (accountant)
          // - Kế toán (accountant) chỉ chat với admin (manager) và nhân viên (employee)
          const senderRole = socket.user.role;
          const receiverRole = receiver.role;
          
          const canChat = canUsersChat(senderRole, receiverRole);
          if (!canChat) {
            socket.emit('error', { message: 'Bạn không có quyền chat với người dùng này' });
            return;
          }
        }

        // Create message in database
        const message = new InternalMessage({
          sender: socket.userId,
          receiver: receiverId || null,
          content: content.trim(),
          type: 'text',
          room: room || null
        });

        await message.save();
        
        // Populate sender info
        await message.populate('sender', 'username email employee');
        await message.populate('receiver', 'username email employee');

        // Emit to receiver (if private message)
        if (receiverId && !room) {
          io.to(`user_${receiverId}`).emit('new_message', message);
          // Also emit to sender for confirmation
          socket.emit('new_message', message);
        } 
        // Emit to room (if group chat)
        else if (room) {
          io.to(room).emit('new_message', message);
        }

        console.log(`📨 Message sent from ${socket.user.username} to ${receiverId || room}`);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing', (data) => {
      const { receiverId, room } = data;
      if (receiverId) {
        socket.to(`user_${receiverId}`).emit('user_typing', {
          userId: socket.userId,
          username: socket.user.username || socket.user.email
        });
      } else if (room) {
        socket.to(room).emit('user_typing', {
          userId: socket.userId,
          username: socket.user.username || socket.user.email
        });
      }
    });

    // Handle stop typing
    socket.on('stop_typing', (data) => {
      const { receiverId, room } = data;
      if (receiverId) {
        socket.to(`user_${receiverId}`).emit('user_stop_typing', {
          userId: socket.userId
        });
      } else if (room) {
        socket.to(room).emit('user_stop_typing', {
          userId: socket.userId
        });
      }
    });

    // Handle mark message as read
    socket.on('mark_read', async (data) => {
      try {
        const { messageId } = data;
        const message = await InternalMessage.findById(messageId);
        
        if (message && message.receiver && message.receiver.toString() === socket.userId) {
          message.read = true;
          message.readAt = new Date();
          await message.save();
          
          // Notify sender that message was read
          io.to(`user_${message.sender}`).emit('message_read', {
            messageId: message._id,
            readAt: message.readAt
          });
        }
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.user.username || socket.user.email} - Socket ID: ${socket.id}`);
      
      // Emit offline status
      socket.broadcast.emit('user_offline', {
        userId: socket.userId,
        username: socket.user.username || socket.user.email
      });
    });
  });

  return io;
}

// Helper function to check if two users can chat based on their roles
function canUsersChat(senderRole, receiverRole) {
  // Admin (manager) chỉ chat với nhân viên (employee)
  if (senderRole === 'manager') {
    return receiverRole === 'employee';
  }
  
  // Nhân viên (employee) chỉ chat với admin (manager) và kế toán (accountant)
  if (senderRole === 'employee') {
    return receiverRole === 'manager' || receiverRole === 'accountant';
  }
  
  // Kế toán (accountant) chỉ chat với admin (manager) và nhân viên (employee)
  if (senderRole === 'accountant') {
    return receiverRole === 'manager' || receiverRole === 'employee';
  }
  
  return false;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initSocket first.');
  }
  return io;
}

module.exports = { initSocket, getIO };

