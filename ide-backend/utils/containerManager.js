const dockerService = require('../services/dockerService');
const logger = require('./logger');

class ContainerManager {
  constructor() {
    this.cleanupInterval = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the container manager
   */
  async initialize() {
    try {
      // Initialize Docker service
      const dockerAvailable = await dockerService.initialize();

      if (dockerAvailable) {
        // Start cleanup interval (every 5 minutes)
        this.startCleanupInterval();
      } else {
        logger.warn('Container manager initialized without Docker. Code execution features will be disabled.');
      }

      this.isInitialized = true;
      logger.info('Container manager initialized successfully');

      return true;
    } catch (error) {
      logger.error('Failed to initialize container manager:', error);
      throw error;
    }
  }

  /**
   * Start periodic cleanup of old containers
   */
  startCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(async () => {
      try {
        await dockerService.cleanupContainers();
      } catch (error) {
        logger.error('Container cleanup failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Stop cleanup interval
   */
  stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    logger.info('Shutting down container manager...');

    this.stopCleanupInterval();

    // Stop all tracked containers
    try {
      const containers = Array.from(dockerService.containers.keys());
      const stopPromises = containers.map(containerId =>
        dockerService.stopContainer(containerId).catch(err =>
          logger.error(`Failed to stop container ${containerId}:`, err)
        )
      );

      await Promise.allSettled(stopPromises);
      logger.info('All containers stopped');
    } catch (error) {
      logger.error('Error during container shutdown:', error);
    }

    this.isInitialized = false;
  }

  /**
   * Health check for container manager
   */
  async healthCheck() {
    try {
      if (!this.isInitialized) {
        return { status: 'unhealthy', message: 'Container manager not initialized' };
      }

      if (!dockerService.isAvailable) {
        return {
          status: 'degraded',
          message: 'Docker is not available. Code execution features are disabled.',
          activeContainers: 0,
          cleanupInterval: 'disabled'
        };
      }

      // Test Docker connection
      await dockerService.docker.ping();

      const containerCount = dockerService.containers.size;

      return {
        status: 'healthy',
        message: 'Container manager is running',
        activeContainers: containerCount,
        cleanupInterval: this.cleanupInterval ? 'running' : 'stopped'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        error: error.name
      };
    }
  }

  /**
   * Get statistics about container usage
   */
  async getStats() {
    try {
      const containers = dockerService.containers;
      const stats = {
        totalContainers: containers.size,
        containersByLanguage: {},
        containersByWorkspace: {},
        oldestContainer: null,
        newestContainer: null
      };

      let oldest = null;
      let newest = null;

      for (const [containerId, info] of containers.entries()) {
        // Count by language
        stats.containersByLanguage[info.language] =
          (stats.containersByLanguage[info.language] || 0) + 1;

        // Count by workspace
        stats.containersByWorkspace[info.workspaceId] =
          (stats.containersByWorkspace[info.workspaceId] || 0) + 1;

        // Track oldest and newest
        if (!oldest || info.createdAt < oldest.createdAt) {
          oldest = { containerId, ...info };
        }
        if (!newest || info.createdAt > newest.createdAt) {
          newest = { containerId, ...info };
        }
      }

      stats.oldestContainer = oldest;
      stats.newestContainer = newest;

      return stats;
    } catch (error) {
      logger.error('Failed to get container stats:', error);
      throw error;
    }
  }

  /**
   * Shutdown the container manager
   */
  async shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (dockerService.isAvailable) {
      try {
        // Stop all running containers
        const containers = Array.from(dockerService.containers.keys());
        for (const containerId of containers) {
          await dockerService.stopContainer(containerId).catch(err =>
            logger.warn(`Failed to stop container ${containerId}:`, err.message)
          );
        }
        logger.info('Container manager shutdown completed');
      } catch (error) {
        logger.error('Error during container manager shutdown:', error);
      }
    }
  }
}

module.exports = new ContainerManager();