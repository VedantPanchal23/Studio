const express = require('express');
const router = express.Router();
const dockerService = require('../services/dockerService');
const containerSecurityService = require('../services/containerSecurityService');
const containerCleanupService = require('../services/containerCleanupService');
const auditService = require('../services/auditService');
const { authenticateToken, requireAdmin, getSecurityStats } = require('../middleware/auth');
const { auditLogger } = require('../middleware/security');
const logger = require('../utils/logger');

/**
 * Get security statistics for all containers
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    if (!dockerService.isAvailable) {
      return res.json({
        success: true,
        data: {
          totalContainers: 0,
          activeContainers: 0,
          securityViolations: 0,
          lastScan: null
        }
      });
    }

    const stats = dockerService.getSecurityStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get security stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security statistics'
    });
  }
});

/**
 * Get security metrics for a specific container
 */
router.get('/container/:containerId/metrics', authenticateToken, async (req, res) => {
  try {
    if (!dockerService.isAvailable) {
      return res.status(503).json({
        success: false,
        error: 'Service unavailable',
        message: 'Docker is not running'
      });
    }

    const { containerId } = req.params;
    const metrics = dockerService.getContainerSecurityMetrics(containerId);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'Container metrics not found'
      });
    }

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Failed to get container metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve container metrics'
    });
  }
});

/**
 * Get security violations for a specific container
 */
router.get('/container/:containerId/violations', authenticateToken, async (req, res) => {
  try {
    if (!dockerService.isAvailable) {
      return res.json({
        success: true,
        data: { violations: [] }
      });
    }

    const { containerId } = req.params;
    const violations = dockerService.getContainerSecurityViolations(containerId);

    res.json({
      success: true,
      data: violations || { violations: [] }
    });
  } catch (error) {
    logger.error('Failed to get container violations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security violations'
    });
  }
});

/**
 * Force cleanup of a specific container
 */
router.post('/container/:containerId/cleanup', authenticateToken, async (req, res) => {
  try {
    const { containerId } = req.params;
    const userId = req.user.id;

    // Verify user owns the container or is admin
    const containerInfo = await dockerService.getContainerInfo(containerId);
    if (!containerInfo) {
      return res.status(404).json({
        success: false,
        error: 'Container not found'
      });
    }

    if (containerInfo.userId !== userId && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to cleanup this container'
      });
    }

    const success = await dockerService.forceCleanupContainer(containerId);

    // Log security action
    logger.info(`Container ${containerId} force cleanup by user ${userId}`, {
      userId,
      containerId,
      action: 'force_cleanup',
      success
    });

    res.json({
      success,
      message: success ? 'Container cleaned up successfully' : 'Failed to cleanup container'
    });
  } catch (error) {
    logger.error('Failed to force cleanup container:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup container'
    });
  }
});

/**
 * Update security configuration (admin only)
 */
router.put('/config', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { securityConfig, cleanupConfig } = req.body;

    if (securityConfig) {
      containerSecurityService.updateSecurityConfig(securityConfig);
    }

    if (cleanupConfig) {
      containerCleanupService.updateConfig(cleanupConfig);
    }

    // Log configuration change
    logger.info(`Security configuration updated by admin ${req.user.id}`, {
      userId: req.user.id,
      action: 'config_update',
      securityConfig: !!securityConfig,
      cleanupConfig: !!cleanupConfig
    });

    res.json({
      success: true,
      message: 'Security configuration updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update security config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update security configuration'
    });
  }
});

/**
 * Trigger manual cleanup (admin only)
 */
router.post('/cleanup', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { emergency = false } = req.body;

    if (emergency) {
      await containerCleanupService.performEmergencyCleanup();
    } else {
      await containerCleanupService.performScheduledCleanup();
    }

    // Log cleanup action
    logger.info(`Manual cleanup triggered by admin ${req.user.id}`, {
      userId: req.user.id,
      action: emergency ? 'emergency_cleanup' : 'manual_cleanup'
    });

    res.json({
      success: true,
      message: `${emergency ? 'Emergency' : 'Manual'} cleanup completed successfully`
    });
  } catch (error) {
    logger.error('Failed to trigger manual cleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger cleanup'
    });
  }
});

/**
 * Get cleanup statistics
 */
router.get('/cleanup/stats', authenticateToken, async (req, res) => {
  try {
    const stats = containerCleanupService.getCleanupStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get cleanup stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cleanup statistics'
    });
  }
});

/**
 * Get security audit logs (admin only)
 */
router.get('/audit', authenticateToken, requireAdmin, auditLogger('view_audit_logs'), async (req, res) => {
  try {
    const filters = {
      eventType: req.query.eventType,
      userId: req.query.userId,
      severity: req.query.severity,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: Math.min(parseInt(req.query.limit) || 100, 1000),
      offset: parseInt(req.query.offset) || 0
    };

    const auditLogs = auditService.getLogs(filters);

    res.json({
      success: true,
      data: auditLogs
    });
  } catch (error) {
    logger.error('Failed to get audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit logs'
    });
  }
});

/**
 * Get audit statistics (admin only)
 */
router.get('/audit/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const timeRange = req.query.timeRange || '24h';
    const stats = auditService.getStatistics(timeRange);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get audit statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit statistics'
    });
  }
});

/**
 * Export audit logs (admin only)
 */
router.get('/audit/export', authenticateToken, requireAdmin, auditLogger('export_audit_logs'), async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const filters = {
      eventType: req.query.eventType,
      userId: req.query.userId,
      severity: req.query.severity,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };

    const exportData = auditService.exportLogs(format, filters);

    const filename = `audit_logs_${new Date().toISOString().split('T')[0]}.${format}`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', format === 'json' ? 'application/json' : 'text/csv');

    res.send(exportData);
  } catch (error) {
    logger.error('Failed to export audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export audit logs'
    });
  }
});

/**
 * Get authentication security statistics
 */
router.get('/auth/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const authStats = getSecurityStats();

    res.json({
      success: true,
      data: authStats
    });
  } catch (error) {
    logger.error('Failed to get auth security stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve authentication statistics'
    });
  }
});

module.exports = router;