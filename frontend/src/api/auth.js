import apiClient from './client';

/**
 * Authentication API functions
 */

export const authAPI = {
  /**
   * Register a new consultant
   * @param {Object} data - { name, email, password, phone }
   * @returns {Promise} Response with user data and token
   */
  register: async (data) => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  /**
   * Login consultant
   * @param {Object} credentials - { email, password }
   * @returns {Promise} Response with user data and token
   */
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  /**
   * Get current user info
   * @returns {Promise} Response with user data
   */
  me: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  /**
   * Logout current user
   * @returns {Promise} Response
   */
  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },
};

export default authAPI;
