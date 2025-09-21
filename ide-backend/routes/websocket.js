const express = require('express');
const { authenticateFirebase } = require('../middleware/firebaseAuth');
const webSocketService = require('../services/websocket');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Get WebSocket connection status
 * GET /api/websocket/status
 */
router.get('/status', authenticateFirebase, (req, res) => {
  try {
    const connectedUsersCount = webSocketService.getConnectedUsersCount();
    const isUserConnected = webSocketService.isUserConnected(req.user._id.toString());
    const userSockets = webSocketService.getUserSockets(req.user._id.toString());

    res.json({
      success: true,
      data: {
        connectedUsersCount,
        isUserConnected,
        userSocketsCount: userSockets.size,
        serverStatus: 'running'
      }
    });
  } catch (error) {
    logger.error('Error getting WebSocket status:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting WebSocket status'
    });
  }
});

/**
 * Send test message to user's sockets
 * POST /api/websocket/test
 */
router.post('/test', authenticateFirebase, (req, res) => {
  try {
    const { message = 'Test message from server' } = req.body;
    const userId = req.user._id.toString();

    webSocketService.sendToUser(userId, 'test:message', {
      message,
      timestamp: new Date().toISOString(),
      from: 'server'
    });

    res.json({
      success: true,
      message: 'Test message sent to user sockets'
    });
  } catch (error) {
    logger.error('Error sending test message:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending test message'
    });
  }
});

/**
 * Get connected users (admin only - placeholder)
 * GET /api/websocket/users
 */
router.get('/users', authenticateFirebase, (req, res) => {
  try {
    // This would typically require admin permissions
    // For now, just return basic stats
    const connectedUsersCount = webSocketService.getConnectedUsersCount();

    res.json({
      success: true,
      data: {
        connectedUsersCount,
        message: 'Detailed user list requires admin permissions'
      }
    });
  } catch (error) {
    logger.error('Error getting connected users:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting connected users'
    });
  }
});

module.exports = router;
