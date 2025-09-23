import axios from 'axios'
import { auth } from '../config/firebase'

// API service functions
// HTTP requests to the backend API will be handled here

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

// Create axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor to add Firebase ID token
api.interceptors.request.use(
  async (config) => {
    try {
      console.log('API Request interceptor - checking for auth token');
      
      // In development mode with auth disabled, create a dev token
      if (import.meta.env.VITE_DISABLE_AUTH === 'true') {
        let devToken = localStorage.getItem('devToken');
        if (!devToken) {
          // Create a simple dev token
          devToken = 'dev-token-' + Date.now();
          localStorage.setItem('devToken', devToken);
          console.log('Created dev token:', devToken);
        }
        config.headers.Authorization = `Bearer ${devToken}`;
        console.log('Using dev token for auth bypass');
      } else {
        // Get Firebase ID token if user is authenticated
        if (auth.currentUser) {
          console.log('Getting Firebase ID token');
          const idToken = await auth.currentUser.getIdToken();
          config.headers.Authorization = `Bearer ${idToken}`;
        } else {
          console.log('No Firebase current user found');
        }
      }
      
      console.log('Request headers:', config.headers);
    } catch (error) {
      console.error('Failed to get auth token:', error);
      // Continue without token - let backend handle unauthorized requests
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      console.log('API call returned 401, user may need to re-authenticate')
      
      // Don't automatically redirect - let the auth store handle this
      // The auth state listener will detect when the user is signed out
      // and update the isAuthenticated state accordingly
    }
    return Promise.reject(error)
  }
)

export { api }
export default api