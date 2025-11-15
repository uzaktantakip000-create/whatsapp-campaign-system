import apiClient from './client';

/**
 * Consultants API
 */
export const consultantsAPI = {
  /**
   * Get consultant dashboard data
   * @returns {Promise} Dashboard data including stats, warmup, campaigns, charts
   */
  getDashboard: async () => {
    const response = await apiClient.get('/consultants/dashboard');
    return response.data;
  },
};

export default consultantsAPI;
