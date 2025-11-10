import axios from 'axios';
import { getAPIUrl, getESP32Url } from '../utils/configManager';

// Backend running on port 3000
// Use dynamic config from localStorage
export const API_URL = getAPIUrl();
export const ESP32_IP = getESP32Url().replace('http://', '');

// Chat API
export const chatApi = {
  send: async (message) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_URL}/chat/message`, {
      message
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  }
};