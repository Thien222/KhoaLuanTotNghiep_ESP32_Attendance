import { useState, useEffect } from 'react';
import { useSocket } from './useSocket';
import axios from 'axios';
import { getAPIUrl } from '../utils/configManager';

/**
 * Hook to manage unread message count
 * Listens to socket events and provides real-time unread count
 */
export const useUnreadCount = (userId) => {
    const [unreadCount, setUnreadCount] = useState(0);
    const { socket, connected } = useSocket();

    // Load initial unread count
    useEffect(() => {
        if (!userId) return;

        const loadUnreadCount = async () => {
            try {
                const API_URL = getAPIUrl();
                const token = localStorage.getItem('token');
                const response = await axios.get(`${API_URL}/internal-chat/unread-count`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data.success) {
                    setUnreadCount(response.data.unreadCount || 0);
                }
            } catch (error) {
                console.error('Error loading unread count:', error);
            }
        };

        loadUnreadCount();
    }, [userId]);

    // Listen for new messages via socket
    useEffect(() => {
        if (!socket || !connected || !userId) return;

        const handleNewMessage = (message) => {
            // Only increment if message is for us (we are receiver)
            const receiverId = message.receiver?._id || message.receiver;
            if (receiverId === userId) {
                setUnreadCount(prev => prev + 1);
            }
        };

        const handleMessageRead = ({ messageId }) => {
            // Decrement unread count when message is read
            setUnreadCount(prev => Math.max(0, prev - 1));
        };

        socket.on('new_message', handleNewMessage);
        socket.on('message_read', handleMessageRead);

        return () => {
            socket.off('new_message', handleNewMessage);
            socket.off('message_read', handleMessageRead);
        };
    }, [socket, connected, userId]);

    // Method to manually reset unread count
    const resetUnreadCount = () => {
        setUnreadCount(0);
    };

    // Method to decrement unread count
    const decrementUnreadCount = (count = 1) => {
        setUnreadCount(prev => Math.max(0, prev - count));
    };

    return {
        unreadCount,
        resetUnreadCount,
        decrementUnreadCount
    };
};
