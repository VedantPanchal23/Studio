const Docker = require('dockerode');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');
const containerSecurityService = require('./containerSecurityService');
const containerCleanupService = require('./containerCleanupService');

class DockerService {
  constructor() {
    this.docker = new Docker();
    this.containers = new Map(); // Track active containers
    this.baseImages = {
      'node': 'ide-node:latest',
      'python': 'ide-python:latest',
      'java': 'ide-java:latest',
      'cpp': 'ide-cpp:latest',
      'go': 'ide-go:latest',
      'rust': 'ide-rust:latest'
    };
    
    // Resource limits for containers
    this.resourceLimits = {
      memory: 512 * 1024 * 1024, // 512MB
      cpuQuota: 50000, // 50% of CPU
      cpuPeriod: 100000,
      networkMode: 'none', // No network access by default
      readonlyRootfs: false, // Allow writes to /tmp
      tmpfs: {
        '/tmp': 'rw,noexec,nosuid,size=100m'
      }
    };
  }

  /**
   * Initialize Docker service and pull base images
   */
  async initialize() {
    try {
      // Test Docker connection
      await this.docker.ping();
      logger.info('Docker connection established');
      
      // Pull base images if they don't exist
      await this.pullBaseImages();
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize Docker service:', error);
      throw new Error('Docker service initialization failed');
    }
  }

  /**
   * Pull all base images for supported languages
   */
  async pullBaseImages() {
    const pullPromises = Object.entries(this.baseImages).map(async ([language, image]) => {
      try {
        logger.info(`Pulling base image for ${language}: ${image}`);
        
        // Check if image exists locally
        const images = await this.docker.listImages({
          filters: { reference: [image] }
        });
        
        if (images && images.length === 0) {
          // Pull image if it doesn't exist
          const stream = await this.docker.pull(image);
          await this.followProgress(stream);
          logger.info(`Successfully pulled ${image}`);
        } else {
          logger.info(`Image ${image} already exists locally`);
        }
      } catch (error) {
        logger.error(`Failed to pull image ${image}:`, error);
        // Don't throw here, continue with other images
      }
    });
    
    await Promise.allSettled(pullPromises);
  }

  /**
   * Create and start a container for code execution
   */
  async createContainer(language, workspaceId, userId) {
    try {
      const baseImage = this.baseImages[language];
      if (!baseImage) {
        throw new Error(`Unsupported language: ${language}`);
      }

      // Get secure container configuration
      const secureConfig = containerSecurityService.getSecureContainerConfig(language, workspaceId, userId);
      
      const containerConfig = {
        Image: baseImage,
        WorkingDir: '/workspace',
        Cmd: this.getDefaultCommand(language),
        Tty: true,
        OpenStdin: true,
        StdinOnce: false,
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        ...secureConfig
      };

      const container = await this.docker.createContainer(containerConfig);
      await container.start();
      
      // Store container reference with security monitoring
      const containerInfo = {
        container,
        language,
        workspaceId,
        userId,
        createdAt: new Date(),
        name: secureConfig.name,
        securityLevel: 'high',
        lastActivity: new Date()
      };
      
      this.containers.set(container.id, containerInfo);

      // Start security monitoring for this container
      this.startContainerMonitoring(container.id, containerInfo);

      logger.info(`Created secure container ${secureConfig.name} for ${language} execution`);
      
      return {
        containerId: container.id,
        name: secureConfig.name,
        language,
        status: 'running',
        securityLevel: 'high'
      };
    } catch (error) {
      logger.error('Failed to create container:', error);
      throw new Error(`Container creation failed: ${error.message}`);
    }
  }

  /**
   * Execute code in a container
   */
  async executeCode(containerId, code, filename = 'main') {
    try {
      const containerInfo = this.containers.get(containerId);
      if (!containerInfo) {
        throw new Error('Container not found');
      }

      const { container, language } = containerInfo;
      
      // Update activity timestamp
      this.updateContainerActivity(containerId);
      
      // Create the code file in the container
      const codeFile = this.getCodeFilename(filename, language);
      await this.writeFileToContainer(container, codeFile, code);
      
      // Get execution command
      const execCommand = this.getExecutionCommand(language, codeFile);
      
      // Create exec instance with timeout
      const exec = await container.exec({
        Cmd: execCommand,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false
      });

      // Start execution and return stream
      const stream = await exec.start({ hijack: true, stdin: false });
      
      // Set execution timeout
      const executionTimeout = setTimeout(() => {
        logger.warn(`Execution timeout for container ${containerId}`);
        stream.destroy();
      }, 30000); // 30 second timeout
      
      // Clear timeout when stream ends
      stream.on('end', () => {
        clearTimeout(executionTimeout);
        this.updateContainerActivity(containerId);
      });
      
      stream.on('error', () => {
        clearTimeout(executionTimeout);
      });
      
      return {
        stream,
        exec,
        containerId,
        language,
        timeout: executionTimeout
      };
    } catch (error) {
      logger.error('Code execution failed:', error);
      throw new Error(`Execution failed: ${error.message}`);
    }
  }

  /**
   * Stop and remove a container
   */
  async stopContainer(containerId) {
    try {
      const containerInfo = this.containers.get(containerId);
      if (!containerInfo) {
        logger.warn(`Container ${containerId} not found in tracking map`);
        return;
      }

      const { container, name, monitoringInterval } = containerInfo;
      
      // Stop monitoring
      if (monitoringInterval) {
        clearInterval(monitoringInterval);
      }
      
      try {
        await container.stop({ t: 5 }); // 5 second timeout
        logger.info(`Stopped container ${name}`);
      } catch (error) {
        if (error.statusCode !== 304) { // 304 = already stopped
          logger.error(`Failed to stop container ${name}:`, error);
        }
      }

      // Remove from tracking
      this.containers.delete(containerId);
      
    } catch (error) {
      logger.error('Failed to stop container:', error);
      throw new Error(`Container stop failed: ${error.message}`);
    }
  }

  /**
   * Get container status and info
   */
  async getContainerInfo(containerId) {
    try {
      const containerInfo = this.containers.get(containerId);
      if (!containerInfo) {
        return null;
      }

      const { container, language, workspaceId, userId, createdAt, name } = containerInfo;
      const inspect = await container.inspect();
      
      return {
        id: containerId,
        name,
        language,
        workspaceId,
        userId,
        createdAt,
        status: inspect.State.Status,
        running: inspect.State.Running,
        startedAt: inspect.State.StartedAt,
        finishedAt: inspect.State.FinishedAt,
        exitCode: inspect.State.ExitCode
      };
    } catch (error) {
      logger.error('Failed to get container info:', error);
      return null;
    }
  }

  /**
   * List all active containers for a workspace
   */
  async listWorkspaceContainers(workspaceId) {
    const workspaceContainers = [];
    
    for (const [containerId, info] of this.containers.entries()) {
      if (info.workspaceId === workspaceId) {
        const containerInfo = await this.getContainerInfo(containerId);
        if (containerInfo) {
          workspaceContainers.push(containerInfo);
        }
      }
    }
    
    return workspaceContainers;
  }

  /**
   * Start security monitoring for a container
   */
  async startContainerMonitoring(containerId, containerInfo) {
    try {
      // Monitor container every 10 seconds
      const monitoringInterval = setInterval(async () => {
        try {
          const metrics = await containerSecurityService.monitorContainer(containerId, containerInfo);
          
          if (metrics && metrics.shouldTerminate) {
            logger.error(`Security violation detected for container ${containerId}. Terminating.`);
            clearInterval(monitoringInterval);
            await this.stopContainer(containerId);
          }
        } catch (error) {
          logger.error(`Monitoring failed for container ${containerId}:`, error);
        }
      }, 10000);
      
      // Store monitoring interval for cleanup
      containerInfo.monitoringInterval = monitoringInterval;
      
    } catch (error) {
      logger.error(`Failed to start monitoring for container ${containerId}:`, error);
    }
  }

  /**
   * Update container activity timestamp
   */
  updateContainerActivity(containerId) {
    const containerInfo = this.containers.get(containerId);
    if (containerInfo) {
      containerInfo.lastActivity = new Date();
    }
  }

  /**
   * Cleanup old containers (called periodically)
   */
  async cleanupContainers() {
    // Delegate to the cleanup service
    try {
      await containerCleanupService.performScheduledCleanup();
    } catch (error) {
      logger.error('Container cleanup failed:', error);
    }
  }

  // Helper methods

  getDefaultCommand(language) {
    const commands = {
      'node': ['/bin/sh'],
      'python': ['/bin/sh'],
      'java': ['/bin/sh'],
      'cpp': ['/bin/sh'],
      'go': ['/bin/sh'],
      'rust': ['/bin/sh']
    };
    return commands[language] || ['/bin/sh'];
  }

  getCodeFilename(filename, language) {
    const extensions = {
      'node': 'js',
      'python': 'py',
      'java': 'java',
      'cpp': 'cpp',
      'go': 'go',
      'rust': 'rs'
    };
    const ext = extensions[language] || 'txt';
    return `${filename}.${ext}`;
  }

  getExecutionCommand(language, filename) {
    const commands = {
      'node': ['node', filename],
      'python': ['python', filename],
      'java': ['sh', '-c', `javac ${filename} && java ${filename.replace('.java', '')}`],
      'cpp': ['sh', '-c', `g++ -o main ${filename} && ./main`],
      'go': ['go', 'run', filename],
      'rust': ['sh', '-c', `rustc ${filename} -o main && ./main`]
    };
    return commands[language] || ['cat', filename];
  }

  async writeFileToContainer(container, filename, content) {
    // Create a tar archive with the file
    const tar = require('tar-stream');
    const pack = tar.pack();
    
    pack.entry({ name: filename }, content);
    pack.finalize();
    
    // Put the archive into the container
    await container.putArchive(pack, { path: '/workspace' });
  }

  async followProgress(stream) {
    return new Promise((resolve, reject) => {
      this.docker.modem.followProgress(stream, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
  }

  /**
   * Get security statistics for all containers
   */
  getSecurityStats() {
    const containerStats = Array.from(this.containers.values()).map(info => ({
      containerId: info.container.id,
      name: info.name,
      language: info.language,
      workspaceId: info.workspaceId,
      userId: info.userId,
      createdAt: info.createdAt,
      lastActivity: info.lastActivity,
      securityLevel: info.securityLevel
    }));

    return {
      totalContainers: this.containers.size,
      containers: containerStats,
      securityService: containerSecurityService.getSecurityStats(),
      cleanupService: containerCleanupService.getCleanupStats()
    };
  }

  /**
   * Get container security metrics
   */
  getContainerSecurityMetrics(containerId) {
    return containerSecurityService.getContainerMetrics(containerId);
  }

  /**
   * Get container security violations
   */
  getContainerSecurityViolations(containerId) {
    return containerSecurityService.getSecurityViolations(containerId);
  }

  /**
   * Force cleanup of a specific container
   */
  async forceCleanupContainer(containerId) {
    return await containerCleanupService.forceCleanupContainer(containerId);
  }
}

module.exports = new DockerService();