import apiClient from './client';

/**
 * Admin API
 */
export const adminAPI = {
  /**
   * Get system-wide statistics
   * @returns {Promise} System stats (users, campaigns, messages, etc.)
   */
  getSystemStats: async () => {
    const response = await apiClient.get('/admin/stats');
    return response.data;
  },

  /**
   * Get all consultants with their statistics
   * @param {Object} params - Query parameters (page, limit, search, status)
   * @returns {Promise} Consultants list with pagination
   */
  getConsultants: async (params = {}) => {
    const response = await apiClient.get('/admin/consultants', { params });
    return response.data;
  },

  /**
   * Get consultant details by ID
   * @param {number} id - Consultant ID
   * @returns {Promise} Consultant details with statistics
   */
  getConsultant: async (id) => {
    const response = await apiClient.get(`/admin/consultants/${id}`);
    return response.data;
  },

  /**
   * Update consultant status (active/inactive)
   * @param {number} id - Consultant ID
   * @param {Object} data - Status update data {isActive: boolean}
   * @returns {Promise} Updated consultant
   */
  updateConsultantStatus: async (id, data) => {
    const response = await apiClient.put(`/admin/consultants/${id}`, data);
    return response.data;
  },

  /**
   * Get system activity logs
   * @param {Object} params - Query parameters (page, limit, userId, action)
   * @returns {Promise} Activity logs with pagination
   */
  getActivityLogs: async (params = {}) => {
    const response = await apiClient.get('/admin/logs', { params });
    return response.data;
  },
};

export default adminAPI;
