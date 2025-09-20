import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import { Loader2 } from 'lucide-react';
import './ProtectedRoute.css';

/**
 * Protected route wrapper component
 * Ensures user is authenticated before rendering children
 */
const ProtectedRoute = ({ children, requireAuth = true }) => {
  const location = useLocation();
  const [isInitialized, setIsInitialized] = useState(false);

  const {
    isAuthenticated,
    isLoading,
    initializeAuth,
    ensureValidToken
  } = useAuthStore();

  useEffect(() => {
    if (import.meta.env.VITE_DISABLE_AUTH === 'true') {
      setIsInitialized(true);
      return;
    }
    const initialize = async () => {
      try {
        // Initialize auth state from cookies/storage
        await initializeAuth();

        // If authenticated, ensure token is still valid
        if (isAuthenticated) {
          await ensureValidToken();
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        // Error handling is done in the store
      } finally {
        setIsInitialized(true);
      }
    };

    if (!isInitialized) {
      initialize();
    }
  }, [initializeAuth, ensureValidToken, isAuthenticated, isInitialized]);

  // Show loading spinner while initializing
  if (import.meta.env.VITE_DISABLE_AUTH === 'true') {
    return children; // Direct render in disabled mode
  }

  if (!isInitialized || isLoading) {
    return (
      <div className="protected-loading">
        <div className="protected-loading__content">
          <Loader2 className="loading-spinner" />
          <p className="loading-text">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    // Save the attempted location for redirect after login
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // If authentication is not required or user is authenticated
  return children;
};

/**
 * Public route wrapper - redirects authenticated users away from auth pages
 */
export const PublicRoute = ({ children, redirectTo = '/ide' }) => {
  if (import.meta.env.VITE_DISABLE_AUTH === 'true') return children;
  const { isAuthenticated, isLoading } = useAuthStore();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="protected-loading">
        <div className="protected-loading__content">
          <Loader2 className="loading-spinner" />
          <p className="loading-text">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // If user is authenticated, redirect to the specified route
  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // If user is not authenticated, render the public page
  return children;
};

export default ProtectedRoute;