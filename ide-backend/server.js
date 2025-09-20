const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const session = require('express-session');
const RedisStore = require('connect-redis');
const { createClient } = require('redis');
const { createServer } = require('http');

// Import configuration and utilities
const config = require('./config');
const logger = require('./utils/logger');
const { initializeDatabases } = require('./utils/database');

// Import WebSocket service
const webSocketService = require('./services/websocket');

// Import passport configuration
const passport = require('./config/passport');

// Import middleware
const { 
  globalErrorHandler, 
  handleUnhandledRoutes, 
  gracefulShutdown 
} = require('./middleware/errorHandler');
const { 
  generalLimiter, 
  apiLimiter, 
  sanitizeRequest, 
  requestLogger,
  securityHeaders,
  validateRequestSize,
  validateContentType,
  generateCSRFToken
} = require('./middleware/security');
const { sessionSecurity } = require('./middleware/auth');

const app = express();
const server = createServer(app);

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(helmet(config.security.helmet));
app.use(cors(config.cors));
app.use(securityHeaders);

// Compression middleware
app.use(compression());

// Rate limiting
app.use(generalLimiter);

// Request logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: logger.stream }));
}

// Custom request logger
app.use(requestLogger);

// Request size validation
app.use(validateRequestSize(10 * 1024 * 1024)); // 10MB limit

// Content type validation
app.use(validateContentType(['application/json', 'multipart/form-data', 'text/plain']));

// Body parsing middleware
app.use(express.json(config.bodyParser.json));
app.use(express.urlencoded(config.bodyParser.urlencoded));

// Request sanitization
app.use(sanitizeRequest);

// Session configuration for OAuth
let redisClient;
let redisStore;

// Only set up Redis in production or when explicitly configured
if (config.nodeEnv === 'production' || process.env.USE_REDIS === 'true') {
  try {
    redisClient = createClient({ url: config.database.redis.url });
    redisClient.on('error', (err) => logger.error('Redis Client Error', err));
    redisClient.connect().catch((err) => {
      logger.error('Failed to connect to Redis:', err);
      redisClient = null;
    });
    
    if (redisClient) {
      redisStore = new RedisStore({ client: redisClient });
    }
  } catch (error) {
    logger.warn('Redis setup failed, using memory store:', error.message);
    redisClient = null;
    redisStore = null;
  }
}

app.use(session({
  store: redisStore,
  secret: config.session.secret,
  resave: config.session.resave,
  saveUninitialized: config.session.saveUninitialized,
  cookie: config.session.cookie
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Session security
app.use(sessionSecurity);

// CSRF token generation
app.use(generateCSRFToken);

// Health check routes (before rate limiting for monitoring)
const healthRoutes = require('./routes/health');
app.use('/health', healthRoutes);

// API routes with rate limiting
app.use('/api', apiLimiter);

// Authentication routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// File management routes
const fileRoutes = require('./routes/files');
app.use('/api/files', fileRoutes);

// WebSocket management routes
const websocketRoutes = require('./routes/websocket');
app.use('/api/websocket', websocketRoutes);

// Terminal management routes
const terminalRoutes = require('./routes/terminal');
app.use('/api/terminal', terminalRoutes);

// Code execution routes
const executionRoutes = require('./routes/execution');
app.use('/api/execution', executionRoutes);

// LSP routes
const lspRoutes = require('./routes/lsp');
app.use('/api/lsp', lspRoutes);

// Google Drive routes
const driveRoutes = require('./routes/drive');
app.use('/api/drive', driveRoutes);

// Git routes
const gitRoutes = require('./routes/git');
app.use('/api/git', gitRoutes);

// Workspace routes
const workspaceRoutes = require('./routes/workspaces');
app.use('/api/workspaces', workspaceRoutes);

// Security routes
const securityRoutes = require('./routes/security');
app.use('/api/security', securityRoutes);

// Placeholder for other API routes (will be implemented in future tasks)
app.use('/api', (req, res) => {
  res.json({ 
    message: 'API endpoints available',
    availableEndpoints: [
      'GET /health - Health check',
      'POST /api/auth/google - Google OAuth login',
      'GET /api/auth/google/callback - Google OAuth callback',
      'POST /api/auth/refresh - Refresh access token',
      'POST /api/auth/logout - Logout user',
      'GET /api/auth/profile - Get user profile',
      'PUT /api/auth/profile - Update user profile',
      'GET /api/auth/verify-token - Verify token validity',
      'GET /api/files/:workspaceId - List files in workspace',
      'GET /api/files/:workspaceId/*path - Get file content',
      'PUT /api/files/:workspaceId/*path - Create or update file',
      'POST /api/files/:workspaceId/create - Create new file or directory',
      'DELETE /api/files/:workspaceId/*path - Delete file or directory',
      'POST /api/files/:workspaceId/move - Move/rename file or directory',
      'POST /api/files/:workspaceId/copy - Copy file or directory',
      'POST /api/files/:workspaceId/upload - Upload files',
      'GET /api/files/:workspaceId/download/*path - Download file',
      'GET /api/websocket/status - Get WebSocket connection status',
      'POST /api/websocket/test - Send test message to user sockets',
      'GET /api/websocket/users - Get connected users info',
      'GET /api/terminal/sessions - Get user terminal sessions',
      'GET /api/terminal/:terminalId - Get terminal info',
      'POST /api/terminal/create - Create new terminal session',
      'PUT /api/terminal/:terminalId/resize - Resize terminal',
      'DELETE /api/terminal/:terminalId - Destroy terminal session',
      'GET /api/lsp/languages - Get supported programming languages',
      'GET /api/lsp/servers - Get active LSP servers',
      'POST /api/lsp/servers - Start LSP server for language',
      'DELETE /api/lsp/servers/:serverId - Stop LSP server',
      'GET /api/lsp/servers/:serverId/status - Get LSP server status',
      'POST /api/lsp/check-executable - Check LSP server availability',
      'POST /api/lsp/shutdown - Shutdown all LSP servers',
      'GET /api/drive/auth-url - Get Google Drive authorization URL',
      'POST /api/drive/callback - Handle Google Drive OAuth callback',
      'GET /api/drive/status - Check Google Drive connection status',
      'GET /api/drive/files - List files in Google Drive',
      'GET /api/drive/files/:fileId - Get file metadata from Google Drive',
      'GET /api/drive/files/:fileId/download - Download file content from Google Drive',
      'POST /api/drive/files - Upload file to Google Drive',
      'PUT /api/drive/files/:fileId - Update file content in Google Drive',
      'POST /api/drive/folders - Create folder in Google Drive',
      'DELETE /api/drive/files/:fileId - Delete file from Google Drive',
      'GET /api/drive/search - Search files in Google Drive',
      'GET /api/drive/storage - Get Google Drive storage information',
      'POST /api/drive/sync/:workspaceId - Sync workspace to Google Drive',
      'POST /api/drive/import/:workspaceId - Import files from Google Drive to workspace',
      'GET /api/drive/sync/:workspaceId/status - Get workspace sync status',
      'POST /api/drive/disconnect - Disconnect Google Drive integration',
      'GET /api/git/:workspaceId/status - Get Git repository status',
      'POST /api/git/:workspaceId/init - Initialize Git repository',
      'POST /api/git/:workspaceId/clone - Clone repository',
      'POST /api/git/:workspaceId/add - Add files to staging area',
      'POST /api/git/:workspaceId/unstage - Remove files from staging area',
      'POST /api/git/:workspaceId/commit - Commit changes',
      'GET /api/git/:workspaceId/history - Get commit history',
      'GET /api/git/:workspaceId/branches - Get branch information',
      'POST /api/git/:workspaceId/branches - Create new branch',
      'POST /api/git/:workspaceId/branches/switch - Switch branch',
      'DELETE /api/git/:workspaceId/branches/:branchName - Delete branch',
      'GET /api/git/:workspaceId/remotes - Get remote repositories',
      'POST /api/git/:workspaceId/remotes - Add remote repository',
      'POST /api/git/:workspaceId/push - Push changes to remote',
      'POST /api/git/:workspaceId/pull - Pull changes from remote',
      'POST /api/git/:workspaceId/fetch - Fetch changes from remote',
      'GET /api/git/:workspaceId/diff - Get diff for files',
      'GET /api/git/github/user - Get authenticated GitHub user',
      'GET /api/git/github/repositories - List user repositories',
      'POST /api/git/github/repositories - Create new repository',
      'GET /api/workspaces - Workspace management (coming soon)',
      'POST /api/execute - Code execution (coming soon)'
    ]
  });
});

// Handle unhandled routes
app.use('*', handleUnhandledRoutes);

// Global error handling middleware
app.use(globalErrorHandler);

// Initialize databases and start server
const startServer = async () => {
  try {
    // Initialize database connections
    if (config.nodeEnv !== 'test') {
      logger.info('Initializing database connections...');
      await initializeDatabases({ skipRedis: config.nodeEnv === 'development' });
      logger.info('Database connections initialized successfully');
    } else {
      logger.info('Test mode: Skipping database connections');
    }
    
    // Initialize file system
    const fileSystem = require('./utils/fileSystem');
    await fileSystem.initializeWorkspaceDirectory();
    logger.info('File system initialized successfully');
    
    // Initialize WebSocket service
    webSocketService.initialize(server);
    logger.info('WebSocket service initialized successfully');
    
    // Initialize container manager
    const containerManager = require('./utils/containerManager');
    await containerManager.initialize();
    logger.info('Container manager initialized successfully');
    
    // Initialize Git manager
    const gitManager = require('./utils/gitManager');
    await gitManager.initialize();
    logger.info('Git manager initialized successfully');
    
    // Start server with error handling
    server.listen(config.port, () => {
      logger.info(`IDE Backend server is running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`CORS enabled for: ${config.cors.origin}`);
      logger.info(`WebSocket server ready for connections`);
    });
    
    // Handle server startup errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${config.port} is already in use!`);
        logger.info('Troubleshooting steps:');
        logger.info('1. Kill existing Node.js processes: taskkill /f /im node.exe');
        logger.info('2. Or change PORT in .env file to a different port (e.g., 3002)');
        logger.info('3. Or find and kill the specific process using the port');
        process.exit(1);
      } else {
        logger.error('Server startup error:', error);
        process.exit(1);
      }
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      logger.error('UNHANDLED REJECTION! Shutting down...', err);
      server.close(async () => {
        if (redisClient) {
          await redisClient.quit();
        }
        process.exit(1);
      });
    });
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      logger.error('UNCAUGHT EXCEPTION! Shutting down...', err);
      process.exit(1);
    });
    
    // Enhanced graceful shutdown
    const enhancedGracefulShutdown = (signal) => {
      return async () => {
        logger.info(`Received ${signal}. Graceful shutdown initiated.`);
        
        try {
          // Close WebSocket connections
          if (webSocketService.getIO()) {
            webSocketService.getIO().close();
            logger.info('WebSocket server closed.');
          }
          
          // Close Redis connection
          if (redisClient) {
            await redisClient.quit();
            logger.info('Redis connection closed.');
          }
          
          // Close database connections
          const { closeDatabases } = require('./utils/database');
          await closeDatabases();
          
          // Shutdown container manager
          const containerManager = require('./utils/containerManager');
          await containerManager.shutdown();
          
          // Shutdown LSP service
          const lspService = require('./services/lspService');
          await lspService.shutdown();
          
          // Close HTTP server
          server.close(() => {
            logger.info('HTTP server closed.');
            process.exit(0);
          });
        } catch (error) {
          logger.error('Error during graceful shutdown:', error);
          process.exit(1);
        }
        
        // Force close server after 10 seconds
        setTimeout(() => {
          logger.error('Could not close connections in time, forcefully shutting down');
          process.exit(1);
        }, 10000);
      };
    };
    
    // Graceful shutdown
    process.on('SIGTERM', enhancedGracefulShutdown('SIGTERM'));
    process.on('SIGINT', enhancedGracefulShutdown('SIGINT'));
    
    return server;
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();



module.exports = app;