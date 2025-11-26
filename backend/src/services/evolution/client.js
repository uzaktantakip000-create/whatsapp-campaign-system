const axios = require('axios');
const logger = require('../../utils/logger');

/**
 * Evolution API Client
 * Handles all communication with Evolution API for WhatsApp operations
 */
class EvolutionClient {
  constructor() {
    this.baseURL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
    this.apiKey = process.env.EVOLUTION_API_KEY;

    if (!this.apiKey) {
      logger.error('[Evolution] EVOLUTION_API_KEY not set in environment variables');
      throw new Error('EVOLUTION_API_KEY is required');
    }

    // Axios instance with default config
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'apikey': this.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    // Request interceptor (logging)
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`[Evolution] ${config.method.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error(`[Evolution] Request error: ${error.message}`);
        return Promise.reject(error);
      }
    );

    // Response interceptor (error handling)
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`[Evolution] Response ${response.status}: ${response.config.url}`);
        return response;
      },
      (error) => {
        if (error.response) {
          logger.error(`[Evolution] Error ${error.response.status}: ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
          logger.error(`[Evolution] No response received: ${error.message}`);
        } else {
          logger.error(`[Evolution] Request setup error: ${error.message}`);
        }
        return Promise.reject(error);
      }
    );

    logger.info(`[Evolution] Client initialized with base URL: ${this.baseURL}`);
  }

  // ==========================================
  // INSTANCE MANAGEMENT
  // ==========================================

  /**
   * Create a new WhatsApp instance
   * @param {string} instanceName - Unique instance name
   * @param {boolean} qrcode - Whether to return QR code
   * @returns {Promise<Object>} Instance data with QR code
   */
  async createInstance(instanceName, qrcode = true) {
    try {
      logger.info(`[Evolution] Creating instance: ${instanceName}`);

      const response = await this.client.post('/instance/create', {
        instanceName: instanceName,
        qrcode: qrcode,
        integration: 'WHATSAPP-BAILEYS'
      });

      logger.info(`[Evolution] Instance created successfully: ${instanceName}`);
      return response.data;

    } catch (error) {
      logger.error(`[Evolution] Failed to create instance ${instanceName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get instance connection state
   * @param {string} instanceName - Instance name
   * @returns {Promise<Object>} Connection state
   */
  async getInstanceStatus(instanceName) {
    try {
      const response = await this.client.get(`/instance/connectionState/${instanceName}`);
      logger.debug(`[Evolution] Instance status for ${instanceName}: ${response.data.state}`);
      return response.data;
    } catch (error) {
      logger.error(`[Evolution] Failed to get status for ${instanceName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get QR code for instance
   * @param {string} instanceName - Instance name
   * @returns {Promise<Object>} QR code data
   */
  async getQRCode(instanceName) {
    try {
      logger.info(`[Evolution] Fetching QR code for: ${instanceName}`);
      const response = await this.client.get(`/instance/connect/${instanceName}`);
      return response.data;
    } catch (error) {
      logger.error(`[Evolution] Failed to get QR code for ${instanceName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Logout instance
   * @param {string} instanceName - Instance name
   * @returns {Promise<Object>} Logout result
   */
  async logoutInstance(instanceName) {
    try {
      logger.info(`[Evolution] Logging out instance: ${instanceName}`);
      const response = await this.client.delete(`/instance/logout/${instanceName}`);
      logger.info(`[Evolution] Instance logged out: ${instanceName}`);
      return response.data;
    } catch (error) {
      logger.error(`[Evolution] Failed to logout ${instanceName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete instance
   * @param {string} instanceName - Instance name
   * @returns {Promise<Object>} Delete result
   */
  async deleteInstance(instanceName) {
    try {
      logger.info(`[Evolution] Deleting instance: ${instanceName}`);
      const response = await this.client.delete(`/instance/delete/${instanceName}`);
      logger.info(`[Evolution] Instance deleted: ${instanceName}`);
      return response.data;
    } catch (error) {
      logger.error(`[Evolution] Failed to delete ${instanceName}: ${error.message}`);
      throw error;
    }
  }

  // ==========================================
  // MESSAGE OPERATIONS
  // ==========================================

  /**
   * Send text message
   * @param {string} instanceName - Instance name
   * @param {string} number - Recipient number (with country code)
   * @param {string} text - Message text
   * @returns {Promise<Object>} Message send result
   */
  async sendTextMessage(instanceName, number, text) {
    try {
      logger.info(`[Evolution] Sending message from ${instanceName} to ${number}`);

      const response = await this.client.post(`/message/sendText/${instanceName}`, {
        number: number,
        text: text
      });

      logger.info(`[Evolution] Message sent successfully to ${number}`);
      return response.data;

    } catch (error) {
      logger.error(`[Evolution] Failed to send message to ${number}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send typing status
   * @param {string} instanceName - Instance name
   * @param {string} number - Recipient number
   * @param {number} delay - Typing delay in milliseconds
   * @returns {Promise<Object>} Result
   */
  async sendTyping(instanceName, number, delay = 3000) {
    try {
      logger.debug(`[Evolution] Sending typing indicator to ${number} for ${delay}ms`);

      const response = await this.client.post(`/chat/sendPresence/${instanceName}`, {
        number: number,
        presence: 'composing',
        delay: delay
      });

      return response.data;
    } catch (error) {
      logger.error(`[Evolution] Failed to send typing to ${number}: ${error.message}`);
      throw error;
    }
  }

  // ==========================================
  // CONTACT OPERATIONS
  // ==========================================

  /**
   * Fetch all CHATS (not contacts) from instance
   * CRITICAL: This fetches the chat list (sohbetler) NOT the contact list (rehber)
   * @param {string} instanceName - Instance name
   * @returns {Promise<Array>} Array of chats (people you've messaged with)
   */
  async fetchContacts(instanceName) {
    try {
      logger.info(`[Evolution] Fetching CHATS (sohbetler, NOT contact list) for: ${instanceName}`);

      // Evolution API v2 - fetch chat list (sohbetler ekranı)
      const response = await this.client.post(`/chat/findChats/${instanceName}`, {});

      // Filter and format chats
      const contacts = response.data
        .filter(c => {
          if (!c.remoteJid) return false;
          if (c.remoteJid.includes('@g.us')) return false; // Exclude groups

          const number = c.remoteJid.split('@')[0];
          // Exclude invalid numbers (0, empty, null)
          if (!number || number === '0' || number === 'null' || number.trim() === '') {
            return false;
          }

          return true;
        })
        .map(c => {
          const number = c.remoteJid.split('@')[0];

          // Clean name: remove "None" strings and empty values
          let name = null;
          if (c.pushName && c.pushName !== 'None' && c.pushName.trim() !== '') {
            name = c.pushName.trim();
          } else if (c.name && c.name !== 'None' && c.name.trim() !== '') {
            name = c.name.trim();
          }

          // If no name, use phone number as name
          const finalName = name || number;

          return {
            number: number,
            name: finalName,
            profilePicUrl: c.profilePicUrl || null,
            remoteJid: c.remoteJid,
            createdAt: c.createdAt, // First message date
            updatedAt: c.updatedAt  // Last message date
          };
        });

      logger.info(`[Evolution] Fetched ${contacts.length} CHATS from ${instanceName} (chat list, NOT rehber)`);
      return contacts;

    } catch (error) {
      logger.error(`[Evolution] Failed to fetch chats for ${instanceName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if number is registered on WhatsApp
   * @param {string} instanceName - Instance name
   * @param {string} number - Phone number to check
   * @returns {Promise<boolean>} Is registered
   */
  async isNumberRegistered(instanceName, number) {
    try {
      logger.debug(`[Evolution] Checking if ${number} is registered on WhatsApp`);

      const response = await this.client.get(`/chat/whatsappNumbers/${instanceName}`, {
        params: { numbers: [number] }
      });

      const isRegistered = response.data?.[0]?.exists || false;
      logger.debug(`[Evolution] Number ${number} registered: ${isRegistered}`);

      return isRegistered;
    } catch (error) {
      logger.error(`[Evolution] Failed to check number ${number}: ${error.message}`);
      return false;
    }
  }

  // ==========================================
  // WEBHOOK OPERATIONS
  // ==========================================

  /**
   * Set webhook URL for instance
   * @param {string} instanceName - Instance name
   * @param {string} webhookUrl - Webhook URL
   * @param {Array} events - Events to subscribe to (must be uppercase)
   * @returns {Promise<Object>} Result
   */
  async setWebhook(instanceName, webhookUrl, events = ['MESSAGES_UPSERT', 'CONNECTION_UPDATE']) {
    try {
      logger.info(`[Evolution] Setting webhook for ${instanceName}: ${webhookUrl}`);

      const response = await this.client.post(`/webhook/set/${instanceName}`, {
        webhook: {
          url: webhookUrl,
          events: events,
          webhook_by_events: true,
          enabled: true
        }
      });

      logger.info(`[Evolution] Webhook set successfully for ${instanceName}`);
      return response.data;

    } catch (error) {
      logger.error(`[Evolution] Failed to set webhook for ${instanceName}: ${error.message}`);
      throw error;
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Test Evolution API connection
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    try {
      logger.info('[Evolution] Testing API connection...');
      const response = await this.client.get('/');

      if (response.status === 200) {
        logger.info('[Evolution] API connection successful');
        logger.info(`[Evolution] API Version: ${response.data.version || 'unknown'}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`[Evolution] API connection failed: ${error.message}`);
      return false;
    }
  }
}

// Export singleton instance
module.exports = new EvolutionClient();
