const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');
const helmet = require('helmet');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const config = require('../config');
const { AppError } = require('./errorHandler');
const logger = require('../utils/logger');
const crypto = require('crypto');

// Rate limiting middleware
const createRateLimiter = (options = {}) => {
  const limiterConfig = {
    ...config.rateLimit,
    ...options,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl
      });
      
      res.status(429).json({
        status: 'error',
        message: options.message || config.rateLimit.message
      });
    }
  };
  
  return rateLimit(limiterConfig);
};

// General rate limiter
const generalLimiter = createRateLimiter({
  max: process.env.NODE_ENV === 'production' ? undefined : 10000 // Higher limit for dev and test
});

// Strict rate limiter for auth endpoints
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 1000, // Allow more requests in dev and test
  message: 'Too many authentication attempts, please try again later.'
});

// API rate limiter
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1000 : 10000, // Higher limit for dev and test
  message: 'Too many API requests, please try again later.'
});

// Request validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    
    logger.warn('Request validation failed', {
      errors: errorMessages,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip
    });
    
    return next(new AppError('Invalid input data', 400, true, errorMessages));
  }
  
  next();
};

// Common validation rules
const validationRules = {
  // Email validation
  email: () => body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  // Password validation
  password: () => body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
  
  // Name validation
  name: () => body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  // Workspace name validation
  workspaceName: () => body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Workspace name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Workspace name can only contain letters, numbers, spaces, hyphens, and underscores'),
  
  // File path validation
  filePath: () => body('path')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('File path must be between 1 and 500 characters')
    .matches(/^[a-zA-Z0-9\/\-_\.]+$/)
    .withMessage('File path contains invalid characters'),
  
  // MongoDB ObjectId validation
  objectId: (field = 'id') => body(field)
    .isMongoId()
    .withMessage(`Invalid ${field} format`),
  
  // Container ID validation
  containerId: () => param('containerId')
    .matches(/^[a-f0-9]{64}$/)
    .withMessage('Invalid container ID format'),
  
  // Workspace ID validation
  workspaceId: () => param('workspaceId')
    .isMongoId()
    .withMessage('Invalid workspace ID format'),
  
  // Code content validation
  codeContent: () => body('code')
    .isLength({ max: 1024 * 1024 }) // 1MB max
    .withMessage('Code content too large (max 1MB)')
    .custom((value) => {
      // Check for potentially dangerous code patterns
      const dangerousPatterns = [
        /require\s*\(\s*['"]child_process['"]\s*\)/gi,
        /require\s*\(\s*['"]fs['"]\s*\)/gi,
        /require\s*\(\s*['"]net['"]\s*\)/gi,
        /require\s*\(\s*['"]http['"]\s*\)/gi,
        /import.*child_process/gi,
        /import.*fs/gi,
        /import.*net/gi,
        /import.*http/gi,
        /exec\s*\(/gi,
        /spawn\s*\(/gi,
        /system\s*\(/gi,
        /os\.system/gi,
        /subprocess\./gi,
        /Runtime\.getRuntime/gi,
        /ProcessBuilder/gi
      ];
      
      const foundPatterns = dangerousPatterns.filter(pattern => pattern.test(value));
      if (foundPatterns.length > 0) {
        throw new Error('Code contains potentially dangerous operations');
      }
      
      return true;
    }),
  
  // File name validation
  fileName: () => body('filename')
    .matches(/^[a-zA-Z0-9\-_\.]+$/)
    .withMessage('Invalid filename format')
    .isLength({ min: 1, max: 255 })
    .withMessage('Filename must be between 1 and 255 characters'),
  
  // Language validation
  language: () => body('language')
    .isIn(['javascript', 'python', 'java', 'cpp', 'go', 'rust', 'node'])
    .withMessage('Unsupported programming language'),
  
  // URL validation
  url: (field = 'url') => body(field)
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage(`Invalid ${field} format`),
  
  // Git repository URL validation
  gitUrl: () => body('url')
    .matches(/^https:\/\/github\.com\/[a-zA-Z0-9\-_]+\/[a-zA-Z0-9\-_\.]+\.git$/)
    .withMessage('Invalid GitHub repository URL'),
  
  // Branch name validation
  branchName: () => body('branch')
    .matches(/^[a-zA-Z0-9\-_\/]+$/)
    .withMessage('Invalid branch name format')
    .isLength({ min: 1, max: 100 })
    .withMessage('Branch name must be between 1 and 100 characters'),
  
  // Commit message validation
  commitMessage: () => body('message')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Commit message must be between 1 and 500 characters')
    .matches(/^[a-zA-Z0-9\s\-_\.\,\!\?\:]+$/)
    .withMessage('Commit message contains invalid characters'),
  
  // Search query validation
  searchQuery: () => query('q')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_\.]+$/)
    .withMessage('Search query contains invalid characters'),
  
  // Pagination validation
  pagination: () => [
    query('page')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Page must be between 1 and 1000'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],
  
  // Terminal command validation
  terminalCommand: () => body('command')
    .isLength({ max: 1000 })
    .withMessage('Command too long (max 1000 characters)')
    .custom((value) => {
      // Block dangerous commands
      const dangerousCommands = [
        /rm\s+-rf\s+\//gi,
        /dd\s+if=/gi,
        /mkfs/gi,
        /fdisk/gi,
        /format/gi,
        /shutdown/gi,
        /reboot/gi,
        /halt/gi,
        /init\s+0/gi,
        /init\s+6/gi,
        /kill\s+-9\s+1/gi,
        /:(){ :|:& };:/gi, // Fork bomb
        /curl.*\|\s*sh/gi,
        /wget.*\|\s*sh/gi,
        /nc\s+-l/gi, // Netcat listener
        /ncat\s+-l/gi,
        /socat/gi
      ];
      
      const foundDangerous = dangerousCommands.some(pattern => pattern.test(value));
      if (foundDangerous) {
        throw new Error('Command contains dangerous operations');
      }
      
      return true;
    })
};


// Enhanced request sanitization middleware
const sanitizeRequest = (req, res, next) => {
  try {
    // MongoDB injection protection
    mongoSanitize()(req, res, () => {});
    
    // XSS protection for request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    
    // XSS protection for query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    
    // Log suspicious requests
    const suspiciousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /eval\s*\(/gi,
      /expression\s*\(/gi,
      /vbscript:/gi,
      /data:text\/html/gi,
      /\$\{.*\}/gi, // Template injection
      /\{\{.*\}\}/gi, // Template injection
      /union\s+select/gi, // SQL injection
      /drop\s+table/gi, // SQL injection
      /insert\s+into/gi, // SQL injection
      /delete\s+from/gi, // SQL injection
      /update\s+.*set/gi, // SQL injection
      /__proto__/gi, // Prototype pollution
      /constructor/gi, // Prototype pollution
      /\.\.\/\.\.\//gi, // Path traversal
      /\.\.\\/gi, // Path traversal
      /\/etc\/passwd/gi, // File inclusion
      /\/proc\/self\/environ/gi, // File inclusion
    ];
    
    const requestString = JSON.stringify(req.body) + req.originalUrl + JSON.stringify(req.query);
    const detectedPatterns = suspiciousPatterns.filter(pattern => pattern.test(requestString));
    
    if (detectedPatterns.length > 0) {
      logger.warn('Suspicious request detected', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        method: req.method,
        detectedPatterns: detectedPatterns.map(p => p.toString()),
        body: req.body,
        query: req.query,
        severity: detectedPatterns.length > 2 ? 'high' : 'medium'
      });
      
      // Block highly suspicious requests
      if (detectedPatterns.length > 2) {
        return next(new AppError('Request blocked due to security policy', 403));
      }
    }
    
    next();
  } catch (error) {
    logger.error('Error in request sanitization:', error);
    next(error);
  }
};

// Sanitize object recursively
const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return typeof obj === 'string' ? xss(obj) : obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Skip dangerous keys
    if (['__proto__', 'constructor', 'prototype'].includes(key)) {
      continue;
    }
    
    sanitized[key] = sanitizeObject(value);
  }
  
  return sanitized;
};

// Request size validation middleware
const validateRequestSize = (maxSize = 10 * 1024 * 1024) => { // 10MB default
  return (req, res, next) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    
    if (contentLength > maxSize) {
      logger.warn('Request size exceeded limit', {
        ip: req.ip,
        contentLength,
        maxSize,
        url: req.originalUrl
      });
      
      return next(new AppError('Request entity too large', 413));
    }
    
    next();
  };
};

// Content type validation middleware
const validateContentType = (allowedTypes = ['application/json', 'multipart/form-data']) => {
  return (req, res, next) => {
    // Skip validation for GET and DELETE requests
    if (req.method === 'GET' || req.method === 'DELETE') {
      return next();
    }
    
    // Skip validation for requests without body content
    const contentLength = parseInt(req.get('Content-Length') || '0', 10);
    if (contentLength === 0 && !req.get('Content-Type')) {
      return next();
    }
    
    const contentType = req.get('Content-Type');
    if (!contentType) {
      return next(new AppError('Content-Type header is required', 400));
    }
    
    const isAllowed = allowedTypes.some(type => contentType.includes(type));
    if (!isAllowed) {
      logger.warn('Invalid content type', {
        ip: req.ip,
        contentType,
        allowedTypes,
        url: req.originalUrl
      });
      
      return next(new AppError('Invalid Content-Type', 415));
    }
    
    next();
  };
};

// CSRF protection middleware
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip CSRF for API endpoints with valid JWT
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return next();
  }
  
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;
  
  if (!token || !sessionToken || token !== sessionToken) {
    logger.warn('CSRF token validation failed', {
      ip: req.ip,
      hasToken: !!token,
      hasSessionToken: !!sessionToken,
      url: req.originalUrl
    });
    
    return next(new AppError('Invalid CSRF token', 403));
  }
  
  next();
};

// Generate CSRF token
const generateCSRFToken = (req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
};

// IP whitelist middleware (for admin endpoints)
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      logger.warn('IP not in whitelist', {
        ip: clientIP,
        allowedIPs,
        url: req.originalUrl
      });
      
      return next(new AppError('Access denied', 403));
    }
    
    next();
  };
};

// Request logging middleware with audit trail
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const requestId = crypto.randomUUID();
  
  // Add request ID to request object
  req.requestId = requestId;
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    const logData = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      contentLength: res.get('Content-Length') || 0,
      userId: req.user?.id || null,
      timestamp: new Date().toISOString()
    };
    
    // Enhanced logging for sensitive operations
    const sensitiveEndpoints = ['/api/auth', '/api/security', '/api/admin'];
    const isSensitive = sensitiveEndpoints.some(endpoint => req.originalUrl.startsWith(endpoint));
    
    if (isSensitive) {
      logData.sensitive = true;
      logData.body = req.method !== 'GET' ? req.body : undefined;
      logData.query = req.query;
    }
    
    logger[logLevel](`${req.method} ${req.originalUrl}`, logData);
  });
  
  next();
};

// Audit logging middleware for sensitive operations
const auditLogger = (operation) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log audit trail
      logger.info('Audit log', {
        operation,
        userId: req.user?.id || 'anonymous',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        method: req.method,
        statusCode: res.statusCode,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
        success: res.statusCode < 400
      });
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  // Rate limiting
  createRateLimiter,
  generalLimiter,
  authLimiter,
  apiLimiter,
  
  // Validation
  validateRequest,
  validationRules,
  
  // Sanitization and security
  sanitizeRequest,
  validateRequestSize,
  validateContentType,
  securityHeaders,
  
  // CSRF protection
  csrfProtection,
  generateCSRFToken,
  
  // Access control
  ipWhitelist,
  
  // Logging and auditing
  requestLogger,
  auditLogger,
  
  // Utility functions
  sanitizeObject
};