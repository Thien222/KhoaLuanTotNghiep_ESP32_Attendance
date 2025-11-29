// API Configuration
// Default to localhost, user can change in app settings
const DEFAULT_API_URL = 'http://192.168.2.28:3000/api';

export const getAPIUrl = () => {
  // Try to get from AsyncStorage, fallback to default
  return DEFAULT_API_URL;
};

export const API_CONFIG = {
  baseURL: DEFAULT_API_URL,
  timeout: 10000,
};







