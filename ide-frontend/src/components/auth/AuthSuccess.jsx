import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import './auth-common.css';

/**
 * OAuth success page - handles the callback from Google OAuth
 */
const AuthSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing'); // 'processing', 'success', 'error'
  const [message, setMessage] = useState('Processing authentication...');
  
  const { handleOAuthCallback, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Get tokens from URL parameters
        const accessToken = searchParams.get('token');
        const refreshToken = searchParams.get('refresh');
        
        if (!accessToken) {
          throw new Error('No access token received from authentication');
        }
        
        // Handle the OAuth callback
        const success = await handleOAuthCallback(accessToken, refreshToken);
        
        if (success) {
          setStatus('success');
          setMessage('Authentication successful! Redirecting to IDE...');
          
          // Redirect to IDE after a short delay
          setTimeout(() => {
            navigate('/ide', { replace: true });
          }, 2000);
        } else {
          throw new Error('Authentication failed');
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage(error.message || 'Authentication failed. Please try again.');
        
        // Redirect to login after a delay
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }
    };

    // If already authenticated, redirect immediately
    if (isAuthenticated) {
      navigate('/ide', { replace: true });
      return;
    }

    processCallback();
  }, [searchParams, handleOAuthCallback, navigate, isAuthenticated]);

  const getIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="auth-icon auth-icon--loading animate-spin" style={{height: '2rem', width: '2rem'}} />;
      case 'success':
        return <CheckCircle className="auth-icon auth-icon--success" style={{height: '2rem', width: '2rem'}} />;
      case 'error':
        return <XCircle className="auth-icon auth-icon--error" style={{height: '2rem', width: '2rem'}} />;
      default:
        return <Loader2 className="auth-icon auth-icon--loading animate-spin" style={{height: '2rem', width: '2rem'}} />;
    }
  };

  const getAlertVariant = () => {
    switch (status) {
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <Card className="auth-card">
          <CardHeader className="auth-header">
            <div className="auth-icon">
              {getIcon()}
            </div>
            <CardTitle className={`auth-title ${status === 'success' ? 'auth-title--success' : status === 'error' ? 'auth-title--error' : ''}`}>
              {status === 'processing' && 'Authenticating...'}
              {status === 'success' && 'Welcome!'}
              {status === 'error' && 'Authentication Failed'}
            </CardTitle>
            <CardDescription>
              {status === 'processing' && 'Please wait while we complete your sign-in'}
              {status === 'success' && 'You have been successfully signed in'}
              {status === 'error' && 'There was a problem with your authentication'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="auth-content">
            <Alert variant={getAlertVariant()}>
              <AlertDescription>
                {message}
              </AlertDescription>
            </Alert>
            
            {status === 'processing' && (
              <div className="auth-text">
                <p>This may take a few seconds...</p>
              </div>
            )}
            
            {status === 'success' && (
              <div className="auth-text">
                <p>Redirecting you to the IDE...</p>
              </div>
            )}
            
            {status === 'error' && (
              <div className="auth-text">
                <p>
                  You will be redirected to the login page shortly, or{' '}
                  <button
                    onClick={() => navigate('/login')}
                    className="auth-link"
                  >
                    click here to try again
                  </button>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthSuccess;