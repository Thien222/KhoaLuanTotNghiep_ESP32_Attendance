// IP Configuration Manager
// Allows easy switching between different network environments

const CONFIG_KEY = 'hr_system_config';

// Production backend URL - Deployed on Render
const PRODUCTION_API_URL = process.env.REACT_APP_API_URL || 'https://khoaluantotnghiep-esp32-attendance.onrender.com/api';

// Check if running in production (Vercel, Netlify, etc.)
const isProduction = process.env.NODE_ENV === 'production' ||
  window.location.hostname !== 'localhost';

const DEFAULT_CONFIG = {
  serverIP: 'localhost',  // Default to localhost
  esp32IP: '192.168.1.101',   // Example ESP32 IP
  serverPort: '3000',
  frontendPort: '3001'
};

// Get current configuration from localStorage or return default
export const getConfig = () => {
  try {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
  return DEFAULT_CONFIG;
};

// Save configuration to localStorage
export const saveConfig = (config) => {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
};

// Reset to default configuration
export const resetConfig = () => {
  localStorage.removeItem(CONFIG_KEY);
  return DEFAULT_CONFIG;
};

// Get API URL
export const getAPIUrl = () => {
  // In production, use the configured production API URL
  if (isProduction) {
    return PRODUCTION_API_URL;
  }
  // In development, use localStorage config
  const config = getConfig();
  return `http://${config.serverIP}:${config.serverPort}/api`;
};

// Get ESP32 URL
export const getESP32Url = () => {
  const config = getConfig();
  return `http://${config.esp32IP}`;
};

// Get Local API URL (always from localStorage config, regardless of production/development)
// Used for Time Machine sync with local ESP32
// Priority: 1. Environment variable, 2. localStorage config, 3. Default localhost
export const getLocalAPIUrl = () => {
  // Check environment variable first (for deployed frontend)
  if (process.env.REACT_APP_LOCAL_API_URL) {
    return process.env.REACT_APP_LOCAL_API_URL;
  }

  // Use localStorage config
  const config = getConfig();

  // If serverIP is not localhost and exists, use it
  if (config.serverIP && config.serverIP !== 'localhost') {
    return `http://${config.serverIP}:${config.serverPort}/api`;
  }

  // Default to localhost
  return `http://localhost:${config.serverPort || '3000'}/api`;
};

// Get Frontend URL
export const getFrontendUrl = () => {
  const config = getConfig();
  return `http://${config.serverIP}:${config.frontendPort}`;
};

// Preset configurations for different environments
export const PRESETS = {
  local: {
    name: 'Local Network',
    serverIP: '192.168.1.100',
    esp32IP: '192.168.1.101',
    serverPort: '3000',
    frontendPort: '3001'
  },
  cafe: {
    name: 'Quán Cà Phê',
    serverIP: '192.168.1.100', // Example - user will set this
    esp32IP: '192.168.1.101', // Example - user will set this
    serverPort: '3000',
    frontendPort: '3001'
  },
  office: {
    name: 'Văn Phòng',
    serverIP: '192.168.0.100', // Example
    esp32IP: '192.168.0.101', // Example
    serverPort: '3000',
    frontendPort: '3001'
  },
  localhost: {
    name: 'Localhost (Development)',
    serverIP: 'localhost',
    esp32IP: '192.168.1.100', // ESP32 IP on local network
    serverPort: '3000',
    frontendPort: '3001'
  }
};

// Apply a preset configuration
export const applyPreset = (presetKey) => {
  const preset = PRESETS[presetKey];
  if (preset) {
    saveConfig(preset);
    return preset;
  }
  return null;
};

// Test connection to server
export const testServerConnection = async (serverIP, serverPort = '3000') => {
  try {
    const response = await fetch(`http://${serverIP}:${serverPort}/healthz`, {
      method: 'GET',
      timeout: 3000
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

// Test connection to ESP32
export const testESP32Connection = async (esp32IP) => {
  if (!esp32IP || esp32IP.trim() === '') {
    console.warn('ESP32 IP is empty');
    return false;
  }

  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout

    const response = await fetch(`http://${esp32IP}/healthz`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      console.log('ESP32 health check OK:', data);
      return true;
    } else {
      console.warn(`ESP32 health check failed: HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('ESP32 connection timeout');
    } else {
      console.warn('ESP32 connection error:', error.message);
    }
    return false;
  }
};

// Auto-detect server IP (try common IPs)
export const autoDetectServerIP = async () => {
  const commonIPs = [
    'localhost',
    '192.168.1.100',
    '192.168.0.100',
    '10.0.0.100',
    '127.0.0.1'
  ];

  for (const ip of commonIPs) {
    const isConnected = await testServerConnection(ip);
    if (isConnected) {
      return ip;
    }
  }
  return null;
};

