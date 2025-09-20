import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { XCircle, RefreshCw } from 'lucide-react';
import './auth-common.css';

/**
 * OAuth failure page - handles authentication failures
 */
const AuthFailure = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clearError } = useAuthStore();

  const error = searchParams.get('error') || 'unknown_error';

  useEffect(() => {
    // Clear any existing errors when component mounts
    clearError();
  }, [clearError]);

  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'oauth_failed':
        return 'Google OAuth authentication failed. This could be due to a cancelled login or permission denial.';
      case 'server_error':
        return 'A server error occurred during authentication. Please try again later.';
      case 'invalid_token':
        return 'The authentication token received was invalid. Please try signing in again.';
      case 'user_denied':
        return 'Authentication was cancelled. Please try again and grant the necessary permissions.';
      case 'network_error':
        return 'A network error occurred. Please check your connection and try again.';
      default:
        return 'An unexpected error occurred during authentication. Please try again.';
    }
  };

  const handleRetry = () => {
    navigate('/login', { replace: true });
  };

  const handleGoHome = () => {
    navigate('/', { replace: true });
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <Card className="auth-card">
          <CardHeader className="auth-header">
            <div className="auth-icon">
              <XCircle className="auth-icon--error" style={{height: '2rem', width: '2rem'}} />
            </div>
            <CardTitle className="auth-title auth-title--error">
              Authentication Failed
            </CardTitle>
            <CardDescription>
              We couldn't sign you in to Browser IDE
            </CardDescription>
          </CardHeader>
          
          <CardContent className="auth-content">
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(error)}
              </AlertDescription>
            </Alert>
            
            <div className="auth-button-group">
              <Button
                onClick={handleRetry}
                className="auth-button--full"
                variant="default"
              >
                <RefreshCw style={{marginRight: '0.5rem', height: '1rem', width: '1rem'}} />
                Try Again
              </Button>
              
              <Button
                onClick={handleGoHome}
                className="auth-button--full"
                variant="outline"
              >
                Go to Home Page
              </Button>
            </div>
            
            <div className="auth-text">
              <p>
                If you continue to experience issues, please{' '}
                <a href="/support" className="auth-link">
                  contact support
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
        
        <div className="auth-details">
          <details>
            <summary>
              Technical Details
            </summary>
            <div className="auth-details__content">
              <p><strong>Error Code:</strong> {error}</p>
              <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
              <p><strong>User Agent:</strong> {navigator.userAgent}</p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default AuthFailure;