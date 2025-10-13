import axios from 'axios';

// Backend running on port 3000
const API_URL = 'http://localhost:3000/api';

console.log('=================================');
console.log('🔍 API Configuration:');
console.log('API_URL:', API_URL);
console.log('=================================');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log('📤 API Request:', config.method.toUpperCase(), config.baseURL + config.url);
    console.log('📤 Request data:', config.data);
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.status, response.data);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error('❌ Response error:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url
      });
      const message = error.response.data?.message || 'Server error occurred';
      return Promise.reject(new Error(message));
    } else if (error.request) {
      console.error('❌ No response from server. Is backend running on port 3000?');
      return Promise.reject(new Error('Cannot connect to server. Please check if backend is running on port 3000.'));
    } else {
      console.error('❌ Request setup error:', error.message);
      return Promise.reject(error);
    }
  }
);

// Employee APIs
export const employeeApi = {
  addEmployee: async (employeeData) => {
    try {
      console.log('🚀 Calling addEmployee with:', employeeData);
      const response = await api.post('/employees', employeeData);
      return response.data;
    } catch (error) {
      console.error('❌ addEmployee error:', error);
      throw error;
    }
  },
  
  getAllEmployees: async () => {
    try {
      const response = await api.get('/employees');
      return response.data;
    } catch (error) {
      console.error('❌ getAllEmployees error:', error);
      throw error;
    }
  },
  
  getEmployeeById: async (id) => {
    try {
      const response = await api.get(`/employees/${id}`);
      return response.data;
    } catch (error) {
      console.error('❌ getEmployeeById error:', error);
      throw error;
    }
  },
  
  updateEmployee: async (id, employeeData) => {
    try {
      const response = await api.put(`/employees/${id}`, employeeData);
      return response.data;
    } catch (error) {
      console.error('❌ updateEmployee error:', error);
      throw error;
    }
  },
  
  deleteEmployee: async (id) => {
    try {
      const response = await api.delete(`/employees/${id}`);
      return response.data;
    } catch (error) {
      console.error('❌ deleteEmployee error:', error);
      throw error;
    }
  }
};

// Attendance APIs
export const attendanceApi = {
  addAttendance: async (attendanceData) => {
    try {
      const response = await api.post('/attendance/add', attendanceData);
      return response.data;
    } catch (error) {
      console.error('❌ addAttendance error:', error);
      throw error;
    }
  },

  getEmployeeAttendance: async (employeeId, startDate, endDate) => {
    try {
      const response = await api.get(`/attendance/employee/${employeeId}`, {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      console.error('❌ getEmployeeAttendance error:', error);
      throw error;
    }
  },
  
  getTodayAttendance: async () => {
    try {
      const response = await api.get('/attendance/today');
      return response.data;
    } catch (error) {
      console.error('❌ getTodayAttendance error:', error);
      throw error;
    }
  },
  
  getAllAttendance: async () => {
    try {
      const response = await api.get('/attendance/all');
      return response.data;
    } catch (error) {
      console.error('❌ getAllAttendance error:', error);
      throw error;
    }
  },
  
  handleFingerprint: async (fingerprintData) => {
    try {
      const response = await api.post('/attendance/fingerprint', fingerprintData);
      return response.data;
    } catch (error) {
      console.error('❌ handleFingerprint error:', error);
      throw error;
    }
  }
};

export default api;