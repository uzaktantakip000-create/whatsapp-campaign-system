import apiClient from './client';

/**
 * Messages API
 */
export const messagesAPI = {
  /**
   * Get all messages with pagination and filters
   * @param {Object} params - Query parameters (page, limit, campaignId, contactId, status, dateFrom, dateTo)
   * @returns {Promise} Messages list with pagination
   */
  getMessages: async (params = {}) => {
    const response = await apiClient.get('/messages', { params });
    return response.data;
  },

  /**
   * Get message by ID
   * @param {number} id - Message ID
   * @returns {Promise} Message details
   */
  getMessage: async (id) => {
    const response = await apiClient.get(`/messages/${id}`);
    return response.data;
  },

  /**
   * Get message statistics
   * @param {Object} params - Query parameters (campaignId, dateFrom, dateTo)
   * @returns {Promise} Message stats
   */
  getMessageStats: async (params = {}) => {
    const response = await apiClient.get('/messages/stats', { params });
    return response.data;
  },

  /**
   * Send a message
   * @param {Object} data - Message data
   * @returns {Promise} Send response
   */
  sendMessage: async (data) => {
    const response = await apiClient.post('/messages/send', data);
    return response.data;
  },
};

export default messagesAPI;
