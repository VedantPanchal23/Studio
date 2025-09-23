const { verifyIdToken } = require('../config/firebase');
const User = require('../models/User');
const logger = require('../utils/logger');
const { AppError } = require('./errorHandler');

/**
 * Firebase Authentication middleware
 */

// Security tracking
const failedAttempts = new Map(); // IP -> { count, lastAttempt, blocked }

/**
 * Firebase JWT Authentication middleware
 */
const authenticateFirebase = async (req, res, next) => {
  // Development bypass option
  if (process.env.DISABLE_AUTH === 'true') {
    try {
      // Create or get development user
      if (!global.__DEV_FIREBASE_USER__) {
        let user = await User.findOne({ email: 'dev@localhost.com' });
        if (!user) {
          user = await User.create({
            firebaseUid: 'dev-firebase-uid',
            email: 'dev@localhost.com',
            name: 'Dev User',
            isVerified: true,
            lastLogin: Date.now(),
            preferences: {
              theme: 'dark',
              fontSize: 14,
              keyBindings: 'vscode',
              autoSave: true,
              tabSize: 2
            }
          });
          logger.info('Created dev user for DISABLE_AUTH mode', { userId: user._id });
        } else {
          // Update last login
          user.lastLogin = Date.now();
          await user.save();
        }
        global.__DEV_FIREBASE_USER__ = user;
      }
      req.user = global.__DEV_FIREBASE_USER__;
      // Ensure the user object has an id property for compatibility
      if (!req.user.id && req.user._id) {
        req.user.id = req.user._id.toString();
      }
      req.securityContext = {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.requestId,
        authTime: new Date(),
        devMode: true
      };
      return next();
    } catch (e) {
      logger.error('DISABLE_AUTH Firebase user bootstrap failed', { error: e.message });
      return res.status(500).json({ 
        success: false, 
        message: 'Firebase no-auth mode failed to initialize user' 
      });
    }
  }

  const clientIP = req.ip;
  const userAgent = req.get('User-Agent');
  const requestId = req.requestId;

  try {
    // Check if IP is temporarily blocked (skip blocking for localhost in development)
    const isLocalhost = clientIP === '::1' || clientIP === '127.0.0.1' || clientIP === 'localhost';
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    const ipAttempts = failedAttempts.get(clientIP);
    if (ipAttempts && ipAttempts.blocked && (Date.now() - ipAttempts.lastAttempt) < 15 * 60 * 1000) {
      // Skip blocking for localhost in development
      if (isDevelopment && isLocalhost) {
        logger.info('Bypassing IP block for localhost in development', {
          ip: clientIP,
          userAgent,
          requestId
        });
      } else {
        logger.warn('Blocked IP attempted Firebase authentication', {
          ip: clientIP,
          userAgent,
          requestId,
          blockedSince: new Date(ipAttempts.lastAttempt)
        });

        return res.status(429).json({
          success: false,
          message: 'Too many failed attempts. Please try again later.',
          code: 'IP_BLOCKED'
        });
      }
    }

    // Extract Firebase ID token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      recordFailedAttempt(clientIP, null, 'NO_TOKEN');
      return res.status(401).json({
        success: false,
        message: 'Firebase ID token is required'
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) {
      recordFailedAttempt(clientIP, null, 'INVALID_TOKEN_FORMAT');
      return res.status(401).json({
        success: false,
        message: 'Invalid token format'
      });
    }

    // Verify Firebase ID token
    const decodedToken = await verifyIdToken(idToken);
    
    if (!decodedToken || !decodedToken.uid) {
      recordFailedAttempt(clientIP, null, 'INVALID_FIREBASE_TOKEN');
      return res.status(401).json({
        success: false,
        message: 'Invalid Firebase token'
      });
    }

    // Find or create user in our database
    let user = await User.findOne({ firebaseUid: decodedToken.uid });
    
    if (!user) {
      // Create new user from Firebase token
      user = await User.create({
        firebaseUid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.email?.split('@')[0] || 'User',
        avatar: decodedToken.picture,
        isVerified: decodedToken.email_verified || false,
        lastLogin: Date.now()
      });
      
      logger.info('New user created from Firebase token', {
        userId: user._id,
        firebaseUid: decodedToken.uid,
        email: decodedToken.email
      });
    } else {
      // Update existing user
      user.lastLogin = Date.now();
      if (decodedToken.email && user.email !== decodedToken.email) {
        user.email = decodedToken.email;
      }
      if (decodedToken.name && user.name !== decodedToken.name) {
        user.name = decodedToken.name;
      }
      if (decodedToken.picture && user.avatar !== decodedToken.picture) {
        user.avatar = decodedToken.picture;
      }
      user.isVerified = decodedToken.email_verified || user.isVerified;
      await user.save();
    }

    if (!user.isActive) {
      recordFailedAttempt(clientIP, user._id, 'ACCOUNT_INACTIVE');
      logger.warn('Inactive account attempted access via Firebase', {
        userId: user._id,
        firebaseUid: decodedToken.uid,
        email: user.email,
        ip: clientIP,
        userAgent,
        requestId
      });

      return res.status(401).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    // Clear failed attempts on successful authentication
    failedAttempts.delete(clientIP);

    // Attach user and Firebase context to request
    req.user = user;
    // Ensure the user object has an id property for compatibility
    if (!req.user.id && req.user._id) {
      req.user.id = req.user._id.toString();
    }
    req.firebaseToken = decodedToken;
    req.securityContext = {
      ip: clientIP,
      userAgent,
      requestId,
      authTime: new Date(),
      firebaseUid: decodedToken.uid
    };

    // Log successful authentication
    logger.info('Successful Firebase authentication', {
      userId: user._id,
      firebaseUid: decodedToken.uid,
      email: user.email,
      ip: clientIP,
      userAgent,
      requestId
    });

    next();

  } catch (error) {
    recordFailedAttempt(clientIP, null, 'FIREBASE_ERROR');
    logger.error('Firebase authentication error:', {
      error: error.message,
      ip: clientIP,
      userAgent,
      requestId
    });

    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        message: 'Firebase token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({
        success: false,
        message: 'Firebase token has been revoked',
        code: 'TOKEN_REVOKED'
      });
    }

    if (error.code === 'auth/invalid-id-token') {
      return res.status(401).json({
        success: false,
        message: 'Invalid Firebase token',
        code: 'INVALID_TOKEN'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Firebase authentication failed'
    });
  }
};

/**
 * Record failed authentication attempt
 */
const recordFailedAttempt = (ip, userId, reason) => {
  const now = Date.now();
  const attempts = failedAttempts.get(ip) || { count: 0, lastAttempt: 0, blocked: false };
  
  attempts.count += 1;
  attempts.lastAttempt = now;
  
  // Block IP after 5 failed attempts within 15 minutes
  if (attempts.count >= 5) {
    attempts.blocked = true;
    logger.warn('IP blocked due to repeated failed Firebase auth attempts', {
      ip,
      attemptCount: attempts.count,
      reason,
      userId
    });
  }
  
  failedAttempts.set(ip, attempts);
  
  logger.warn('Failed Firebase authentication attempt recorded', {
    ip,
    attemptCount: attempts.count,
    reason,
    userId
  });
};

/**
 * Optional: Extract Firebase UID from request
 */
const getFirebaseUid = (req) => {
  return req.firebaseToken?.uid || null;
};

/**
 * Optional: Get Firebase claims from request
 */
const getFirebaseClaims = (req) => {
  return req.firebaseToken || null;
};

/**
 * Require admin role middleware (placeholder - implement based on your role system)
 */
const requireAdmin = (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // For now, check if user email contains "admin" or has admin role
    // In production, you should have a proper role system
    const isAdmin = user.email?.includes('admin') || 
                   user.role === 'admin' || 
                   user.isAdmin === true ||
                   user.email?.endsWith('@yourdomain.com'); // Replace with your admin domain

    if (!isAdmin) {
      logger.warn('Non-admin user attempted admin access', {
        userId: user._id,
        firebaseUid: user.firebaseUid,
        email: user.email
      });

      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    next();
  } catch (error) {
    logger.error('Admin check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify admin access'
    });
  }
};

/**
 * Get security stats (placeholder implementation)
 */
const getSecurityStats = async () => {
  try {
    // Return basic security stats
    // In production, you'd get these from your security monitoring system
    return {
      activeUsers: 0,
      blockedIPs: failedAttempts.size,
      failedAttempts: Array.from(failedAttempts.values()).reduce((sum, attempt) => sum + attempt.count, 0),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Failed to get security stats:', error);
    return {
      activeUsers: 0,
      blockedIPs: 0,
      failedAttempts: 0,
      timestamp: new Date().toISOString(),
      error: 'Failed to fetch stats'
    };
  }
};

module.exports = {
  authenticateFirebase,
  getFirebaseUid,
  getFirebaseClaims,
  recordFailedAttempt,
  requireAdmin,
  getSecurityStats
};