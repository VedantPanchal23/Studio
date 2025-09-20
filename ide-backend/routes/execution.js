const express = require('express');
const { body, param, validationResult } = require('express-validator');
const dockerService = require('../services/dockerService');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all execution routes
router.use(authenticateToken);

/**
 * Create and start a new execution container
 * POST /api/execution/containers
 */
router.post('/containers', [
  body('language')
    .isIn(['node', 'python', 'java', 'cpp', 'go', 'rust'])
    .withMessage('Unsupported language'),
  body('workspaceId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Workspace ID is required')
], async (req, res) => {
  try {
    if (!dockerService.isAvailable) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Code execution is not available: Docker is not running'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { language, workspaceId } = req.body;
    const userId = req.user.id;

    logger.info(`Creating container for user ${userId}, workspace ${workspaceId}, language ${language}`);

    const container = await dockerService.createContainer(language, workspaceId, userId);

    res.status(201).json({
      success: true,
      container
    });

  } catch (error) {
    logger.error('Container creation failed:', error);
    res.status(500).json({
      error: 'Container creation failed',
      message: error.message
    });
  }
});

/**
 * Execute code in a container
 * POST /api/execution/execute
 */
router.post('/execute', [
  body('containerId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Container ID is required'),
  body('code')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Code is required'),
  body('filename')
    .optional()
    .isString()
    .withMessage('Filename must be a string')
], async (req, res) => {
  try {
    if (!dockerService.isAvailable) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Code execution is not available: Docker is not running'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { containerId, code, filename = 'main' } = req.body;
    const userId = req.user.id;

    logger.info(`Executing code for user ${userId}, container ${containerId}`);

    // Verify container belongs to user
    const containerInfo = await dockerService.getContainerInfo(containerId);
    if (!containerInfo || containerInfo.userId !== userId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Container not found or access denied'
      });
    }

    const execution = await dockerService.executeCode(containerId, code, filename);

    // Set up streaming response
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // Stream output to client
    execution.stream.on('data', (chunk) => {
      res.write(chunk);
    });

    execution.stream.on('end', () => {
      res.end();
    });

    execution.stream.on('error', (error) => {
      logger.error('Execution stream error:', error);
      res.write(`\nExecution error: ${error.message}\n`);
      res.end();
    });

    // Handle client disconnect
    req.on('close', () => {
      logger.info('Client disconnected, cleaning up execution');
      execution.stream.destroy();
    });

  } catch (error) {
    logger.error('Code execution failed:', error);
    res.status(500).json({
      error: 'Code execution failed',
      message: error.message
    });
  }
});

/**
 * Get container information
 * GET /api/execution/containers/:containerId
 */
router.get('/containers/:containerId', [
  param('containerId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Container ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { containerId } = req.params;
    const userId = req.user.id;

    const containerInfo = await dockerService.getContainerInfo(containerId);

    if (!containerInfo) {
      return res.status(404).json({
        error: 'Container not found'
      });
    }

    // Verify container belongs to user
    if (containerInfo.userId !== userId) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      container: containerInfo
    });

  } catch (error) {
    logger.error('Failed to get container info:', error);
    res.status(500).json({
      error: 'Failed to get container information',
      message: error.message
    });
  }
});

/**
 * Stop and remove a container
 * DELETE /api/execution/containers/:containerId
 */
router.delete('/containers/:containerId', [
  param('containerId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Container ID is required')
], async (req, res) => {
  try {
    if (!dockerService.isAvailable) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Docker is not running'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { containerId } = req.params;
    const userId = req.user.id;

    // Verify container belongs to user
    const containerInfo = await dockerService.getContainerInfo(containerId);
    if (!containerInfo || containerInfo.userId !== userId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Container not found or access denied'
      });
    }

    await dockerService.stopContainer(containerId);

    res.json({
      success: true,
      message: 'Container stopped successfully'
    });

  } catch (error) {
    logger.error('Failed to stop container:', error);
    res.status(500).json({
      error: 'Failed to stop container',
      message: error.message
    });
  }
});

/**
 * List containers for a workspace
 * GET /api/execution/workspaces/:workspaceId/containers
 */
router.get('/workspaces/:workspaceId/containers', [
  param('workspaceId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Workspace ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { workspaceId } = req.params;
    const userId = req.user.id;

    if (!dockerService.isAvailable) {
      return res.json({
        success: true,
        containers: []
      });
    }

    const containers = await dockerService.listWorkspaceContainers(workspaceId);

    // Filter containers to only show user's containers
    const userContainers = containers.filter(container => container.userId === userId);

    res.json({
      success: true,
      containers: userContainers
    });

  } catch (error) {
    logger.error('Failed to list containers:', error);
    res.status(500).json({
      error: 'Failed to list containers',
      message: error.message
    });
  }
});

/**
 * Get execution statistics
 * GET /api/execution/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    if (!dockerService.isAvailable) {
      return res.json({
        success: true,
        stats: {
          totalContainers: 0,
          containersByLanguage: {},
          containersByWorkspace: {},
          activeContainers: 0
        }
      });
    }

    // Get all containers and filter by user
    const allContainers = Array.from(dockerService.containers.values());
    const userContainers = allContainers.filter(container => container.userId === userId);

    const stats = {
      totalContainers: userContainers.length,
      containersByLanguage: {},
      containersByWorkspace: {},
      activeContainers: 0
    };

    for (const container of userContainers) {
      // Count by language
      stats.containersByLanguage[container.language] =
        (stats.containersByLanguage[container.language] || 0) + 1;

      // Count by workspace
      stats.containersByWorkspace[container.workspaceId] =
        (stats.containersByWorkspace[container.workspaceId] || 0) + 1;

      // Check if container is still running
      const info = await dockerService.getContainerInfo(container.containerId);
      if (info && info.running) {
        stats.activeContainers++;
      }
    }

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    logger.error('Failed to get execution stats:', error);
    res.status(500).json({
      error: 'Failed to get execution statistics',
      message: error.message
    });
  }
});

module.exports = router;