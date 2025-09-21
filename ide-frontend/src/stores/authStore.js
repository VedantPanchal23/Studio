import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authAPI } from '../services/authAPI';
import { auth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * Firebase Authentication store using Zustand
 * Manages user authentication state and auth-related actions
 */
const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      firebaseUser: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      authInitialized: false,

      // Actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setFirebaseUser: (firebaseUser) => set({ firebaseUser }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      setAuthInitialized: (initialized) => set({ authInitialized: initialized }),

      // Initialize Firebase auth state listener
      initializeAuth: async () => {
        if (import.meta.env.VITE_DISABLE_AUTH === 'true') {
          set({
            user: { id: 'dev-user', email: 'dev@local.test', name: 'Dev User' },
            isAuthenticated: true,
            isLoading: false,
            error: null,
            authInitialized: true
          });
          return;
        }

        try {
          set({ isLoading: true, error: null });

          // Set up Firebase auth state listener
          const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            try {
              if (firebaseUser) {
                // User is signed in
                set({ firebaseUser });
                
                // Get or sync user data with backend
                const response = await authAPI.getCurrentUser();
                
                if (response.success) {
                  set({
                    user: response.data.user,
                    firebaseUser,
                    isAuthenticated: true,
                    isLoading: false,
                    authInitialized: true
                  });
                } else {
                  throw new Error('Failed to sync user data with backend');
                }
              } else {
                // User is signed out
                set({
                  user: null,
                  firebaseUser: null,
                  isAuthenticated: false,
                  isLoading: false,
                  authInitialized: true
                });
              }
            } catch (error) {
              console.error('Auth state change error:', error);
              set({
                error: error.message || 'Authentication error',
                isLoading: false,
                authInitialized: true
              });
            }
          });

          // Store unsubscribe function for cleanup
          set({ firebaseUnsubscribe: unsubscribe });

        } catch (error) {
          console.error('Auth initialization failed:', error);
          set({
            error: error.message || 'Authentication initialization failed',
            isLoading: false,
            authInitialized: true
          });
        }
      },

      // Login with Google OAuth
      loginWithGoogle: async () => {
        if (import.meta.env.VITE_DISABLE_AUTH === 'true') return { success: true };
        
        try {
          set({ isLoading: true, error: null });
          const response = await authAPI.loginWithGoogle();
          
          if (response.success) {
            set({
              user: response.data.user,
              firebaseUser: response.data.firebaseUser,
              isAuthenticated: true,
              isLoading: false
            });
            return { success: true };
          }
          throw new Error(response.message || 'Google login failed');
        } catch (error) {
          set({ error: error.message || 'Google login failed', isLoading: false });
          return { success: false, message: error.message };
        }
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
            set({
              user: response.data.user,
              firebaseUser: response.data.firebaseUser,
              isAuthenticated: true,
              isLoading: false
            });
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
            set({
              user: response.data.user,
              firebaseUser: response.data.firebaseUser,
              isAuthenticated: true,
              isLoading: false
            });
            return { success: true };
          }
          throw new Error(response.message || 'Login failed');
        } catch (error) {
          set({ error: error.message || 'Login failed', isLoading: false });
          return { success: false, message: error.message };
        }
      },

      // Update user profile
      updateProfile: async (profileData) => {
        if (import.meta.env.VITE_DISABLE_AUTH === 'true') {
          set((state) => ({ user: { ...state.user, ...profileData } }));
          return { success: true };
        }
        
        try {
          set({ isLoading: true, error: null });
          const response = await authAPI.updateProfile(profileData);
          
          if (response.success) {
            set({
              user: response.data.user,
              isLoading: false
            });
            return { success: true };
          } else {
            throw new Error(response.message || 'Profile update failed');
          }
        } catch (error) {
          console.error('Profile update failed:', error);
          set({
            error: error.message || 'Profile update failed',
            isLoading: false
          });
          return { success: false, message: error.message };
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
          set({ isLoading: true });
          
          // Sign out from Firebase
          await authAPI.logout();
          
          // Clear local state
          set({
            user: null,
            firebaseUser: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });

          // Redirect to login page
          window.location.href = '/login';
        } catch (error) {
          console.error('Logout failed:', error);
          // Force clear state even if logout fails
          set({
            user: null,
            firebaseUser: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
          window.location.href = '/login';
        }
      },

      // Check if user is authenticated (synchronous)
      isUserAuthenticated: () => {
        return authAPI.isAuthenticated();
      },

      // Get current Firebase user (synchronous)
      getCurrentFirebaseUser: () => {
        return authAPI.getFirebaseUser();
      },

      // Cleanup auth state listener
      cleanup: () => {
        const { firebaseUnsubscribe } = get();
        if (firebaseUnsubscribe) {
          firebaseUnsubscribe();
        }
      }
    }),
    {
      name: 'auth-storage',
      // Only persist non-sensitive data
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        authInitialized: state.authInitialized
      }),
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export { useAuthStore };
export default useAuthStore;