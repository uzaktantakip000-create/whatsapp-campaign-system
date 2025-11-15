import apiClient from './client';

/**
 * Contacts API
 */
export const contactsAPI = {
  /**
   * Get all contacts with pagination and filters
   * @param {Object} params - Query parameters (page, limit, search, sortBy, sortOrder)
   * @returns {Promise} Contacts list with pagination
   */
  getContacts: async (params = {}) => {
    const response = await apiClient.get('/contacts', { params });
    return response.data;
  },

  /**
   * Get contact by ID
   * @param {number} id - Contact ID
   * @returns {Promise} Contact details
   */
  getContact: async (id) => {
    const response = await apiClient.get(`/contacts/${id}`);
    return response.data;
  },

  /**
   * Create new contact
   * @param {Object} data - Contact data
   * @returns {Promise} Created contact
   */
  createContact: async (data) => {
    const response = await apiClient.post('/contacts', data);
    return response.data;
  },

  /**
   * Update existing contact
   * @param {number} id - Contact ID
   * @param {Object} data - Updated contact data
   * @returns {Promise} Updated contact
   */
  updateContact: async (id, data) => {
    const response = await apiClient.put(`/contacts/${id}`, data);
    return response.data;
  },

  /**
   * Delete contact
   * @param {number} id - Contact ID
   * @returns {Promise} Delete response
   */
  deleteContact: async (id) => {
    const response = await apiClient.delete(`/contacts/${id}`);
    return response.data;
  },

  /**
   * Sync contacts from WhatsApp
   * @returns {Promise} Sync results (inserted, updated counts)
   */
  syncContacts: async () => {
    const response = await apiClient.post('/contacts/sync');
    return response.data;
  },

  /**
   * Bulk delete contacts
   * @param {Array} ids - Array of contact IDs
   * @returns {Promise} Bulk delete response
   */
  bulkDelete: async (ids) => {
    const response = await apiClient.post('/contacts/bulk-delete', { ids });
    return response.data;
  },

  /**
   * Export contacts to CSV
   * @param {Array} ids - Array of contact IDs (optional, exports all if empty)
   * @returns {Promise} CSV data
   */
  exportContacts: async (ids = []) => {
    const response = await apiClient.post('/contacts/export', { ids }, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default contactsAPI;
