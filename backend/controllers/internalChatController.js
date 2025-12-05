const InternalMessage = require('../models/InternalMessage');
const User = require('../models/User');

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

// Get conversation between two users
exports.getConversation = async (req, res) => {
  try {
    const { receiverId } = req.params;
    const senderId = req.user._id || req.user.id;
    const senderRole = req.user.role;

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: 'Receiver ID is required'
      });
    }

    // Validate role-based chat permissions
    const receiver = await User.findById(receiverId).select('role');
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }

    if (!canUsersChat(senderRole, receiver.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền chat với người dùng này'
      });
    }

    // Get messages between sender and receiver
    const messages = await InternalMessage.find({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId }
      ]
    })
      .populate('sender', 'username email employee')
      .populate('receiver', 'username email employee')
      .sort({ createdAt: 1 })
      .limit(100); // Limit to last 100 messages

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching conversation',
      error: error.message
    });
  }
};

// Get all conversations for current user
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const senderRole = req.user.role;

    // Get distinct conversations
    const conversations = await InternalMessage.aggregate([
      {
        $match: {
          $or: [
            { sender: userId },
            { receiver: userId }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', userId] },
              '$receiver',
              '$sender'
            ]
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$receiver', userId] }, { $eq: ['$read', false] }] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          userId: '$_id',
          username: '$user.username',
          email: '$user.email',
          role: '$user.role',
          lastMessage: 1,
          unreadCount: 1,
          lastMessageTime: '$lastMessage.createdAt'
        }
      },
      {
        $sort: { lastMessageTime: -1 }
      }
    ]);

    // Filter conversations based on role permissions
    const filteredConversations = conversations.filter(conv => {
      if (!conv.role) return false;
      return canUsersChat(senderRole, conv.role);
    });

    res.json({
      success: true,
      data: filteredConversations
    });
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching conversations',
      error: error.message
    });
  }
};

// Get group chat messages
exports.getGroupMessages = async (req, res) => {
  try {
    const { room } = req.params;
    const userId = req.user._id || req.user.id;

    if (!room) {
      return res.status(400).json({
        success: false,
        message: 'Room ID is required'
      });
    }

    // Verify user has access to this room (e.g., role-based)
    const user = await User.findById(userId);
    if (room.startsWith('role_') && !room.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this room'
      });
    }

    const messages = await InternalMessage.find({ room })
      .populate('sender', 'username email employee')
      .sort({ createdAt: 1 })
      .limit(100);

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Error getting group messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching group messages',
      error: error.message
    });
  }
};

// Mark messages as read
exports.markAsRead = async (req, res) => {
  try {
    const { messageIds } = req.body;
    const userId = req.user._id || req.user.id;

    if (!messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({
        success: false,
        message: 'Message IDs array is required'
      });
    }

    await InternalMessage.updateMany(
      {
        _id: { $in: messageIds },
        receiver: userId,
        read: false
      },
      {
        $set: {
          read: true,
          readAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking messages as read',
      error: error.message
    });
  }
};

// Get unread message count
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const count = await InternalMessage.countDocuments({
      receiver: userId,
      read: false
    });

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unread count',
      error: error.message
    });
  }
};

// Send message (REST endpoint for mobile)
exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user._id || req.user.id;
    const senderRole = req.user.role;

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: 'Receiver ID is required'
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message content cannot be empty'
      });
    }

    // Validate role-based chat permissions
    const receiver = await User.findById(receiverId).select('role');
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }

    if (!canUsersChat(senderRole, receiver.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền chat với người dùng này'
      });
    }

    // Create message in database
    const message = new InternalMessage({
      sender: senderId,
      receiver: receiverId,
      content: content.trim(),
      type: 'text'
    });

    await message.save();

    // Populate sender and receiver for response
    await message.populate('sender', 'username email employee');
    await message.populate('receiver', 'username email employee');

    res.json({
      success: true,
      data: message,
      message: 'Message sent successfully'
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message',
      error: error.message
    });
  }
};


