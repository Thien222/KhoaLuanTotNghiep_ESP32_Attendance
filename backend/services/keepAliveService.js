/**
 * Keep-Alive Service
 * Prevents Render Free Tier from sleeping by self-pinging every 10 minutes
 * (Only runs in production)
 */

const axios = require('axios');

class KeepAliveService {
  constructor() {
    this.interval = null;
    this.pingIntervalMinutes = 10; // Ping every 10 minutes
    this.backendUrl = null;
  }

  /**
   * Initialize keep-alive service
   * @param {string} backendUrl - The backend URL to ping
   */
  init(backendUrl) {
    // Only run in production environment
    if (process.env.NODE_ENV !== 'production') {
      console.log('⏭️  Keep-alive service skipped (not in production)');
      return;
    }

    if (!backendUrl) {
      console.warn('⚠️  Keep-alive service: No backend URL provided');
      return;
    }

    this.backendUrl = backendUrl;
    
    console.log('🟢 Keep-alive service initialized');
    console.log(`   URL: ${this.backendUrl}`);
    console.log(`   Interval: ${this.pingIntervalMinutes} minutes`);

    // Start pinging
    this.start();
  }

  /**
   * Start the keep-alive pinging
   */
  start() {
    if (this.interval) {
      console.log('⚠️  Keep-alive service already running');
      return;
    }

    // Ping immediately on start
    this.ping();

    // Then ping every N minutes
    const intervalMs = this.pingIntervalMinutes * 60 * 1000;
    this.interval = setInterval(() => {
      this.ping();
    }, intervalMs);

    console.log('✅ Keep-alive service started');
  }

  /**
   * Stop the keep-alive pinging
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('🛑 Keep-alive service stopped');
    }
  }

  /**
   * Ping the backend
   */
  async ping() {
    try {
      const startTime = Date.now();
      const response = await axios.get(`${this.backendUrl}/healthz`, {
        timeout: 5000
      });
      
      const duration = Date.now() - startTime;
      
      if (response.data && response.data.ok) {
        console.log(`💚 Keep-alive ping successful (${duration}ms) - ${new Date().toLocaleString()}`);
      } else {
        console.warn(`⚠️  Keep-alive ping: Unexpected response`, response.data);
      }
    } catch (error) {
      console.error(`❌ Keep-alive ping failed:`, error.message);
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      running: this.interval !== null,
      backendUrl: this.backendUrl,
      pingIntervalMinutes: this.pingIntervalMinutes,
      isProduction: process.env.NODE_ENV === 'production'
    };
  }
}

// Export singleton instance
module.exports = new KeepAliveService();
