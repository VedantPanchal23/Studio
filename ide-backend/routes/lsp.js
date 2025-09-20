const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const lspService = require('../services/lspService');
const logger = require('../utils/logger');
const { authenticateJWT } = require('../middleware/auth');

/**
 * @route   GET /api/lsp/languages
 * @desc    Get list of supported programming languages
 * @access  Private
 */
router.get('/languages', authenticateJWT, async (req, res) => {
  try {
    const languages = lspService.getSupportedLanguages();
    
    res.json({
      success: true,
      data: {
        languages: languages,
        count: languages.length
      }
    });

  } catch (error) {
    logger.error('Error getting supported languages', {
      userId: req.user.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get supported languages',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/lsp/servers
 * @desc    Get list of active LSP servers
 * @access  Private
 */
router.get('/servers', authenticateJWT, async (req, res) => {
  try {
    const servers = lspService.getActiveServers();
    
    res.json({
      success: true,
      data: {
        servers: servers,
        count: servers.length
      }
    });

  } catch (error) {
    logger.error('Error getting active servers', {
      userId: req.user.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get active servers',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/lsp/servers
 * @desc    Start an LSP server for a specific language
 * @access  Private
 */
router.post('/servers', [
  authenticateJWT,
  body('language')
    .notEmpty()
    .withMessage('Language is required')
    .isString()
    .withMessage('Language must be a string'),
  body('workspaceRoot')
    .notEmpty()
    .withMessage('Workspace root is required')
    .isString()
    .withMessage('Workspace root must be a string')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { language, workspaceRoot } = req.body;

    // Check if language is supported
    const supportedLanguages = lspService.getSupportedLanguages();
    if (!supportedLanguages.includes(language)) {
      return res.status(400).json({
        success: false,
        message: `Language '${language}' is not supported`,
        supportedLanguages: supportedLanguages
      });
    }

    const serverId = await lspService.startServer(language, workspaceRoot);

    logger.info('LSP server started via API', {
      userId: req.user.id,
      serverId: serverId,
      language: language,
      workspaceRoot: workspaceRoot
    });

    res.status(201).json({
      success: true,
      message: 'LSP server started successfully',
      data: {
        serverId: serverId,
        language: language,
        workspaceRoot: workspaceRoot
      }
    });

  } catch (error) {
    logger.error('Error starting LSP server via API', {
      userId: req.user.id,
      language: req.body.language,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to start LSP server',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/lsp/servers/:serverId
 * @desc    Stop an LSP server
 * @access  Private
 */
router.delete('/servers/:serverId', [
  authenticateJWT,
  param('serverId')
    .notEmpty()
    .withMessage('Server ID is required')
    .isString()
    .withMessage('Server ID must be a string')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { serverId } = req.params;

    const stopped = await lspService.stopServer(serverId);

    if (!stopped) {
      return res.status(404).json({
        success: false,
        message: 'LSP server not found or already stopped'
      });
    }

    logger.info('LSP server stopped via API', {
      userId: req.user.id,
      serverId: serverId
    });

    res.json({
      success: true,
      message: 'LSP server stopped successfully',
      data: {
        serverId: serverId
      }
    });

  } catch (error) {
    logger.error('Error stopping LSP server via API', {
      userId: req.user.id,
      serverId: req.params.serverId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to stop LSP server',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/lsp/servers/:serverId/status
 * @desc    Get LSP server status
 * @access  Private
 */
router.get('/servers/:serverId/status', [
  authenticateJWT,
  param('serverId')
    .notEmpty()
    .withMessage('Server ID is required')
    .isString()
    .withMessage('Server ID must be a string')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { serverId } = req.params;
    const servers = lspService.getActiveServers();
    const server = servers.find(s => s.serverId === serverId);

    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'LSP server not found'
      });
    }

    res.json({
      success: true,
      data: server
    });

  } catch (error) {
    logger.error('Error getting LSP server status via API', {
      userId: req.user.id,
      serverId: req.params.serverId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get LSP server status',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/lsp/check-executable
 * @desc    Check if LSP server executable is available for a language
 * @access  Private
 */
router.post('/check-executable', [
  authenticateJWT,
  body('language')
    .notEmpty()
    .withMessage('Language is required')
    .isString()
    .withMessage('Language must be a string')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { language } = req.body;

    // Get server config for the language
    const config = lspService.getServerConfig(language);
    if (!config) {
      return res.status(400).json({
        success: false,
        message: `Language '${language}' is not supported`,
        supportedLanguages: lspService.getSupportedLanguages()
      });
    }

    try {
      await lspService.checkServerExecutable(config.command);
      
      res.json({
        success: true,
        message: 'LSP server executable is available',
        data: {
          language: language,
          serverName: config.name,
          command: config.command,
          available: true
        }
      });

    } catch (execError) {
      res.json({
        success: true,
        message: 'LSP server executable check completed',
        data: {
          language: language,
          serverName: config.name,
          command: config.command,
          available: false,
          error: execError.message
        }
      });
    }

  } catch (error) {
    logger.error('Error checking LSP server executable via API', {
      userId: req.user.id,
      language: req.body.language,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to check LSP server executable',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/lsp/shutdown
 * @desc    Shutdown all LSP servers
 * @access  Private
 */
router.post('/shutdown', authenticateJWT, async (req, res) => {
  try {
    await lspService.shutdown();

    logger.info('All LSP servers shut down via API', {
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'All LSP servers shut down successfully'
    });

  } catch (error) {
    logger.error('Error shutting down LSP servers via API', {
      userId: req.user.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to shutdown LSP servers',
      error: error.message
    });
  }
});

module.exports = router;