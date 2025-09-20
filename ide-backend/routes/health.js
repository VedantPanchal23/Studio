const express = require('express');
const { checkDatabaseHealth, getConnectionStats } = require('../utils/database');
const { catchAsync } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// Basic health check
router.get('/', catchAsync(async (req, res) => {
  const health = {
    status: 'OK',
    message: 'IDE Backend Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    pid: process.pid
  };
  
  res.json(health);
}));

// Detailed health check including databases
router.get('/detailed', catchAsync(async (req, res) => {
  const startTime = Date.now();
  
  // Get database health
  const databaseHealth = await checkDatabaseHealth();
  const connectionStats = getConnectionStats();
  
  const health = {
    status: 'OK',
    message: 'IDE Backend Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    responseTime: Date.now() - startTime,
    system: {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      pid: process.pid,
      platform: process.platform,
      nodeVersion: process.version
    },
    databases: databaseHealth,
    connections: connectionStats
  };
  
  // Determine overall status based on database health
  const allDatabasesHealthy = Object.values(databaseHealth).every(
    db => db.status === 'connected'
  );
  
  if (!allDatabasesHealthy) {
    health.status = 'DEGRADED';
    health.message = 'Some database connections are not healthy';
    logger.warn('Health check detected unhealthy database connections', databaseHealth);
  }
  
  const statusCode = health.status === 'OK' ? 200 : 503;
  res.status(statusCode).json(health);
}));

// Database-specific health checks
router.get('/mongodb', catchAsync(async (req, res) => {
  const health = await checkDatabaseHealth();
  const mongoHealth = health.mongodb;
  
  const statusCode = mongoHealth.status === 'connected' ? 200 : 503;
  res.status(statusCode).json({
    service: 'MongoDB',
    ...mongoHealth,
    timestamp: new Date().toISOString()
  });
}));

router.get('/redis', catchAsync(async (req, res) => {
  const health = await checkDatabaseHealth();
  const redisHealth = health.redis;
  
  const statusCode = redisHealth.status === 'connected' ? 200 : 503;
  res.status(statusCode).json({
    service: 'Redis',
    ...redisHealth,
    timestamp: new Date().toISOString()
  });
}));

module.exports = router;