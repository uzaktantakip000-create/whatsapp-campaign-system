import apiClient from './client';

/**
 * WhatsApp API
 */
export const whatsappAPI = {
  /**
   * Request QR code for WhatsApp connection
   * @returns {Promise} QR code data (base64 image)
   */
  connect: async () => {
    const response = await apiClient.post('/whatsapp/connect');
    return response.data;
  },

  /**
   * Get WhatsApp connection status
   * @returns {Promise} Connection status
   */
  getStatus: async () => {
    const response = await apiClient.get('/whatsapp/status');
    return response.data;
  },

  /**
   * Disconnect WhatsApp
   * @returns {Promise} Disconnect response
   */
  disconnect: async () => {
    const response = await apiClient.post('/whatsapp/disconnect');
    return response.data;
  },
};

export default whatsappAPI;
