const passport = require('passport');
const JWTUtils = require('../utils/jwt');
const User = require('../models/User');
const logger = require('../utils/logger');
const crypto = require('crypto');
const { AppError } = require('./errorHandler');

/**
 * Authentication middleware functions
 */

// Security tracking
const failedAttempts = new Map(); // IP -> { count, lastAttempt, blocked }
const suspiciousActivity = new Map(); // userId -> { attempts, lastActivity }

/**
 * Enhanced JWT Authentication middleware with security monitoring
 */
const authenticateJWT = async (req, res, next) => {
  const clientIP = req.ip;
  const userAgent = req.get('User-Agent');
  const requestId = req.requestId;
  
  try {
    // Check if IP is temporarily blocked
    const ipAttempts = failedAttempts.get(clientIP);
    if (ipAttempts && ipAttempts.blocked && (Date.now() - ipAttempts.lastAttempt) < 15 * 60 * 1000) {
      logger.warn('Blocked IP attempted authentication', {
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
    
    const authHeader = req.headers.authorization;
    const token = JWTUtils.extractTokenFromHeader(authHeader);
    
    if (!token) {
      recordFailedAttempt(clientIP, null, 'NO_TOKEN');
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }
    
    // Verify token
    const decoded = await JWTUtils.verifyToken(token);
    
    // Find user
    const user = await User.findById(decoded.id).select('-password -driveToken -driveRefreshToken');
    
    if (!user) {
      recordFailedAttempt(clientIP, decoded.id, 'USER_NOT_FOUND');
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (!user.isActive) {
      recordFailedAttempt(clientIP, user._id, 'ACCOUNT_INACTIVE');
      logger.warn('Inactive account attempted access', {
        userId: user._id,
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
    
    // Check if password was changed after token was issued
    if (user.changedPasswordAfter && user.changedPasswordAfter(decoded.iat)) {
      recordFailedAttempt(clientIP, user._id, 'PASSWORD_CHANGED');
      return res.status(401).json({
        success: false,
        message: 'Password was changed. Please log in again.'
      });
    }
    
    // Check for suspicious activity patterns
    const suspiciousCheck = checkSuspiciousActivity(user._id, clientIP, userAgent);
    if (suspiciousCheck.isSuspicious) {
      logger.warn('Suspicious authentication activity detected', {
        userId: user._id,
        email: user.email,
        ip: clientIP,
        userAgent,
        requestId,
        reason: suspiciousCheck.reason
      });
      
      // Don't block immediately, but log for monitoring
      if (suspiciousCheck.shouldBlock) {
        return res.status(401).json({
          success: false,
          message: 'Suspicious activity detected. Please verify your identity.',
          code: 'SUSPICIOUS_ACTIVITY'
        });
      }
    }
    
    // Clear failed attempts on successful authentication
    failedAttempts.delete(clientIP);
    
    // Update user's last activity
    updateUserActivity(user._id, clientIP, userAgent);
    
    // Attach user and security context to request
    req.user = user;
    req.securityContext = {
      ip: clientIP,
      userAgent,
      requestId,
      authTime: new Date()
    };
    
    // Log successful authentication
    logger.info('Successful authentication', {
      userId: user._id,
      email: user.email,
      ip: clientIP,
      userAgent,
      requestId
    });
    
    next();
    
  } catch (error) {
    recordFailedAttempt(clientIP, null, 'TOKEN_ERROR');
    logger.error('JWT authentication error:', {
      error: error.message,
      ip: clientIP,
      userAgent,
      requestId
    });
    
    if (error.message === 'Token has expired') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.message === 'Invalid token') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Record failed authentication attempt
 */
const recordFailedAttempt = (ip, userId, reason) => {
  const now = Date.now();
  const ipAttempts = failedAttempts.get(ip) || { count: 0, lastAttempt: 0, blocked: false };
  
  ipAttempts.count++;
  ipAttempts.lastAttempt = now;
  
  // Block IP after 5 failed attempts
  if (ipAttempts.count >= 5) {
    ipAttempts.blocked = true;
    logger.warn('IP blocked due to failed attempts', {
      ip,
      attempts: ipAttempts.count,
      reason
    });
  }
  
  failedAttempts.set(ip, ipAttempts);
  
  // Log failed attempt
  logger.warn('Failed authentication attempt', {
    ip,
    userId,
    reason,
    attempts: ipAttempts.count
  });
};

/**
 * Check for suspicious activity patterns
 */
const checkSuspiciousActivity = (userId, ip, userAgent) => {
  const userActivity = suspiciousActivity.get(userId) || {
    ips: new Set(),
    userAgents: new Set(),
    lastActivity: 0,
    rapidRequests: 0
  };
  
  const now = Date.now();
  let isSuspicious = false;
  let shouldBlock = false;
  const reasons = [];
  
  // Check for multiple IPs
  userActivity.ips.add(ip);
  if (userActivity.ips.size > 3) {
    isSuspicious = true;
    reasons.push('multiple_ips');
  }
  
  // Check for multiple user agents
  userActivity.userAgents.add(userAgent);
  if (userActivity.userAgents.size > 2) {
    isSuspicious = true;
    reasons.push('multiple_user_agents');
  }
  
  // Check for rapid requests (more than 10 per minute)
  if (now - userActivity.lastActivity < 60000) {
    userActivity.rapidRequests++;
    if (userActivity.rapidRequests > 10) {
      isSuspicious = true;
      shouldBlock = true;
      reasons.push('rapid_requests');
    }
  } else {
    userActivity.rapidRequests = 0;
  }
  
  userActivity.lastActivity = now;
  suspiciousActivity.set(userId, userActivity);
  
  return {
    isSuspicious,
    shouldBlock,
    reason: reasons.join(', ')
  };
};

/**
 * Update user activity tracking
 */
const updateUserActivity = (userId, ip, userAgent) => {
  const userActivity = suspiciousActivity.get(userId) || {
    ips: new Set(),
    userAgents: new Set(),
    lastActivity: 0,
    rapidRequests: 0
  };
  
  userActivity.ips.add(ip);
  userActivity.userAgents.add(userAgent);
  userActivity.lastActivity = Date.now();
  
  suspiciousActivity.set(userId, userActivity);
};

/**
 * Optional JWT Authentication middleware
 * Attaches user to request if token is valid, but doesn't fail if no token
 */
const optionalAuthenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTUtils.extractTokenFromHeader(authHeader);
    
    if (!token) {
      return next(); // No token, continue without user
    }
    
    // Verify token
    const decoded = await JWTUtils.verifyToken(token);
    
    // Find user
    const user = await User.findById(decoded.id).select('-password -driveToken -driveRefreshToken');
    
    if (user && user.isActive && !user.changedPasswordAfter(decoded.iat)) {
      req.user = user;
    }
    
    next();
    
  } catch (error) {
    // Log error but continue without user
    logger.warn('Optional JWT authentication failed:', error.message);
    next();
  }
};

/**
 * Passport JWT Authentication middleware
 * Uses Passport JWT strategy
 */
const passportJWT = passport.authenticate('jwt', { session: false });

/**
 * Google OAuth Authentication middleware
 * Initiates Google OAuth flow
 */
const googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email', 'https://www.googleapis.com/auth/drive.file']
});

/**
 * Google OAuth Callback middleware
 * Handles Google OAuth callback
 */
const googleCallback = passport.authenticate('google', {
  session: false,
  failureRedirect: '/auth/failure'
});

/**
 * Role-based authorization middleware
 * @param {Array} roles - Array of allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // For now, we don't have roles in the User model
    // This is a placeholder for future role-based authorization
    if (roles.length > 0 && !roles.includes('user')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }
    
    next();
  };
};

/**
 * Workspace ownership/collaboration check middleware
 * @param {string} paramName - Name of the parameter containing workspace ID
 */
const checkWorkspaceAccess = (paramName = 'workspaceId') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      const workspaceId = req.params[paramName];
      
      if (!workspaceId) {
        return res.status(400).json({
          success: false,
          message: 'Workspace ID is required'
        });
      }
      
      // Check if user has access to this workspace
      // This will be implemented when workspace routes are created
      // For now, just continue
      next();
      
    } catch (error) {
      logger.error('Workspace access check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking workspace access'
      });
    }
  };
};

/**
 * Rate limiting for authentication endpoints
 */
const authRateLimit = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in test environment
    return process.env.NODE_ENV === 'test';
  }
});

/**
 * Enhanced refresh token validation middleware
 */
const validateRefreshToken = async (req, res, next) => {
  const clientIP = req.ip;
  const userAgent = req.get('User-Agent');
  
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      recordFailedAttempt(clientIP, null, 'NO_REFRESH_TOKEN');
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }
    
    // Verify refresh token
    const decoded = await JWTUtils.verifyToken(refreshToken);
    
    // Find user
    const user = await User.findById(decoded.id).select('-password -driveToken -driveRefreshToken');
    
    if (!user) {
      recordFailedAttempt(clientIP, decoded.id, 'USER_NOT_FOUND_REFRESH');
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (!user.isActive) {
      recordFailedAttempt(clientIP, user._id, 'ACCOUNT_INACTIVE_REFRESH');
      return res.status(401).json({
        success: false,
        message: 'Account is inactive'
      });
    }
    
    // Log refresh token usage
    logger.info('Refresh token used', {
      userId: user._id,
      email: user.email,
      ip: clientIP,
      userAgent
    });
    
    req.user = user;
    next();
    
  } catch (error) {
    recordFailedAttempt(clientIP, null, 'REFRESH_TOKEN_ERROR');
    logger.error('Refresh token validation error:', {
      error: error.message,
      ip: clientIP,
      userAgent
    });
    
    if (error.message === 'Token has expired') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token has expired',
        code: 'REFRESH_TOKEN_EXPIRED'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

/**
 * Admin role check middleware
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  // Check if user has admin role (placeholder - implement based on your user model)
  if (!req.user.isAdmin && req.user.role !== 'admin') {
    logger.warn('Non-admin user attempted admin action', {
      userId: req.user._id,
      email: req.user.email,
      ip: req.ip,
      url: req.originalUrl
    });
    
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  
  next();
};

/**
 * Session security middleware
 */
const sessionSecurity = (req, res, next) => {
  if (req.session) {
    // Regenerate session ID periodically
    if (!req.session.lastRegeneration || 
        (Date.now() - req.session.lastRegeneration) > 30 * 60 * 1000) { // 30 minutes
      req.session.regenerate((err) => {
        if (err) {
          logger.error('Session regeneration failed:', err);
        } else {
          req.session.lastRegeneration = Date.now();
        }
        next();
      });
    } else {
      next();
    }
  } else {
    next();
  }
};

/**
 * API key validation middleware (for service-to-service communication)
 */
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key is required'
    });
  }
  
  // Validate API key (implement your API key validation logic)
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
  
  if (!validApiKeys.includes(apiKey)) {
    logger.warn('Invalid API key used', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl
    });
    
    return res.status(401).json({
      success: false,
      message: 'Invalid API key'
    });
  }
  
  // Mark request as API key authenticated
  req.apiKeyAuth = true;
  next();
};

/**
 * Clean up security tracking data periodically
 */
const cleanupSecurityData = () => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  // Clean up failed attempts
  for (const [ip, data] of failedAttempts.entries()) {
    if (now - data.lastAttempt > maxAge) {
      failedAttempts.delete(ip);
    }
  }
  
  // Clean up suspicious activity
  for (const [userId, data] of suspiciousActivity.entries()) {
    if (now - data.lastActivity > maxAge) {
      suspiciousActivity.delete(userId);
    }
  }
};

// Run cleanup every hour
setInterval(cleanupSecurityData, 60 * 60 * 1000);

/**
 * Get security statistics
 */
const getSecurityStats = () => {
  return {
    failedAttempts: {
      total: failedAttempts.size,
      blocked: Array.from(failedAttempts.values()).filter(a => a.blocked).length
    },
    suspiciousActivity: {
      total: suspiciousActivity.size,
      active: Array.from(suspiciousActivity.values())
        .filter(a => Date.now() - a.lastActivity < 60 * 60 * 1000).length // Last hour
    }
  };
};

module.exports = {
  // Authentication
  authenticateJWT,
  authenticateToken: authenticateJWT, // Alias for consistency
  optionalAuthenticateJWT,
  passportJWT,
  googleAuth,
  googleCallback,
  
  // Authorization
  authorize,
  requireAdmin,
  checkWorkspaceAccess,
  
  // Token validation
  validateRefreshToken,
  validateApiKey,
  
  // Security
  authRateLimit,
  sessionSecurity,
  
  // Utilities
  getSecurityStats,
  cleanupSecurityData,
  
  // Internal functions (for testing)
  recordFailedAttempt,
  checkSuspiciousActivity,
  updateUserActivity
};