const crypto = require('crypto');

/**
 * Security configuration for the IDE backend
 */

const securityConfig = {
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    algorithm: 'HS256',
    issuer: 'ide-backend',
    audience: 'ide-frontend'
  },

  // Password Policy
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventCommonPasswords: true,
    preventUserInfo: true, // Prevent using email, name in password
    maxAttempts: 5,
    lockoutDuration: 15 * 60 * 1000 // 15 minutes
  },

  // Rate Limiting
  rateLimit: {
    // General API rate limiting
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // requests per window
      message: 'Too many requests from this IP'
    },
    
    // Authentication endpoints
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // attempts per window
      message: 'Too many authentication attempts'
    },
    
    // File operations
    fileOps: {
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 100, // operations per minute
      message: 'Too many file operations'
    },
    
    // Code execution
    execution: {
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 20, // executions per minute
      message: 'Too many code executions'
    },
    
    // Terminal commands
    terminal: {
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 50, // commands per minute
      message: 'Too many terminal commands'
    }
  },

  // Request Size Limits
  requestLimits: {
    json: '10mb',
    urlencoded: '10mb',
    fileUpload: '100mb',
    codeContent: '1mb',
    terminalCommand: '1kb'
  },

  // Content Security Policy
  csp: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://apis.google.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'https://api.github.com', 'https://www.googleapis.com'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      workerSrc: ["'self'", 'blob:'],
      childSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      manifestSrc: ["'self'"]
    },
    reportOnly: false
  },

  // CORS Configuration
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-CSRF-Token',
      'X-Request-ID'
    ],
    exposedHeaders: ['X-Request-ID', 'X-CSRF-Token'],
    maxAge: 86400 // 24 hours
  },

  // Session Configuration
  session: {
    name: 'ide.session',
    secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict'
    }
  },

  // Helmet Security Headers
  helmet: {
    contentSecurityPolicy: false, // We'll handle CSP separately
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'cross-origin' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    dnsPrefetchControl: true,
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true
  },

  // Input Validation
  validation: {
    // Allowed file extensions for uploads
    allowedFileExtensions: [
      '.js', '.ts', '.jsx', '.tsx',
      '.py', '.java', '.cpp', '.c', '.h',
      '.go', '.rs', '.php', '.rb',
      '.html', '.css', '.scss', '.less',
      '.json', '.xml', '.yaml', '.yml',
      '.md', '.txt', '.csv',
      '.sql', '.sh', '.bat',
      '.dockerfile', '.gitignore'
    ],
    
    // Maximum file sizes
    maxFileSizes: {
      code: 1024 * 1024, // 1MB
      config: 100 * 1024, // 100KB
      text: 10 * 1024 * 1024, // 10MB
      binary: 100 * 1024 * 1024 // 100MB
    },
    
    // Blocked file patterns
    blockedPatterns: [
      /\.exe$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.scr$/i,
      /\.pif$/i,
      /\.com$/i,
      /\.dll$/i,
      /\.sys$/i,
      /\.vbs$/i,
      /\.ps1$/i
    ],
    
    // Dangerous code patterns
    dangerousCodePatterns: [
      // System commands
      /exec\s*\(/gi,
      /spawn\s*\(/gi,
      /system\s*\(/gi,
      /shell_exec/gi,
      /passthru/gi,
      /eval\s*\(/gi,
      
      // File system access
      /require\s*\(\s*['"]fs['"]/gi,
      /import.*fs/gi,
      /open\s*\(/gi,
      /file_get_contents/gi,
      /file_put_contents/gi,
      
      // Network access
      /require\s*\(\s*['"]http['"]/gi,
      /require\s*\(\s*['"]net['"]/gi,
      /urllib/gi,
      /requests\./gi,
      /fetch\s*\(/gi,
      /XMLHttpRequest/gi,
      
      // Process manipulation
      /kill\s*\(/gi,
      /exit\s*\(/gi,
      /process\./gi,
      /Runtime\.getRuntime/gi,
      /ProcessBuilder/gi,
      
      // Dangerous shell commands
      /rm\s+-rf/gi,
      /dd\s+if=/gi,
      /mkfs/gi,
      /format\s+/gi,
      /shutdown/gi,
      /reboot/gi,
      /halt/gi
    ]
  },

  // Container Security
  container: {
    // Resource limits
    resources: {
      memory: 256 * 1024 * 1024, // 256MB
      cpu: 0.25, // 25% of CPU
      processes: 50,
      fileDescriptors: 1024,
      fileSize: 100 * 1024 * 1024, // 100MB
      executionTime: 30000 // 30 seconds
    },
    
    // Security options
    security: {
      readOnlyRoot: true,
      noNewPrivileges: true,
      dropCapabilities: ['ALL'],
      addCapabilities: [], // Minimal capabilities
      seccompProfile: 'default',
      apparmorProfile: 'docker-default',
      selinuxLabel: '',
      userNamespace: true
    },
    
    // Network isolation
    network: {
      mode: 'none', // No network access
      dns: [],
      hosts: []
    }
  },

  // Audit Logging
  audit: {
    enabled: true,
    events: [
      'authentication',
      'authorization_failure',
      'file_access',
      'code_execution',
      'container_creation',
      'security_violation',
      'admin_action',
      'configuration_change'
    ],
    retention: 90 * 24 * 60 * 60 * 1000, // 90 days
    sensitiveFields: ['password', 'token', 'secret', 'key']
  },

  // Monitoring and Alerting
  monitoring: {
    // Thresholds for alerts
    thresholds: {
      failedAuthAttempts: 10, // per hour
      suspiciousActivity: 5, // per user per hour
      resourceUsage: 0.9, // 90% of limits
      errorRate: 0.1, // 10% error rate
      responseTime: 5000 // 5 seconds
    },
    
    // Alert channels
    alerts: {
      email: process.env.ALERT_EMAIL,
      webhook: process.env.ALERT_WEBHOOK,
      slack: process.env.SLACK_WEBHOOK
    }
  },

  // API Security
  api: {
    // API versioning
    version: 'v1',
    
    // API key configuration
    apiKeys: {
      enabled: false,
      headerName: 'X-API-Key',
      queryParam: 'api_key',
      encryption: 'sha256'
    },
    
    // Request signing (for service-to-service)
    signing: {
      enabled: false,
      algorithm: 'hmac-sha256',
      headerName: 'X-Signature',
      timestampTolerance: 300 // 5 minutes
    }
  }
};

module.exports = securityConfig;