import axios from 'axios';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  updateProfile
} from 'firebase/auth';
import { auth } from '../config/firebase';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3002',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add Firebase ID token
api.interceptors.request.use(
  async (config) => {
    // Add timestamp to prevent caching
    config.params = {
      ...config.params,
      _t: Date.now()
    };

    // Add Firebase ID token to requests
    if (auth.currentUser) {
      try {
        const idToken = await auth.currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${idToken}`;
      } catch (error) {
        console.error('Failed to get Firebase ID token:', error);
      }
    }

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
 * Firebase Authentication API service
 */
export const authAPI = {
  /**
   * Sign up with email and password using Firebase
   * @param {Object} data { name, email, password }
   * @returns {Promise<Object>} Firebase user and custom token
   */
  signup: async (data) => {
    try {
      const { name, email, password } = data;
      
      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update user profile with name
      await updateProfile(user, {
        displayName: name
      });
      
      // Get ID token for backend communication
      const idToken = await user.getIdToken();
      
      // Register user with backend
      const response = await api.post('/api/auth/firebase/register', {
        idToken,
        userData: {
          name,
          email,
          photoURL: user.photoURL
        }
      });
      
      return {
        success: true,
        data: {
          user: response.data.user,
          firebaseUser: user
        }
      };
    } catch (error) {
      console.error('Firebase signup failed:', error);
      throw {
        message: error.message || 'Signup failed',
        code: error.code || 'SIGNUP_ERROR'
      };
    }
  },

  /**
   * Sign in with email and password using Firebase
   * @param {Object} data { email, password }
   * @returns {Promise<Object>} Firebase user and backend user data
   */
  login: async (data) => {
    try {
      const { email, password } = data;
      
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get ID token for backend communication
      const idToken = await user.getIdToken();
      
      // Authenticate with backend
      const response = await api.post('/api/auth/firebase/login', {
        idToken
      });
      
      return {
        success: true,
        data: {
          user: response.data.user,
          firebaseUser: user
        }
      };
    } catch (error) {
      console.error('Firebase login failed:', error);
      throw {
        message: error.message || 'Login failed',
        code: error.code || 'LOGIN_ERROR'
      };
    }
  },

  /**
   * Sign in with Google using Firebase
   * @returns {Promise<Object>} Firebase user and backend user data
   */
  loginWithGoogle: async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      // Get ID token for backend communication
      const idToken = await user.getIdToken();
      
      // Authenticate with backend
      const response = await api.post('/api/auth/firebase/login', {
        idToken
      });
      
      return {
        success: true,
        data: {
          user: response.data.user,
          firebaseUser: user
        }
      };
    } catch (error) {
      console.error('Google login failed:', error);
      throw {
        message: error.message || 'Google login failed',
        code: error.code || 'GOOGLE_LOGIN_ERROR'
      };
    }
  },

  /**
   * Sign out user from Firebase
   * @returns {Promise<void>}
   */
  logout: async () => {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Firebase logout failed:', error);
      throw {
        message: error.message || 'Logout failed',
        code: error.code || 'LOGOUT_ERROR'
      };
    }
  },

  /**
   * Get current Firebase user and sync with backend
   * @returns {Promise<Object>} Current user data
   */
  getCurrentUser: async () => {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        throw new Error('No authenticated user');
      }
      
      const idToken = await firebaseUser.getIdToken();
      const response = await api.get('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      });
      
      return {
        success: true,
        data: {
          user: response.data.user,
          firebaseUser
        }
      };
    } catch (error) {
      console.error('Get current user failed:', error);
      throw {
        message: error.message || 'Failed to get user data',
        code: error.code || 'GET_USER_ERROR'
      };
    }
  },

  /**
   * Update user profile
   * @param {Object} profileData - Profile data to update
   * @returns {Promise<Object>} Updated user data
   */
  updateProfile: async (profileData) => {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        throw new Error('No authenticated user');
      }
      
      // Update Firebase profile if needed
      if (profileData.displayName || profileData.photoURL) {
        await updateProfile(firebaseUser, {
          displayName: profileData.displayName || firebaseUser.displayName,
          photoURL: profileData.photoURL || firebaseUser.photoURL
        });
      }
      
      const idToken = await firebaseUser.getIdToken();
      const response = await api.put('/api/auth/profile', profileData, {
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Profile update failed:', error);
      throw {
        message: error.message || 'Profile update failed',
        code: error.code || 'UPDATE_PROFILE_ERROR'
      };
    }
  },

  /**
   * Check if user is authenticated
   * @returns {boolean} True if user is authenticated
   */
  isAuthenticated: () => {
    return !!auth.currentUser;
  },

  /**
   * Get current Firebase user (synchronous)
   * @returns {Object|null} Current Firebase user or null
   */
  getFirebaseUser: () => {
    return auth.currentUser;
  }
};

export default api;