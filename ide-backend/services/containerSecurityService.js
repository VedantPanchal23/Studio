const logger = require('../utils/logger');
const crypto = require('crypto');

class ContainerSecurityService {
  constructor() {
    // Enhanced security configuration
    this.securityConfig = {
      // Resource limits
      resources: {
        memory: 256 * 1024 * 1024, // 256MB (reduced from 512MB)
        memorySwap: 256 * 1024 * 1024, // Same as memory (no additional swap)
        cpuQuota: 25000, // 25% of CPU (reduced from 50%)
        cpuPeriod: 100000,
        cpuShares: 512, // Lower priority
        pidsLimit: 50, // Limit number of processes
        ulimits: [
          { Name: 'nofile', Soft: 1024, Hard: 1024 }, // File descriptors
          { Name: 'nproc', Soft: 50, Hard: 50 }, // Process limit
          { Name: 'fsize', Soft: 100 * 1024 * 1024, Hard: 100 * 1024 * 1024 } // File size 100MB
        ]
      },
      
      // Network isolation
      network: {
        networkMode: 'none', // Complete network isolation
        publishAllPorts: false,
        dns: [], // No DNS servers
        dnsSearch: []
      },
      
      // Security options
      security: {
        securityOpt: [
          'no-new-privileges:true',
          'seccomp=unconfined', // Will be restricted later
          'apparmor=docker-default'
        ],
        capDrop: ['ALL'], // Drop all capabilities
        capAdd: [], // Add only necessary capabilities
        readonlyRootfs: true, // Read-only root filesystem
        privileged: false,
        usernsMode: '', // Use default user namespace
        cgroupParent: ''
      },
      
      // Filesystem restrictions
      filesystem: {
        tmpfs: {
          '/tmp': 'rw,noexec,nosuid,nodev,size=50m',
          '/var/tmp': 'rw,noexec,nosuid,nodev,size=10m'
        },
        binds: [], // No host mounts
        volumesFrom: []
      },
      
      // Runtime limits
      runtime: {
        maxExecutionTime: 30000, // 30 seconds
        maxOutputSize: 1024 * 1024, // 1MB output limit
        killTimeout: 5000, // 5 seconds to graceful shutdown
        cleanupDelay: 1000 // 1 second delay before cleanup
      }
    };
    
    // Container monitoring
    this.containerMetrics = new Map();
    this.securityViolations = new Map();
    
    // Cleanup intervals
    this.cleanupInterval = null;
    this.monitoringInterval = null;
    
    this.startMonitoring();
  }

  /**
   * Get secure container configuration
   */
  getSecureContainerConfig(language, workspaceId, userId) {
    const containerName = this.generateSecureContainerName(language, workspaceId, userId);
    
    return {
      name: containerName,
      HostConfig: {
        // Resource limits
        Memory: this.securityConfig.resources.memory,
        MemorySwap: this.securityConfig.resources.memorySwap,
        CpuQuota: this.securityConfig.resources.cpuQuota,
        CpuPeriod: this.securityConfig.resources.cpuPeriod,
        CpuShares: this.securityConfig.resources.cpuShares,
        PidsLimit: this.securityConfig.resources.pidsLimit,
        Ulimits: this.securityConfig.resources.ulimits,
        
        // Network isolation
        NetworkMode: this.securityConfig.network.networkMode,
        PublishAllPorts: this.securityConfig.network.publishAllPorts,
        Dns: this.securityConfig.network.dns,
        DnsSearch: this.securityConfig.network.dnsSearch,
        
        // Security options
        SecurityOpt: this.securityConfig.security.securityOpt,
        CapDrop: this.securityConfig.security.capDrop,
        CapAdd: this.securityConfig.security.capAdd,
        ReadonlyRootfs: this.securityConfig.security.readonlyRootfs,
        Privileged: this.securityConfig.security.privileged,
        
        // Filesystem
        Tmpfs: this.securityConfig.filesystem.tmpfs,
        Binds: this.securityConfig.filesystem.binds,
        VolumesFrom: this.securityConfig.filesystem.volumesFrom,
        
        // Auto-remove for cleanup
        AutoRemove: true,
        
        // Restart policy - never restart
        RestartPolicy: {
          Name: 'no'
        }
      },
      
      // Environment variables (minimal)
      Env: [
        'HOME=/tmp',
        'USER=appuser',
        'PATH=/usr/local/bin:/usr/bin:/bin',
        `LANGUAGE=${language}`,
        'TERM=xterm'
      ],
      
      // Labels for identification and monitoring
      Labels: {
        'ide.workspace': workspaceId,
        'ide.user': userId,
        'ide.language': language,
        'ide.created': new Date().toISOString(),
        'ide.security.level': 'high',
        'ide.version': '1.0'
      },
      
      // Working directory
      WorkingDir: '/workspace',
      
      // Disable networking
      NetworkDisabled: true,
      
      // User configuration
      User: 'appuser'
    };
  }

  /**
   * Generate secure container name with random suffix
   */
  generateSecureContainerName(language, workspaceId, userId) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `ide-${language}-${workspaceId.slice(0, 8)}-${userId.slice(0, 8)}-${timestamp}-${random}`;
  }

  /**
   * Monitor container resource usage
   */
  async monitorContainer(containerId, containerInfo) {
    try {
      const { container } = containerInfo;
      const stats = await container.stats({ stream: false });
      
      const metrics = {
        containerId,
        timestamp: new Date(),
        memory: {
          usage: stats.memory_stats.usage || 0,
          limit: stats.memory_stats.limit || 0,
          percentage: stats.memory_stats.usage && stats.memory_stats.limit 
            ? (stats.memory_stats.usage / stats.memory_stats.limit) * 100 
            : 0
        },
        cpu: {
          usage: this.calculateCpuUsage(stats),
          throttling: stats.cpu_stats.throttling_data || {}
        },
        network: stats.networks || {},
        pids: stats.pids_stats || {}
      };
      
      this.containerMetrics.set(containerId, metrics);
      
      // Check for security violations
      await this.checkSecurityViolations(containerId, metrics);
      
      return metrics;
    } catch (error) {
      logger.error(`Failed to monitor container ${containerId}:`, error);
      return null;
    }
  }

  /**
   * Check for security violations
   */
  async checkSecurityViolations(containerId, metrics) {
    const violations = [];
    
    // Memory usage violation
    if (metrics.memory.percentage > 95) {
      violations.push({
        type: 'memory_limit',
        severity: 'high',
        message: `Memory usage exceeded 95%: ${metrics.memory.percentage.toFixed(2)}%`
      });
    }
    
    // CPU throttling violation
    if (metrics.cpu.throttling.throttled_periods > 10) {
      violations.push({
        type: 'cpu_throttling',
        severity: 'medium',
        message: `High CPU throttling detected: ${metrics.cpu.throttling.throttled_periods} periods`
      });
    }
    
    // Process limit violation
    if (metrics.pids.current > 40) {
      violations.push({
        type: 'process_limit',
        severity: 'high',
        message: `High process count: ${metrics.pids.current}`
      });
    }
    
    if (violations.length > 0) {
      this.securityViolations.set(containerId, {
        timestamp: new Date(),
        violations
      });
      
      logger.warn(`Security violations detected for container ${containerId}:`, violations);
      
      // Take action for high severity violations
      const highSeverityViolations = violations.filter(v => v.severity === 'high');
      if (highSeverityViolations.length > 0) {
        logger.error(`High severity security violations detected for container ${containerId}. Terminating container.`);
        // Container will be terminated by the calling service
        return { shouldTerminate: true, violations: highSeverityViolations };
      }
    }
    
    return { shouldTerminate: false, violations };
  }

  /**
   * Calculate CPU usage percentage
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
   * Start container monitoring
   */
  startMonitoring() {
    // Monitor containers every 5 seconds
    this.monitoringInterval = setInterval(() => {
      this.performSecurityScan();
    }, 5000);
    
    // Cleanup old metrics every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, 60000);
    
    logger.info('Container security monitoring started');
  }

  /**
   * Perform security scan on all tracked containers
   */
  async performSecurityScan() {
    // This will be called by the docker service for each container
    // Implementation depends on integration with dockerService
  }

  /**
   * Cleanup old metrics and violations
   */
  cleanupOldMetrics() {
    const maxAge = 10 * 60 * 1000; // 10 minutes
    const now = new Date();
    
    // Cleanup metrics
    for (const [containerId, metrics] of this.containerMetrics.entries()) {
      if (now - metrics.timestamp > maxAge) {
        this.containerMetrics.delete(containerId);
      }
    }
    
    // Cleanup violations
    for (const [containerId, violation] of this.securityViolations.entries()) {
      if (now - violation.timestamp > maxAge) {
        this.securityViolations.delete(containerId);
      }
    }
  }

  /**
   * Get container metrics
   */
  getContainerMetrics(containerId) {
    return this.containerMetrics.get(containerId) || null;
  }

  /**
   * Get security violations for container
   */
  getSecurityViolations(containerId) {
    return this.securityViolations.get(containerId) || null;
  }

  /**
   * Get all security statistics
   */
  getSecurityStats() {
    return {
      totalContainers: this.containerMetrics.size,
      violationsCount: this.securityViolations.size,
      activeViolations: Array.from(this.securityViolations.values())
        .filter(v => (new Date() - v.timestamp) < 60000), // Last minute
      resourceLimits: this.securityConfig.resources,
      securityLevel: 'high'
    };
  }

  /**
   * Update security configuration
   */
  updateSecurityConfig(newConfig) {
    this.securityConfig = { ...this.securityConfig, ...newConfig };
    logger.info('Container security configuration updated');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    logger.info('Container security monitoring stopped');
  }
}

module.exports = new ContainerSecurityService();