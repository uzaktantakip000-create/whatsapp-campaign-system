import { create } from 'zustand';
import { authAPI } from '../api/auth';

/**
 * Authentication Store
 * Manages user authentication state
 */
const useAuthStore = create((set, get) => ({
  // State
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Initialize auth from localStorage
  initialize: () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({
          user,
          token,
          isAuthenticated: true
        });
      } catch (error) {
        // Invalid data in localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  },

  // Login action
  login: async (credentials) => {
    set({ isLoading: true, error: null });

    try {
      const response = await authAPI.login(credentials);
      const { data } = response;

      // Save to localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.consultant));

      set({
        user: data.consultant,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return { success: true };
    } catch (error) {
      set({
        isLoading: false,
        error: error.message || 'Login failed',
      });
      return { success: false, error: error.message };
    }
  },

  // Register action
  register: async (userData) => {
    set({ isLoading: true, error: null });

    try {
      const response = await authAPI.register(userData);
      const { data } = response;

      // Auto-login after registration
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.consultant));

      set({
        user: data.consultant,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return { success: true };
    } catch (error) {
      set({
        isLoading: false,
        error: error.message || 'Registration failed',
      });
      return { success: false, error: error.message };
    }
  },

  // Logout action
  logout: async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Continue with logout even if API fails
      console.error('Logout API error:', error);
    }

    // Clear state and localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  // Fetch current user
  fetchUser: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await authAPI.me();
      const { data } = response;

      // Update user in localStorage
      localStorage.setItem('user', JSON.stringify(data));

      set({
        user: data,
        isLoading: false,
        error: null,
      });

      return { success: true };
    } catch (error) {
      set({
        isLoading: false,
        error: error.message || 'Failed to fetch user',
      });

      // If unauthorized, clear auth
      if (error.status === 401) {
        get().logout();
      }

      return { success: false, error: error.message };
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));

export default useAuthStore;
