import apiClient from './client';

/**
 * Campaigns API
 */
export const campaignsAPI = {
  /**
   * Get all campaigns with filters
   * @param {Object} params - Query parameters (page, limit, status, search)
   * @returns {Promise} Campaigns list
   */
  getCampaigns: async (params = {}) => {
    const response = await apiClient.get('/campaigns', { params });
    return response.data;
  },

  /**
   * Get campaign by ID
   * @param {number} id - Campaign ID
   * @returns {Promise} Campaign details
   */
  getCampaign: async (id) => {
    const response = await apiClient.get(`/campaigns/${id}`);
    return response.data;
  },

  /**
   * Create new campaign
   * @param {Object} data - Campaign data
   * @returns {Promise} Created campaign
   */
  createCampaign: async (data) => {
    const response = await apiClient.post('/campaigns', data);
    return response.data;
  },

  /**
   * Update campaign
   * @param {number} id - Campaign ID
   * @param {Object} data - Updated campaign data
   * @returns {Promise} Updated campaign
   */
  updateCampaign: async (id, data) => {
    const response = await apiClient.put(`/campaigns/${id}`, data);
    return response.data;
  },

  /**
   * Delete campaign
   * @param {number} id - Campaign ID
   * @returns {Promise} Delete response
   */
  deleteCampaign: async (id) => {
    const response = await apiClient.delete(`/campaigns/${id}`);
    return response.data;
  },

  /**
   * Start campaign
   * @param {number} id - Campaign ID
   * @returns {Promise} Start response
   */
  startCampaign: async (id) => {
    const response = await apiClient.post(`/campaigns/${id}/start`);
    return response.data;
  },

  /**
   * Pause campaign (renamed from stopCampaign to match backend)
   * @param {number} id - Campaign ID
   * @returns {Promise} Pause response
   */
  pauseCampaign: async (id) => {
    const response = await apiClient.post(`/campaigns/${id}/pause`);
    return response.data;
  },

  /**
   * Stop campaign (alias for pauseCampaign for backward compatibility)
   * @param {number} id - Campaign ID
   * @returns {Promise} Stop response
   */
  stopCampaign: async (id) => {
    const response = await apiClient.post(`/campaigns/${id}/pause`);
    return response.data;
  },

  /**
   * Add recipients to campaign
   * @param {number} id - Campaign ID
   * @param {Object} data - Recipients data (contactIds or segmentFilter)
   * @returns {Promise} Add recipients response
   */
  addRecipients: async (id, data) => {
    const response = await apiClient.post(`/campaigns/${id}/recipients`, data);
    return response.data;
  },

  /**
   * Get campaign recipients
   * @param {number} id - Campaign ID
   * @param {Object} params - Query parameters (page, limit, status)
   * @returns {Promise} Recipients list
   */
  getCampaignRecipients: async (id, params = {}) => {
    const response = await apiClient.get(`/campaigns/${id}/recipients`, { params });
    return response.data;
  },

  /**
   * Remove recipient from campaign
   * @param {number} id - Campaign ID
   * @param {number} contactId - Contact ID
   * @returns {Promise} Remove recipient response
   */
  removeRecipient: async (id, contactId) => {
    const response = await apiClient.delete(`/campaigns/${id}/recipients/${contactId}`);
    return response.data;
  },

  /**
   * Get campaign messages
   * @param {number} id - Campaign ID
   * @returns {Promise} Messages list
   */
  getCampaignMessages: async (id) => {
    const response = await apiClient.get(`/campaigns/${id}/messages`);
    return response.data;
  },
};

export default campaignsAPI;
