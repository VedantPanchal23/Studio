const logger = require('../utils/logger');
const securityConfig = require('../config/security');

class AuditService {
  constructor() {
    this.auditLogs = new Map(); // In-memory storage for demo (use database in production)
    this.maxLogs = 10000; // Maximum logs to keep in memory
    this.cleanupInterval = null;
    
    this.startCleanupScheduler();
  }

  /**
   * Log an audit event
   */
  logEvent(eventType, data) {
    if (!securityConfig.audit.enabled) {
      return;
    }

    if (!securityConfig.audit.events.includes(eventType)) {
      return;
    }

    const auditLog = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      eventType,
      data: this.sanitizeData(data),
      severity: this.getSeverity(eventType),
      source: 'ide-backend'
    };

    // Store in memory (in production, store in database)
    this.auditLogs.set(auditLog.id, auditLog);

    // Maintain size limit
    if (this.auditLogs.size > this.maxLogs) {
      const oldestKey = this.auditLogs.keys().next().value;
      this.auditLogs.delete(oldestKey);
    }

    // Log to application logger
    logger.info('Audit event', auditLog);

    // Check for critical events that need immediate attention
    if (auditLog.severity === 'critical') {
      this.handleCriticalEvent(auditLog);
    }

    return auditLog.id;
  }

  /**
   * Log authentication events
   */
  logAuthentication(userId, success, details = {}) {
    return this.logEvent('authentication', {
      userId,
      success,
      ip: details.ip,
      userAgent: details.userAgent,
      method: details.method || 'jwt',
      reason: details.reason
    });
  }

  /**
   * Log authorization failures
   */
  logAuthorizationFailure(userId, resource, action, details = {}) {
    return this.logEvent('authorization_failure', {
      userId,
      resource,
      action,
      ip: details.ip,
      userAgent: details.userAgent,
      reason: details.reason
    });
  }

  /**
   * Log file access events
   */
  logFileAccess(userId, workspaceId, filePath, action, details = {}) {
    return this.logEvent('file_access', {
      userId,
      workspaceId,
      filePath,
      action, // 'read', 'write', 'delete', 'create'
      ip: details.ip,
      fileSize: details.fileSize,
      success: details.success !== false
    });
  }

  /**
   * Log code execution events
   */
  logCodeExecution(userId, workspaceId, language, details = {}) {
    return this.logEvent('code_execution', {
      userId,
      workspaceId,
      language,
      containerId: details.containerId,
      executionTime: details.executionTime,
      success: details.success !== false,
      error: details.error,
      ip: details.ip
    });
  }

  /**
   * Log container creation events
   */
  logContainerCreation(userId, workspaceId, containerId, language, details = {}) {
    return this.logEvent('container_creation', {
      userId,
      workspaceId,
      containerId,
      language,
      resourceLimits: details.resourceLimits,
      securityLevel: details.securityLevel,
      ip: details.ip
    });
  }

  /**
   * Log security violations
   */
  logSecurityViolation(type, details = {}) {
    return this.logEvent('security_violation', {
      violationType: type,
      userId: details.userId,
      ip: details.ip,
      userAgent: details.userAgent,
      resource: details.resource,
      action: details.action,
      severity: details.severity || 'medium',
      blocked: details.blocked || false,
      reason: details.reason
    });
  }

  /**
   * Log admin actions
   */
  logAdminAction(adminUserId, action, target, details = {}) {
    return this.logEvent('admin_action', {
      adminUserId,
      action,
      target,
      targetId: details.targetId,
      changes: details.changes,
      ip: details.ip,
      userAgent: details.userAgent
    });
  }

  /**
   * Log configuration changes
   */
  logConfigurationChange(userId, configType, changes, details = {}) {
    return this.logEvent('configuration_change', {
      userId,
      configType,
      changes: this.sanitizeData(changes),
      ip: details.ip,
      userAgent: details.userAgent
    });
  }

  /**
   * Get audit logs with filtering
   */
  getLogs(filters = {}) {
    let logs = Array.from(this.auditLogs.values());

    // Apply filters
    if (filters.eventType) {
      logs = logs.filter(log => log.eventType === filters.eventType);
    }

    if (filters.userId) {
      logs = logs.filter(log => log.data.userId === filters.userId);
    }

    if (filters.severity) {
      logs = logs.filter(log => log.severity === filters.severity);
    }

    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      logs = logs.filter(log => new Date(log.timestamp) >= startDate);
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      logs = logs.filter(log => new Date(log.timestamp) <= endDate);
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply pagination
    const limit = Math.min(filters.limit || 100, 1000);
    const offset = filters.offset || 0;

    return {
      logs: logs.slice(offset, offset + limit),
      total: logs.length,
      limit,
      offset
    };
  }

  /**
   * Get audit statistics
   */
  getStatistics(timeRange = '24h') {
    const now = new Date();
    let startTime;

    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const recentLogs = Array.from(this.auditLogs.values())
      .filter(log => new Date(log.timestamp) >= startTime);

    const stats = {
      timeRange,
      totalEvents: recentLogs.length,
      eventTypes: {},
      severityLevels: {},
      topUsers: {},
      securityViolations: 0,
      failedAuthentications: 0,
      adminActions: 0
    };

    recentLogs.forEach(log => {
      // Count by event type
      stats.eventTypes[log.eventType] = (stats.eventTypes[log.eventType] || 0) + 1;

      // Count by severity
      stats.severityLevels[log.severity] = (stats.severityLevels[log.severity] || 0) + 1;

      // Count by user
      if (log.data.userId) {
        stats.topUsers[log.data.userId] = (stats.topUsers[log.data.userId] || 0) + 1;
      }

      // Special counters
      if (log.eventType === 'security_violation') {
        stats.securityViolations++;
      }

      if (log.eventType === 'authentication' && !log.data.success) {
        stats.failedAuthentications++;
      }

      if (log.eventType === 'admin_action') {
        stats.adminActions++;
      }
    });

    return stats;
  }

  /**
   * Generate unique ID for audit log
   */
  generateId() {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize sensitive data from audit logs
   */
  sanitizeData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };
    const sensitiveFields = securityConfig.audit.sensitiveFields;

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    // Recursively sanitize nested objects
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    });

    return sanitized;
  }

  /**
   * Get severity level for event type
   */
  getSeverity(eventType) {
    const severityMap = {
      'authentication': 'info',
      'authorization_failure': 'warning',
      'file_access': 'info',
      'code_execution': 'info',
      'container_creation': 'info',
      'security_violation': 'critical',
      'admin_action': 'warning',
      'configuration_change': 'warning'
    };

    return severityMap[eventType] || 'info';
  }

  /**
   * Handle critical events that need immediate attention
   */
  handleCriticalEvent(auditLog) {
    logger.error('Critical security event detected', auditLog);

    // In production, you might want to:
    // - Send alerts to security team
    // - Trigger automated responses
    // - Update security monitoring dashboards
    // - Block suspicious IPs
    
    // For now, just log the critical event
    if (auditLog.eventType === 'security_violation') {
      logger.error('Security violation requires attention', {
        violationType: auditLog.data.violationType,
        userId: auditLog.data.userId,
        ip: auditLog.data.ip,
        blocked: auditLog.data.blocked
      });
    }
  }

  /**
   * Start cleanup scheduler to remove old logs
   */
  startCleanupScheduler() {
    // Clean up old logs every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldLogs();
    }, 60 * 60 * 1000);
  }

  /**
   * Clean up old audit logs
   */
  cleanupOldLogs() {
    const retentionPeriod = securityConfig.audit.retention;
    const cutoffTime = new Date(Date.now() - retentionPeriod);

    let removedCount = 0;
    for (const [id, log] of this.auditLogs.entries()) {
      if (new Date(log.timestamp) < cutoffTime) {
        this.auditLogs.delete(id);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      logger.info(`Cleaned up ${removedCount} old audit logs`);
    }
  }

  /**
   * Export audit logs (for compliance/backup)
   */
  exportLogs(format = 'json', filters = {}) {
    const logs = this.getLogs(filters);

    switch (format) {
      case 'json':
        return JSON.stringify(logs, null, 2);
      
      case 'csv':
        return this.convertToCSV(logs.logs);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Convert logs to CSV format
   */
  convertToCSV(logs) {
    if (logs.length === 0) {
      return '';
    }

    const headers = ['timestamp', 'eventType', 'severity', 'userId', 'ip', 'details'];
    const csvRows = [headers.join(',')];

    logs.forEach(log => {
      const row = [
        log.timestamp,
        log.eventType,
        log.severity,
        log.data.userId || '',
        log.data.ip || '',
        JSON.stringify(log.data).replace(/"/g, '""')
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Stop the audit service
   */
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

module.exports = new AuditService();