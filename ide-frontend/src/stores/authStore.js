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
        // Prevent multiple initializations
        const state = get();
        if (state.authInitialized || state.isLoading) {
          return;
        }

        if (import.meta.env.VITE_DISABLE_AUTH === 'true') {
          // Create dev token if it doesn't exist
          let devToken = localStorage.getItem('devToken');
          if (!devToken) {
            devToken = 'dev-token-' + Date.now();
            localStorage.setItem('devToken', devToken);
          }
          
          set({
            user: { 
              id: '68d18ca85458d5451fc8c2d2', // Use the dev user ID from backend logs
              email: 'dev@localhost.com', 
              name: 'Dev User',
              avatar: null,
              preferences: { theme: 'dark' }
            },
            isAuthenticated: true,
            isLoading: false,
            error: null,
            authInitialized: true
          });
          return;
        }

        try {
          set({ isLoading: true, error: null });

          // Check for Google redirect result first
          try {
            const redirectResult = await authAPI.handleGoogleRedirectResult();
            if (redirectResult.success && !redirectResult.noResult) {
              set({
                user: redirectResult.data.user,
                firebaseUser: redirectResult.data.firebaseUser,
                isAuthenticated: true,
                isLoading: false,
                authInitialized: true
              });
              return;
            }
          } catch (redirectError) {
            console.error('Google redirect result error:', redirectError);
            // Continue with normal auth flow
          }

          // Set up Firebase auth state listener
          const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            try {
              if (firebaseUser) {
                // User is signed in to Firebase
                set({ firebaseUser });
                
                // Get or sync user data with backend
                const response = await authAPI.getCurrentUser();
                
                if (response.success) {
                  set({
                    user: response.data.user,
                    firebaseUser,
                    isAuthenticated: true,
                    isLoading: false,
                    authInitialized: true,
                    error: null
                  });
                } else {
                  // Backend doesn't recognize the user - sign out from Firebase
                  console.log('Backend authentication failed, signing out from Firebase');
                  await auth.signOut();
                  set({
                    user: null,
                    firebaseUser: null,
                    isAuthenticated: false,
                    isLoading: false,
                    authInitialized: true,
                    error: 'Authentication failed'
                  });
                }
              } else {
                // User is signed out from Firebase
                set({
                  user: null,
                  firebaseUser: null,
                  isAuthenticated: false,
                  isLoading: false,
                  authInitialized: true,
                  error: null
                });
              }
            } catch (error) {
              console.error('Auth state change error:', error);
              // Always ensure user is signed out if there's an error
              set({
                user: null,
                firebaseUser: null,
                isAuthenticated: false,
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
            if (response.redirect) {
              // Redirect is happening, don't update state yet
              return { success: true, redirect: true };
            }
            
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
        console.log('Auth store signup called with:', { name, email, password: '***' });
        if (import.meta.env.VITE_DISABLE_AUTH === 'true') {
          set({ user: { id: 'dev-user', email, name }, isAuthenticated: true });
          return { success: true };
        }
        
        try {
          set({ isLoading: true, error: null });
          console.log('Calling authAPI.signup...');
          const response = await authAPI.signup({ name, email, password });
          console.log('Auth API response:', response);
          
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
          console.error('Signup error in store:', error);
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