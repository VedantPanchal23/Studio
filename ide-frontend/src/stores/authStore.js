import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Cookies from 'js-cookie';
import { authAPI } from '../services/authAPI';

/**
 * Authentication store using Zustand
 * Manages user authentication state, tokens, and auth-related actions
 */
const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken });

        // Store tokens in cookies for security
        if (accessToken) {
          Cookies.set('accessToken', accessToken, {
            expires: 1, // 1 day
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
          });
        }

        if (refreshToken) {
          Cookies.set('refreshToken', refreshToken, {
            expires: 7, // 7 days
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
          });
        }
      },

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      // Initialize auth state from cookies
      initializeAuth: async () => {
        if (import.meta.env.VITE_DISABLE_AUTH === 'true') {
          set({
            user: { id: 'dev-user', email: 'dev@local.test', name: 'Dev User' },
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
          return;
        }
        try {
          set({ isLoading: true, error: null });

          const accessToken = Cookies.get('accessToken');
          const refreshToken = Cookies.get('refreshToken');

          if (!accessToken) {
            set({ isLoading: false });
            return;
          }

          // Verify token and get user profile
          const response = await authAPI.verifyToken(accessToken);

          if (response.success) {
            set({
              user: response.data.user,
              accessToken,
              refreshToken,
              isAuthenticated: true,
              isLoading: false
            });
          } else {
            // Token is invalid, try to refresh
            if (refreshToken) {
              await get().refreshAccessToken();
            } else {
              get().logout();
            }
          }
        } catch (error) {
          console.error('Auth initialization failed:', error);

          // Try to refresh token if available
          const refreshToken = Cookies.get('refreshToken');
          if (refreshToken) {
            await get().refreshAccessToken();
          } else {
            get().logout();
          }
        }
      },

      // Login with Google OAuth
      loginWithGoogle: () => {
        if (import.meta.env.VITE_DISABLE_AUTH === 'true') return; // no-op in disabled mode
        set({ isLoading: true, error: null });
        // Redirect to backend Google OAuth endpoint
        window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/auth/google`;
      },

      // Email/password signup
      signup: async ({ name, email, password }) => {
        if (import.meta.env.VITE_DISABLE_AUTH === 'true') {
          set({ user: { id: 'dev-user', email, name }, isAuthenticated: true });
          return { success: true };
        }
        try {
          set({ isLoading: true, error: null });
          const response = await authAPI.signup({ name, email, password });
          if (response.success) {
            const { accessToken, refreshToken, user } = response.data;
            get().setTokens(accessToken, refreshToken);
            set({ user, isAuthenticated: true, isLoading: false });
            return { success: true };
          }
          throw new Error(response.message || 'Signup failed');
        } catch (error) {
          set({ error: error.message || 'Signup failed', isLoading: false });
          return { success: false, message: error.message };
        }
      },

      // Email/password login
      login: async ({ email, password }) => {
        if (import.meta.env.VITE_DISABLE_AUTH === 'true') {
          set({ user: { id: 'dev-user', email, name: 'Dev User' }, isAuthenticated: true });
          return { success: true };
        }
        try {
          set({ isLoading: true, error: null });
          const response = await authAPI.login({ email, password });
          if (response.success) {
            const { accessToken, refreshToken, user } = response.data;
            get().setTokens(accessToken, refreshToken);
            set({ user, isAuthenticated: true, isLoading: false });
            return { success: true };
          }
          throw new Error(response.message || 'Login failed');
        } catch (error) {
          set({ error: error.message || 'Login failed', isLoading: false });
          return { success: false, message: error.message };
        }
      },

      // Handle OAuth callback (called from success page)
      handleOAuthCallback: async (accessToken, refreshToken) => {
        if (import.meta.env.VITE_DISABLE_AUTH === 'true') return true;
        try {
          set({ isLoading: true, error: null });

          if (!accessToken) {
            throw new Error('No access token received');
          }

          // Store tokens
          get().setTokens(accessToken, refreshToken);

          // Get user profile
          const response = await authAPI.getProfile(accessToken);

          if (response.success) {
            set({
              user: response.data.user,
              accessToken,
              refreshToken,
              isAuthenticated: true,
              isLoading: false
            });

            return true;
          } else {
            throw new Error(response.message || 'Failed to get user profile');
          }
        } catch (error) {
          console.error('OAuth callback failed:', error);
          set({
            error: error.message || 'Authentication failed',
            isLoading: false
          });
          get().logout();
          return false;
        }
      },

      // Refresh access token
      refreshAccessToken: async () => {
        if (import.meta.env.VITE_DISABLE_AUTH === 'true') return null;
        try {
          const { refreshToken } = get();

          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          const response = await authAPI.refreshToken(refreshToken);

          if (response.success) {
            const { accessToken: newAccessToken } = response.data;

            set({
              accessToken: newAccessToken,
              user: response.data.user,
              isAuthenticated: true,
              error: null
            });

            // Update access token cookie
            Cookies.set('accessToken', newAccessToken, {
              expires: 1,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'strict'
            });

            return newAccessToken;
          } else {
            throw new Error(response.message || 'Token refresh failed');
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
          get().logout();
          throw error;
        }
      },

      // Update user profile
      updateProfile: async (profileData) => {
        if (import.meta.env.VITE_DISABLE_AUTH === 'true') {
          set((state) => ({ user: { ...state.user, ...profileData } }));
          return true;
        }
        try {
          set({ isLoading: true, error: null });

          const { accessToken } = get();
          const response = await authAPI.updateProfile(profileData, accessToken);

          if (response.success) {
            set({
              user: response.data.user,
              isLoading: false
            });
            return true;
          } else {
            throw new Error(response.message || 'Profile update failed');
          }
        } catch (error) {
          console.error('Profile update failed:', error);
          set({
            error: error.message || 'Profile update failed',
            isLoading: false
          });
          return false;
        }
      },

      // Logout
      logout: async () => {
        if (import.meta.env.VITE_DISABLE_AUTH === 'true') {
          set({ user: null, isAuthenticated: false });
          window.location.href = '/login';
          return;
        }
        try {
          const { accessToken } = get();

          // Call logout endpoint if we have a token
          if (accessToken) {
            await authAPI.logout(accessToken);
          }
        } catch (error) {
          console.error('Logout API call failed:', error);
          // Continue with local logout even if API call fails
        } finally {
          // Clear local state and cookies
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });

          // Remove cookies
          Cookies.remove('accessToken');
          Cookies.remove('refreshToken');

          // Redirect to login page
          window.location.href = '/login';
        }
      },

      // Check if token is expired and refresh if needed
      ensureValidToken: async () => {
        if (import.meta.env.VITE_DISABLE_AUTH === 'true') return 'no-auth';
        const { accessToken, refreshToken } = get();

        if (!accessToken) {
          throw new Error('No access token available');
        }

        try {
          // Try to verify current token
          const response = await authAPI.verifyToken(accessToken);

          if (response.success) {
            return accessToken;
          } else {
            // Token is invalid, try to refresh
            if (refreshToken) {
              return await get().refreshAccessToken();
            } else {
              throw new Error('No refresh token available');
            }
          }
        } catch (error) {
          // If verification fails, try to refresh
          if (refreshToken) {
            try {
              return await get().refreshAccessToken();
            } catch (refreshError) {
              get().logout();
              throw refreshError;
            }
          } else {
            get().logout();
            throw error;
          }
        }
      }
    }),
    {
      name: 'auth-storage',
      // Only persist non-sensitive data
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      }),
      // Don't persist tokens in localStorage for security
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export { useAuthStore };
export default useAuthStore;