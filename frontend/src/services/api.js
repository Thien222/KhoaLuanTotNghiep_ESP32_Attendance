import axios from 'axios';
import { getAPIUrl, getESP32Url } from '../utils/configManager';

// Backend running on port 3000
// Use dynamic config from localStorage
export const API_URL = getAPIUrl();
export const ESP32_IP = getESP32Url().replace('http://', '');

console.log('