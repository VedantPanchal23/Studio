import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
    login,
    clearError
  } = useAuthStore();

  const [form, setForm] = useState({ email: '', password: '' });
  const [localError, setLocalError] = useState(null);

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

  const handleGoogleLogin = async () => {
    clearError();
    setLocalError(null);
    const result = await loginWithGoogle();
    if (result.success) {
      navigate('/ide');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLocalError(null);
    clearError();
    if (!form.email || !form.password) {
      setLocalError('Email and password are required');
      return;
    }
    const result = await login({ email: form.email, password: form.password });
    if (result.success) {
      navigate('/ide');
    } else {
      // Handle Firebase-specific error codes
      const errorMessage = getFirebaseErrorMessage(result.message);
      setLocalError(errorMessage);
    }
  };

  const getFirebaseErrorMessage = (errorMessage) => {
    if (!errorMessage) return 'Login failed';
    
    // Firebase Auth error codes
    if (errorMessage.includes('auth/user-not-found')) {
      return 'No account found with this email address';
    }
    if (errorMessage.includes('auth/wrong-password')) {
      return 'Incorrect password';
    }
    if (errorMessage.includes('auth/invalid-email')) {
      return 'Invalid email address';
    }
    if (errorMessage.includes('auth/user-disabled')) {
      return 'This account has been disabled';
    }
    if (errorMessage.includes('auth/too-many-requests')) {
      return 'Too many failed attempts. Please try again later';
    }
    if (errorMessage.includes('auth/network-request-failed')) {
      return 'Network error. Please check your connection';
    }
    
    return errorMessage;
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
            {(error || localError) && (
              <Alert variant="destructive">
                <AlertDescription>
                  {localError || error}
                </AlertDescription>
              </Alert>
            )}

            {/* Email/password form */}
            <form onSubmit={handlePasswordLogin} className="auth-form">
              <div className="form-group">
                <label>Email</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleInputChange}
                  placeholder="you@example.com"
                  disabled={isLoading}
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" disabled={isLoading} className="login-button">
                {isLoading ? <Loader2 className="button-icon animate-spin" /> : 'Log In'}
              </Button>
            </form>

            <div className="login-divider" style={{ textAlign: 'center', fontSize: '0.75rem', color: '#6b7280' }}>
              <span>OR</span>
            </div>

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
              <p style={{ marginTop: '0.5rem' }}>
                New user? <Link to="/signup" className="login-link">Create an account</Link>
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