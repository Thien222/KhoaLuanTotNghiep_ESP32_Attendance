// Frontend Configuration
// This file now uses configManager for dynamic IP configuration
import { getAPIUrl, getESP32Url, getFrontendUrl, getConfig } from './utils/configManager';

const config = getConfig();

export const CONFIG = {
  API_URL: getAPIUrl(),
  ESP32_IP: config.esp32IP,
  FRONTEND_URL: getFrontendUrl(),
  ENDPOINTS: {
    EMPLOYEES: '/employees',
    ATTENDANCE: '/attendance',
    AUTH: '/auth',
    CONTRACT: '/contract',
    FINGERPRINT: '/fingerprint'
  }
};

export const API_URL = CONFIG.API_URL;
export const ESP32_IP = CONFIG.ESP32_IP;
export const FRONTEND_URL = CONFIG.FRONTEND_URL;

console.log('=================================');
console.log('🔍 Frontend Configuration:');
console.log('API_URL:', API_URL);
console.log('ESP32_IP:', ESP32_IP);
console.log('FRONTEND_URL:', FRONTEND_URL);
console.log('Server IP:', config.serverIP);
console.log('ESP32 IP:', config.esp32IP);
console.log('=================================');







