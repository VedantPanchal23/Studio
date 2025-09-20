import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, Chrome } from 'lucide-react';
import './LoginPage.css';

/**
 * Login page component with Google OAuth
 */
const LoginPage = () => {
  const navigate = useNavigate();
  const { 
    isAuthenticated, 
    isLoading, 
    error, 
    loginWithGoogle, 
    clearError 
  } = useAuthStore();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/ide', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Clear error when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleGoogleLogin = () => {
    clearError();
    loginWithGoogle();
  };

  if (isLoading) {
    return (
      <div className="login-loading">
        <div className="login-loading__content">
          <Loader2 className="loading-spinner" />
          <p className="loading-text">
            Authenticating...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <Card className="login-card">
          <CardHeader className="login-header">
            <div className="login-logo">
              <span className="login-logo__text">IDE</span>
            </div>
            <CardTitle className="login-title">
              Welcome to Browser IDE
            </CardTitle>
            <CardDescription>
              Sign in to access your development environment
            </CardDescription>
          </CardHeader>
          
          <CardContent className="login-content">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}
            
            <Button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="login-button"
              variant="outline"
            >
              {isLoading ? (
                <Loader2 className="button-icon animate-spin" />
              ) : (
                <Chrome className="button-icon" />
              )}
              Continue with Google
            </Button>
            
            <div className="login-terms">
              <p>
                By signing in, you agree to our{' '}
                <a href="/terms" className="login-link">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="login-link">
                  Privacy Policy
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
        
        <div className="login-footer">
          <p className="login-footer__text">
            New to Browser IDE?{' '}
            <a href="/about" className="login-link">
              Learn more
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;