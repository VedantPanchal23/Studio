const mongoose = require('mongoose');
const Redis = require('ioredis');
const config = require('../config');
const logger = require('./logger');

// MongoDB connection state
let mongoConnection = null;
let redisConnection = null;

// MongoDB connection with retry logic
const connectMongoDB = async (retryCount = 0) => {
  const maxRetries = 5;
  const retryDelay = 5000; // 5 seconds
  
  try {
    logger.info('Attempting to connect to MongoDB...');
    
    // Set mongoose options
    mongoose.set('strictQuery', false);
    
    // Connect to MongoDB
    await mongoose.connect(config.database.mongodb.uri, config.database.mongodb.options);
    
    mongoConnection = mongoose.connection;
    
    // Connection event handlers
    mongoConnection.on('connected', () => {
      logger.info('MongoDB connected successfully');
    });
    
    mongoConnection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });
    
    mongoConnection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });
    
    // Handle process termination
    process.on('SIGINT', async () => {
      await mongoConnection.close();
      logger.info('MongoDB connection closed through app termination');
    });
    
    return mongoConnection;
    
  } catch (error) {
    logger.error(`MongoDB connection attempt ${retryCount + 1} failed:`, error.message);
    
    if (retryCount < maxRetries) {
      logger.info(`Retrying MongoDB connection in ${retryDelay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return connectMongoDB(retryCount + 1);
    } else {
      logger.error('Max MongoDB connection retries reached. Exiting...');
      throw error;
    }
  }
};

// Redis connection with retry logic
const connectRedis = async (retryCount = 0) => {
  const maxRetries = 5;
  const retryDelay = 5000; // 5 seconds
  
  try {
    logger.info('Attempting to connect to Redis...');
    
    // Create Redis connection
    redisConnection = new Redis(config.database.redis.url, {
      ...config.database.redis.options,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
      lazyConnect: true
    });
    
    // Connection event handlers
    redisConnection.on('connect', () => {
      logger.info('Redis connected successfully');
    });
    
    redisConnection.on('ready', () => {
      logger.info('Redis ready to accept commands');
    });
    
    redisConnection.on('error', (err) => {
      logger.error('Redis connection error:', err.message);
    });
    
    redisConnection.on('close', () => {
      logger.warn('Redis connection closed');
    });
    
    redisConnection.on('reconnecting', (delay) => {
      logger.info(`Redis reconnecting in ${delay}ms`);
    });
    
    // Test the connection
    await redisConnection.connect();
    await redisConnection.ping();
    
    // Handle process termination
    process.on('SIGINT', async () => {
      await redisConnection.quit();
      logger.info('Redis connection closed through app termination');
    });
    
    return redisConnection;
    
  } catch (error) {
    logger.error(`Redis connection attempt ${retryCount + 1} failed:`, error.message);
    
    if (retryCount < maxRetries) {
      logger.info(`Retrying Redis connection in ${retryDelay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return connectRedis(retryCount + 1);
    } else {
      logger.error('Max Redis connection retries reached. Exiting...');
      throw error;
    }
  }
};

// Initialize all database connections
const initializeDatabases = async (options = {}) => {
  const { skipRedis = false } = options;
  
  try {
    logger.info('Initializing database connections...');
    
    // Connect to MongoDB (required)
    await connectMongoDB();
    
    // Connect to Redis (optional)
    if (!skipRedis) {
      try {
        await connectRedis();
      } catch (error) {
        logger.warn('Redis connection failed, continuing without Redis:', error.message);
        logger.info('Application will work without Redis, but sessions will use memory store');
        redisConnection = null;
      }
    } else {
      logger.info('Skipping Redis connection as requested');
    }
    
    logger.info('Database connections initialized successfully');
    
    return {
      mongodb: mongoConnection,
      redis: redisConnection
    };
    
  } catch (error) {
    logger.error('Failed to initialize database connections:', error);
    throw error;
  }
};

// Get MongoDB connection
const getMongoConnection = () => {
  if (!mongoConnection) {
    throw new Error('MongoDB connection not initialized. Call initializeDatabases() first.');
  }
  return mongoConnection;
};

// Get Redis connection
const getRedisConnection = () => {
  if (!redisConnection) {
    throw new Error('Redis connection not initialized. Call initializeDatabases() first.');
  }
  return redisConnection;
};

// Close all database connections
const closeDatabases = async () => {
  try {
    logger.info('Closing database connections...');
    
    if (mongoConnection) {
      await mongoConnection.close();
      mongoConnection = null;
      logger.info('MongoDB connection closed');
    }
    
    if (redisConnection) {
      await redisConnection.quit();
      redisConnection = null;
      logger.info('Redis connection closed');
    }
    
    logger.info('All database connections closed successfully');
    
  } catch (error) {
    logger.error('Error closing database connections:', error);
    throw error;
  }
};

// Health check for databases
const checkDatabaseHealth = async () => {
  const health = {
    mongodb: { status: 'disconnected', latency: null },
    redis: { status: 'disconnected', latency: null }
  };
  
  // Check MongoDB health
  try {
    if (mongoConnection && mongoConnection.readyState === 1) {
      const start = Date.now();
      await mongoConnection.db.admin().ping();
      health.mongodb = {
        status: 'connected',
        latency: Date.now() - start,
        readyState: mongoConnection.readyState
      };
    }
  } catch (error) {
    health.mongodb = {
      status: 'error',
      error: error.message
    };
  }
  
  // Check Redis health
  try {
    if (redisConnection && redisConnection.status === 'ready') {
      const start = Date.now();
      await redisConnection.ping();
      health.redis = {
        status: 'connected',
        latency: Date.now() - start,
        connectionStatus: redisConnection.status
      };
    }
  } catch (error) {
    health.redis = {
      status: 'error',
      error: error.message
    };
  }
  
  return health;
};

// Database connection pool monitoring
const getConnectionStats = () => {
  const stats = {};
  
  // MongoDB stats
  if (mongoConnection) {
    stats.mongodb = {
      readyState: mongoConnection.readyState,
      host: mongoConnection.host,
      port: mongoConnection.port,
      name: mongoConnection.name
    };
  }
  
  // Redis stats
  if (redisConnection) {
    stats.redis = {
      status: redisConnection.status,
      options: {
        host: redisConnection.options.host,
        port: redisConnection.options.port,
        db: redisConnection.options.db
      }
    };
  }
  
  return stats;
};

module.exports = {
  initializeDatabases,
  connectMongoDB,
  connectRedis,
  getMongoConnection,
  getRedisConnection,
  closeDatabases,
  checkDatabaseHealth,
  getConnectionStats
};