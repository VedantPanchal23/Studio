const Docker = require('dockerode');
const logger = require('../utils/logger');

class ContainerCleanupService {
  constructor() {
    this.docker = new Docker();
    this.cleanupInterval = null;
    this.orphanCheckInterval = null;
    
    // Cleanup configuration
    this.config = {
      // Container age limits
      maxContainerAge: 30 * 60 * 1000, // 30 minutes
      maxIdleTime: 10 * 60 * 1000, // 10 minutes of inactivity
      
      // Cleanup intervals
      cleanupIntervalMs: 5 * 60 * 1000, // 5 minutes
      orphanCheckIntervalMs: 2 * 60 * 1000, // 2 minutes
      
      // Resource thresholds for emergency cleanup
      emergencyCleanup: {
        memoryThreshold: 0.9, // 90% memory usage
        diskThreshold: 0.85, // 85% disk usage
        containerCountThreshold: 50 // Max containers
      },
      
      // Grace periods
      gracefulShutdownTimeout: 10000, // 10 seconds
      forceKillTimeout: 5000, // 5 seconds after graceful
      
      // Retention
      keepContainerLogs: false,
      maxLogSize: 10 * 1024 * 1024 // 10MB
    };
    
    // Tracking
    this.cleanupStats = {
      totalCleaned: 0,
      lastCleanup: null,
      emergencyCleanups: 0,
      orphansFound: 0,
      errors: 0
    };
    
    this.startCleanupScheduler();
  }

  /**
   * Start the cleanup scheduler
   */
  startCleanupScheduler() {
    // Regular cleanup
    this.cleanupInterval = setInterval(() => {
      this.performScheduledCleanup();
    }, this.config.cleanupIntervalMs);
    
    // Orphan container check
    this.orphanCheckInterval = setInterval(() => {
      this.checkForOrphanContainers();
    }, this.config.orphanCheckIntervalMs);
    
    logger.info('Container cleanup scheduler started');
  }

  /**
   * Perform scheduled cleanup
   */
  async performScheduledCleanup() {
    try {
      logger.info('Starting scheduled container cleanup');
      
      const cleanupResults = await Promise.allSettled([
        this.cleanupOldContainers(),
        this.cleanupIdleContainers(),
        this.cleanupExitedContainers(),
        this.cleanupImages(),
        this.cleanupVolumes(),
        this.cleanupNetworks()
      ]);
      
      // Check for emergency cleanup conditions
      await this.checkEmergencyCleanup();
      
      this.cleanupStats.lastCleanup = new Date();
      
      // Log results
      const errors = cleanupResults.filter(result => result.status === 'rejected');
      if (errors.length > 0) {
        logger.error('Some cleanup operations failed:', errors.map(e => e.reason));
        this.cleanupStats.errors += errors.length;
      }
      
      logger.info('Scheduled container cleanup completed');
      
    } catch (error) {
      logger.error('Scheduled cleanup failed:', error);
      this.cleanupStats.errors++;
    }
  }

  /**
   * Clean up containers older than max age
   */
  async cleanupOldContainers() {
    try {
      const containers = await this.docker.listContainers({
        all: true,
        filters: {
          label: ['ide.workspace'] // Only IDE containers
        }
      });
      
      const now = new Date();
      const oldContainers = containers.filter(containerInfo => {
        const created = new Date(containerInfo.Created * 1000);
        const age = now - created;
        return age > this.config.maxContainerAge;
      });
      
      logger.info(`Found ${oldContainers.length} old containers to cleanup`);
      
      for (const containerInfo of oldContainers) {
        await this.cleanupContainer(containerInfo.Id, 'age_limit');
      }
      
      return oldContainers.length;
    } catch (error) {
      logger.error('Failed to cleanup old containers:', error);
      throw error;
    }
  }

  /**
   * Clean up idle containers (no recent activity)
   */
  async cleanupIdleContainers() {
    try {
      const containers = await this.docker.listContainers({
        filters: {
          label: ['ide.workspace'],
          status: ['running']
        }
      });
      
      const now = new Date();
      let idleCount = 0;
      
      for (const containerInfo of containers) {
        try {
          const container = this.docker.getContainer(containerInfo.Id);
          const stats = await container.stats({ stream: false });
          
          // Check if container has been idle (no CPU activity)
          const cpuUsage = this.calculateCpuUsage(stats);
          const lastActivity = this.getLastActivityTime(containerInfo.Id);
          
          if (cpuUsage < 1 && lastActivity && (now - lastActivity) > this.config.maxIdleTime) {
            await this.cleanupContainer(containerInfo.Id, 'idle');
            idleCount++;
          }
        } catch (error) {
          logger.warn(`Failed to check idle status for container ${containerInfo.Id}:`, error);
        }
      }
      
      logger.info(`Cleaned up ${idleCount} idle containers`);
      return idleCount;
    } catch (error) {
      logger.error('Failed to cleanup idle containers:', error);
      throw error;
    }
  }

  /**
   * Clean up exited containers
   */
  async cleanupExitedContainers() {
    try {
      const containers = await this.docker.listContainers({
        all: true,
        filters: {
          label: ['ide.workspace'],
          status: ['exited', 'dead']
        }
      });
      
      logger.info(`Found ${containers.length} exited containers to cleanup`);
      
      for (const containerInfo of containers) {
        await this.cleanupContainer(containerInfo.Id, 'exited');
      }
      
      return containers.length;
    } catch (error) {
      logger.error('Failed to cleanup exited containers:', error);
      throw error;
    }
  }

  /**
   * Clean up unused images
   */
  async cleanupImages() {
    try {
      // Get dangling images (not tagged and not used by containers)
      const images = await this.docker.listImages({
        filters: {
          dangling: ['true']
        }
      });
      
      let removedCount = 0;
      
      for (const imageInfo of images) {
        try {
          const image = this.docker.getImage(imageInfo.Id);
          await image.remove({ force: false });
          removedCount++;
        } catch (error) {
          // Image might be in use, skip
          logger.debug(`Could not remove image ${imageInfo.Id}:`, error.message);
        }
      }
      
      logger.info(`Removed ${removedCount} dangling images`);
      return removedCount;
    } catch (error) {
      logger.error('Failed to cleanup images:', error);
      throw error;
    }
  }

  /**
   * Clean up unused volumes
   */
  async cleanupVolumes() {
    try {
      const volumes = await this.docker.listVolumes({
        filters: {
          dangling: ['true']
        }
      });
      
      let removedCount = 0;
      
      if (volumes.Volumes) {
        for (const volumeInfo of volumes.Volumes) {
          try {
            const volume = this.docker.getVolume(volumeInfo.Name);
            await volume.remove();
            removedCount++;
          } catch (error) {
            logger.debug(`Could not remove volume ${volumeInfo.Name}:`, error.message);
          }
        }
      }
      
      logger.info(`Removed ${removedCount} dangling volumes`);
      return removedCount;
    } catch (error) {
      logger.error('Failed to cleanup volumes:', error);
      throw error;
    }
  }

  /**
   * Clean up unused networks
   */
  async cleanupNetworks() {
    try {
      const networks = await this.docker.listNetworks({
        filters: {
          label: ['ide.network']
        }
      });
      
      let removedCount = 0;
      
      for (const networkInfo of networks) {
        try {
          // Check if network is in use
          if (!networkInfo.Containers || Object.keys(networkInfo.Containers).length === 0) {
            const network = this.docker.getNetwork(networkInfo.Id);
            await network.remove();
            removedCount++;
          }
        } catch (error) {
          logger.debug(`Could not remove network ${networkInfo.Id}:`, error.message);
        }
      }
      
      logger.info(`Removed ${removedCount} unused networks`);
      return removedCount;
    } catch (error) {
      logger.error('Failed to cleanup networks:', error);
      throw error;
    }
  }

  /**
   * Clean up a specific container
   */
  async cleanupContainer(containerId, reason) {
    try {
      const container = this.docker.getContainer(containerId);
      const containerInfo = await container.inspect();
      
      logger.info(`Cleaning up container ${containerId} (${containerInfo.Name}) - Reason: ${reason}`);
      
      if (containerInfo.State.Running) {
        // Graceful shutdown first
        try {
          await container.stop({ t: this.config.gracefulShutdownTimeout / 1000 });
        } catch (error) {
          // Force kill if graceful shutdown fails
          logger.warn(`Graceful shutdown failed for ${containerId}, force killing`);
          await container.kill();
        }
      }
      
      // Remove container
      try {
        await container.remove({ 
          force: true, 
          v: true // Remove associated volumes
        });
      } catch (error) {
        if (error.statusCode !== 404) { // Container already removed
          throw error;
        }
      }
      
      this.cleanupStats.totalCleaned++;
      logger.info(`Successfully cleaned up container ${containerId}`);
      
    } catch (error) {
      logger.error(`Failed to cleanup container ${containerId}:`, error);
      throw error;
    }
  }

  /**
   * Check for orphan containers (not tracked by the application)
   */
  async checkForOrphanContainers() {
    try {
      const containers = await this.docker.listContainers({
        all: true,
        filters: {
          label: ['ide.workspace']
        }
      });
      
      // Get list of containers that should be tracked
      // This would need integration with the main docker service
      const trackedContainers = new Set(); // Would be populated from dockerService
      
      const orphans = containers.filter(container => 
        !trackedContainers.has(container.Id)
      );
      
      if (orphans.length > 0) {
        logger.warn(`Found ${orphans.length} orphan containers`);
        this.cleanupStats.orphansFound += orphans.length;
        
        for (const orphan of orphans) {
          await this.cleanupContainer(orphan.Id, 'orphan');
        }
      }
      
    } catch (error) {
      logger.error('Failed to check for orphan containers:', error);
    }
  }

  /**
   * Check if emergency cleanup is needed
   */
  async checkEmergencyCleanup() {
    try {
      const systemInfo = await this.docker.info();
      const containers = await this.docker.listContainers({ all: true });
      
      const ideContainers = containers.filter(c => 
        c.Labels && c.Labels['ide.workspace']
      );
      
      let needsEmergencyCleanup = false;
      const reasons = [];
      
      // Check container count
      if (ideContainers.length > this.config.emergencyCleanup.containerCountThreshold) {
        needsEmergencyCleanup = true;
        reasons.push(`Too many containers: ${ideContainers.length}`);
      }
      
      // Check memory usage (if available)
      if (systemInfo.MemTotal && systemInfo.MemTotal > 0) {
        const memoryUsage = (systemInfo.MemTotal - systemInfo.MemAvailable) / systemInfo.MemTotal;
        if (memoryUsage > this.config.emergencyCleanup.memoryThreshold) {
          needsEmergencyCleanup = true;
          reasons.push(`High memory usage: ${(memoryUsage * 100).toFixed(1)}%`);
        }
      }
      
      if (needsEmergencyCleanup) {
        logger.error(`Emergency cleanup triggered: ${reasons.join(', ')}`);
        await this.performEmergencyCleanup();
        this.cleanupStats.emergencyCleanups++;
      }
      
    } catch (error) {
      logger.error('Failed to check emergency cleanup conditions:', error);
    }
  }

  /**
   * Perform emergency cleanup
   */
  async performEmergencyCleanup() {
    try {
      logger.warn('Performing emergency cleanup');
      
      // Get all IDE containers sorted by age (oldest first)
      const containers = await this.docker.listContainers({
        all: true,
        filters: {
          label: ['ide.workspace']
        }
      });
      
      const sortedContainers = containers.sort((a, b) => a.Created - b.Created);
      
      // Remove oldest containers first
      const containersToRemove = Math.ceil(sortedContainers.length * 0.5); // Remove 50%
      
      for (let i = 0; i < containersToRemove && i < sortedContainers.length; i++) {
        await this.cleanupContainer(sortedContainers[i].Id, 'emergency');
      }
      
      // Also cleanup images and volumes aggressively
      await this.cleanupImages();
      await this.cleanupVolumes();
      
      logger.warn(`Emergency cleanup completed. Removed ${containersToRemove} containers`);
      
    } catch (error) {
      logger.error('Emergency cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Get last activity time for a container (placeholder)
   */
  getLastActivityTime(containerId) {
    // This would integrate with the execution service to track activity
    // For now, return current time minus a random offset
    return new Date(Date.now() - Math.random() * this.config.maxIdleTime);
  }

  /**
   * Calculate CPU usage from stats
   */
  calculateCpuUsage(stats) {
    if (!stats.cpu_stats || !stats.precpu_stats) {
      return 0;
    }
    
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const numberCpus = stats.cpu_stats.online_cpus || 1;
    
    if (systemDelta > 0 && cpuDelta > 0) {
      return (cpuDelta / systemDelta) * numberCpus * 100;
    }
    
    return 0;
  }

  /**
   * Force cleanup of specific container
   */
  async forceCleanupContainer(containerId) {
    try {
      await this.cleanupContainer(containerId, 'forced');
      return true;
    } catch (error) {
      logger.error(`Force cleanup failed for container ${containerId}:`, error);
      return false;
    }
  }

  /**
   * Get cleanup statistics
   */
  getCleanupStats() {
    return {
      ...this.cleanupStats,
      config: this.config,
      nextCleanup: this.cleanupInterval ? 
        new Date(Date.now() + this.config.cleanupIntervalMs) : null
    };
  }

  /**
   * Update cleanup configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    logger.info('Container cleanup configuration updated');
  }

  /**
   * Stop cleanup scheduler
   */
  stopCleanupScheduler() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    if (this.orphanCheckInterval) {
      clearInterval(this.orphanCheckInterval);
      this.orphanCheckInterval = null;
    }
    
    logger.info('Container cleanup scheduler stopped');
  }
}

module.exports = new ContainerCleanupService();