import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAPIUrl } from '../config';

// Create axios instance
const api = axios.create({
  baseURL: getAPIUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add token to headers
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: async (username, password) => {
    const response = await api.post('/auth/login', {
      email: username, // Backend accepts both email and username
      password,
    });
    return response.data;
  },
  
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },
  
  changePassword: async (currentPassword, newPassword) => {
    const response = await api.put('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
};

// Attendance APIs
export const attendanceAPI = {
  getMyAttendance: async (startDate, endDate) => {
    const response = await api.get('/attendance', {
      params: {
        startDate,
        endDate,
      },
    });
    return response.data;
  },
  
  getTodayAttendance: async () => {
    const response = await api.get('/attendance/today');
    return response.data;
  },
  
  addAttendance: async (type) => {
    const response = await api.post('/attendance/add', {
      type, // 'checkin' or 'checkout'
    });
    return response.data;
  },
};

// Payroll APIs
export const payrollAPI = {
  getMyPayroll: async (month, year) => {
    const response = await api.get('/payroll', {
      params: {
        month,
        year,
      },
    });
    return response.data;
  },
};

// Leave APIs
export const leaveAPI = {
  getMyLeaves: async () => {
    const response = await api.get('/leave');
    return response.data;
  },
  
  applyLeave: async (leaveData) => {
    const response = await api.post('/leave/apply', leaveData);
    return response.data;
  },
  
  getLeaveStats: async () => {
    const response = await api.get('/leave/stats');
    return response.data;
  },
  
  cancelLeave: async (leaveId) => {
    const response = await api.delete(`/leave/${leaveId}`);
    return response.data;
  },
};

// Employee APIs
export const employeeAPI = {
  getMyProfile: async () => {
    const response = await api.get('/employees/profile/me');
    return response.data;
  },
  
  updateMyProfile: async (profileData) => {
    const response = await api.put('/employees/profile/me', profileData);
    return response.data;
  },
  
  completeProfile: async (profileData) => {
    const response = await api.post('/employees/profile/complete', profileData);
    return response.data;
  },
};

export default api;



