const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const config = {
  // Server configuration
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',

  // CORS configuration
  cors: {
    origin: (origin, callback) => {
      const allowed = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173')
        .split(',')
        .map(o => o.trim());
      if (!origin) return callback(null, true); // non-browser or same-origin
      if (allowed.includes(origin)) {
        return callback(null, true);
      }
      // In development, optionally allow any localhost port if DEV_ALLOW_ALL_LOCALHOST=true
      if (process.env.DEV_ALLOW_ALL_LOCALHOST === 'true' && /^http:\/\/localhost:\d+$/.test(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true,
    optionsSuccessStatus: 200
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  },

  // Security configuration
  security: {
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: false
    }
  },

  // Request body limits
  bodyParser: {
    json: {
      limit: process.env.JSON_BODY_LIMIT || '10mb'
    },
    urlencoded: {
      limit: process.env.URLENCODED_BODY_LIMIT || '10mb',
      extended: true
    }
  },

  // Database configuration (placeholders for future use)
  database: {
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ide-backend',
      options: {
        maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE) || 10,
        serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT) || 5000,
        socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT) || 45000
      }
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      options: {
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: null
      }
    }
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  },

  // Authentication configuration
  auth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback'
    }
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
    file: {
      enabled: process.env.LOG_FILE_ENABLED === 'true',
      filename: process.env.LOG_FILE_PATH || path.join(__dirname, '../logs/app.log'),
      maxsize: parseInt(process.env.LOG_FILE_MAX_SIZE) || 5242880, // 5MB
      maxFiles: parseInt(process.env.LOG_FILE_MAX_FILES) || 5
    }
  }
};

// Validate required environment variables in production
if (config.nodeEnv === 'production') {
  const requiredEnvVars = [
    'JWT_SECRET',
    'MONGODB_URI',
    'REDIS_URL'
  ];

  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  }
}

module.exports = config;