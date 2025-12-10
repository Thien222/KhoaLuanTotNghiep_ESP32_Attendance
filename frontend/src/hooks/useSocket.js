import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { getAPIUrl } from '../utils/configManager';

export const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token found, skipping socket connection');
      return;
    }

    const API_URL = getAPIUrl();
    // Remove /api if exists, Socket.IO connects to root
    let socketUrl = API_URL;
    if (socketUrl.includes('/api')) {
      socketUrl = socketUrl.replace('/api', '');
    }
    // Remove trailing slash
    socketUrl = socketUrl.replace(/\/$/, '');
    
    console.log('Connecting to Socket.IO at:', socketUrl);

    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket.IO connected');
      setConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      console.log('Closing Socket.IO connection');
      newSocket.close();
    };
  }, []);

  return { socket, connected };
};











