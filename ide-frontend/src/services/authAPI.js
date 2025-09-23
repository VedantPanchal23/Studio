import axios from 'axios';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
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
    console.log('AuthAPI signup called with:', { ...data, password: '***' });
    try {
      const { name, email, password } = data;
      
      console.log('Creating Firebase user...');
      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('Firebase user created:', user.uid);
      
      // Update user profile with name
      await updateProfile(user, {
        displayName: name
      });
      console.log('Profile updated with name');
      
      // Get ID token for backend communication
      const idToken = await user.getIdToken();
      console.log('Got ID token, calling backend...');
      
      // Register user with backend
      const response = await api.post('/auth/firebase/register', {
        idToken,
        userData: {
          name,
          email,
          photoURL: user.photoURL
        }
      });
      console.log('Backend response:', response.data);
      
      if (!response || !response.data || !response.data.user) {
        throw new Error('Invalid response from backend');
      }
      
      return {
        success: true,
        data: {
          user: response.data.user,
          firebaseUser: user
        }
      };
    } catch (error) {
      console.error('Firebase signup failed:', error);
      
      // Handle specific Firebase errors with user-friendly messages
      let errorMessage = 'Signup failed';
      let errorCode = 'SIGNUP_ERROR';
      
      switch (error.code) {
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password authentication is not enabled. Please contact support or try Google login.';
          errorCode = 'AUTH_METHOD_DISABLED';
          break;
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists. Please try logging in instead.';
          errorCode = 'EMAIL_EXISTS';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address format.';
          errorCode = 'INVALID_EMAIL';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak. Please choose a stronger password.';
          errorCode = 'WEAK_PASSWORD';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many attempts. Please try again later.';
          errorCode = 'TOO_MANY_REQUESTS';
          break;
        default:
          errorMessage = error.message || 'Signup failed';
          errorCode = error.code || 'SIGNUP_ERROR';
      }
      
      throw {
        message: errorMessage,
        code: errorCode
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
      const response = await api.post('/auth/firebase/login', {
        idToken
      });
      
      if (!response || !response.data || !response.data.user) {
        throw new Error('Invalid response from backend');
      }
      
      return {
        success: true,
        data: {
          user: response.data.user,
          firebaseUser: user
        }
      };
    } catch (error) {
      console.error('Firebase login failed:', error);
      
      // Handle specific Firebase errors with user-friendly messages
      let errorMessage = 'Login failed';
      let errorCode = 'LOGIN_ERROR';
      
      switch (error.code) {
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password authentication is not enabled. Please contact support or try Google login.';
          errorCode = 'AUTH_METHOD_DISABLED';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled. Please contact support.';
          errorCode = 'USER_DISABLED';
          break;
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address.';
          errorCode = 'USER_NOT_FOUND';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          errorCode = 'WRONG_PASSWORD';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address format.';
          errorCode = 'INVALID_EMAIL';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          errorCode = 'TOO_MANY_REQUESTS';
          break;
        default:
          errorMessage = error.message || 'Login failed';
          errorCode = error.code || 'LOGIN_ERROR';
      }
      
      throw {
        message: errorMessage,
        code: errorCode
      };
    }
  },

  /**
   * Sign in with Google using Firebase (redirect method to avoid COOP issues)
   * @returns {Promise<Object>} Firebase user and backend user data
   */
  loginWithGoogle: async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      // Try popup first, fallback to redirect if COOP issues
      try {
        const userCredential = await signInWithPopup(auth, provider);
        const user = userCredential.user;
        
        // Get ID token for backend communication
        const idToken = await user.getIdToken();
        
        // Authenticate with backend
        const response = await api.post('/auth/firebase/login', {
          idToken
        });
        
        if (!response || !response.data || !response.data.user) {
          throw new Error('Invalid response from backend');
        }
        
        return {
          success: true,
          data: {
            user: response.data.user,
            firebaseUser: user
          }
        };
      } catch (popupError) {
        // If popup fails due to COOP or other issues, use redirect
        if (popupError.code === 'auth/popup-blocked' || 
            popupError.code === 'auth/popup-closed-by-user' ||
            popupError.message.includes('Cross-Origin-Opener-Policy')) {
          
          console.log('Popup blocked or COOP issue, using redirect...');
          await signInWithRedirect(auth, provider);
          // The redirect will take over, so we don't return here
          return { success: true, redirect: true };
        }
        throw popupError;
      }
    } catch (error) {
      console.error('Google login failed:', error);
      throw {
        message: error.message || 'Google login failed',
        code: error.code || 'GOOGLE_LOGIN_ERROR'
      };
    }
  },

  /**
   * Handle redirect result from Google login
   * @returns {Promise<Object>} Firebase user and backend user data
   */
  handleGoogleRedirectResult: async () => {
    try {
      const result = await getRedirectResult(auth);
      if (result) {
        const user = result.user;
        
        // Get ID token for backend communication
        const idToken = await user.getIdToken();
        
        // Authenticate with backend
        const response = await api.post('/auth/firebase/login', {
          idToken
        });
        
        if (!response || !response.data || !response.data.user) {
          throw new Error('Invalid response from backend');
        }
        
        return {
          success: true,
          data: {
            user: response.data.user,
            firebaseUser: user
          }
        };
      }
      return { success: false, noResult: true };
    } catch (error) {
      console.error('Google redirect result failed:', error);
      throw {
        message: error.message || 'Google redirect login failed',
        code: error.code || 'GOOGLE_REDIRECT_ERROR'
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
      const response = await api.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      });
      
      if (!response || !response.data || !response.data.user) {
        throw new Error('Invalid response from backend - missing user data');
      }
      
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