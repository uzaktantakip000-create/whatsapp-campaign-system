import apiClient from './client';

/**
 * Templates API
 */
export const templatesAPI = {
  /**
   * Get all templates with pagination and filters
   * @param {Object} params - Query parameters (page, limit, search, category, is_active)
   * @returns {Promise} Templates list with pagination
   */
  getTemplates: async (params = {}) => {
    const response = await apiClient.get('/templates', { params });
    return response.data;
  },

  /**
   * Get template by ID
   * @param {number} id - Template ID
   * @returns {Promise} Template details
   */
  getTemplate: async (id) => {
    const response = await apiClient.get(`/templates/${id}`);
    return response.data;
  },

  /**
   * Create new template
   * @param {Object} data - Template data
   * @returns {Promise} Created template
   */
  createTemplate: async (data) => {
    const response = await apiClient.post('/templates', data);
    return response.data;
  },

  /**
   * Update template
   * @param {number} id - Template ID
   * @param {Object} data - Updated template data
   * @returns {Promise} Updated template
   */
  updateTemplate: async (id, data) => {
    const response = await apiClient.put(`/templates/${id}`, data);
    return response.data;
  },

  /**
   * Delete template
   * @param {number} id - Template ID
   * @returns {Promise} Delete response
   */
  deleteTemplate: async (id) => {
    const response = await apiClient.delete(`/templates/${id}`);
    return response.data;
  },

  /**
   * Preview template with variables
   * @param {number} id - Template ID
   * @param {Object} variables - Variables to render
   * @returns {Promise} Rendered template
   */
  previewTemplate: async (id, variables = {}) => {
    const response = await apiClient.post(`/templates/${id}/preview`, { variables });
    return response.data;
  },

  /**
   * Generate AI variations of template
   * @param {number} id - Template ID
   * @param {Object} options - Generation options (count, tone, context)
   * @returns {Promise} Generated variations
   */
  generateVariations: async (id, options = {}) => {
    const response = await apiClient.post(`/templates/${id}/variations`, options);
    return response.data;
  },

  /**
   * Improve template using AI
   * @param {number} id - Template ID
   * @param {Object} options - Improvement options (tone, goal)
   * @returns {Promise} Improved template
   */
  improveTemplate: async (id, options = {}) => {
    const response = await apiClient.post(`/templates/${id}/improve`, options);
    return response.data;
  },
};

export default templatesAPI;
