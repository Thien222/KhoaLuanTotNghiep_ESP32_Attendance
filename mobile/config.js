// API Configuration
// Production backend URL (Deployed on Render)
const PRODUCTION_API_URL = 'https://khoaluantotnghiep-esp32-attendance.onrender.com/api';

// Development backend URL (Local network)
const DEVELOPMENT_API_URL = 'http://192.168.1.164:3000/api';

// Switch between development and production
// Set to false for production builds (default)
// Set to true for local development
const IS_DEV_MODE = false;

export const getAPIUrl = () => {
  const url = IS_DEV_MODE ? DEVELOPMENT_API_URL : PRODUCTION_API_URL;
  console.log('🌐 API URL:', url);
  return url;
};

export const API_CONFIG = {
  baseURL: getAPIUrl(),
  timeout: 30000, // 30 seconds (Render free tier may need time to wake up)
};

// Hướng dẫn:
// - Production (deployed app): IS_DEV_MODE = false
// - Development (local testing): IS_DEV_MODE = true






