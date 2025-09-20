import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching
    config.params = {
      ...config.params,
      _t: Date.now()
    };
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      const errorData = error.response.data;
      return Promise.reject({
        message: errorData.message || 'Server error',
        status: error.response.status,
        code: errorData.code,
        ...errorData
      });
    } else if (error.request) {
      // Request was made but no response received
      return Promise.reject({
        message: 'Network error - please check your connection',
        status: 0,
        code: 'NETWORK_ERROR'
      });
    } else {
      // Something else happened
      return Promise.reject({
        message: error.message || 'Unknown error',
        status: 0,
        code: 'UNKNOWN_ERROR'
      });
    }
  }
);

/**
 * Authentication API service
 */
export const authAPI = {
  /**
   * Verify JWT token
   * @param {string} token - Access token to verify
   * @returns {Promise<Object>} API response
   */
  verifyToken: async (token) => {
    try {
      const response = await api.get('/api/auth/verify-token', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response;
    } catch (error) {
      console.error('Token verification failed:', error);
      throw error;
    }
  },

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} API response with new access token
   */
  refreshToken: async (refreshToken) => {
    try {
      const response = await api.post('/api/auth/refresh', {
        refreshToken
      });
      return response;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  },

  /**
   * Get user profile
   * @param {string} token - Access token
   * @returns {Promise<Object>} API response with user data
   */
  getProfile: async (token) => {
    try {
      const response = await api.get('/api/auth/profile', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response;
    } catch (error) {
      console.error('Get profile failed:', error);
      throw error;
    }
  },

  /**
   * Update user profile
   * @param {Object} profileData - Profile data to update
   * @param {string} token - Access token
   * @returns {Promise<Object>} API response
   */
  updateProfile: async (profileData, token) => {
    try {
      const response = await api.put('/api/auth/profile', profileData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response;
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  },

  /**
   * Logout user
   * @param {string} token - Access token
   * @returns {Promise<Object>} API response
   */
  logout: async (token) => {
    try {
      const response = await api.post('/api/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response;
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  },

  /**
   * Initiate Google OAuth login
   * @returns {string} Google OAuth URL
   */
  getGoogleAuthUrl: () => {
    return `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/google`;
  }
};

export default api;