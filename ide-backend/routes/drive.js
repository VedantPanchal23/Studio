const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const GoogleDriveService = require('../services/googleDriveService');
const WorkspaceSyncService = require('../services/workspaceSyncService');
const User = require('../models/User');
const logger = require('../utils/logger');
const { authenticateJWT } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/security');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateJWT);

// Apply rate limiting
router.use(apiLimiter);

/**
 * @route   GET /api/drive/auth-url
 * @desc    Get Google Drive authorization URL
 * @access  Private
 */
router.get('/auth-url', async (req, res) => {
  try {
    const driveService = new GoogleDriveService();
    const authUrl = driveService.getAuthUrl(req.user._id.toString());

    res.json({
      success: true,
      message: 'Authorization URL generated successfully',
      data: {
        authUrl
      }
    });

  } catch (error) {
    logger.error('Error generating Drive auth URL:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate authorization URL'
    });
  }
});

/**
 * @route   POST /api/drive/callback
 * @desc    Handle Google Drive OAuth callback
 * @access  Private
 */
router.post('/callback', [
  body('code').notEmpty().withMessage('Authorization code is required'),
  body('state').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { code } = req.body;
    const driveService = new GoogleDriveService();

    // Exchange code for tokens
    const tokens = await driveService.getTokens(code);

    // Update user with Drive tokens
    await User.findByIdAndUpdate(req.user._id, {
      driveToken: tokens.access_token,
      driveRefreshToken: tokens.refresh_token
    });

    logger.info(`Drive access granted for user: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Google Drive access granted successfully',
      data: {
        hasAccess: true
      }
    });

  } catch (error) {
    logger.error('Error handling Drive callback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process Drive authorization'
    });
  }
});

/**
 * @route   GET /api/drive/status
 * @desc    Check Google Drive connection status
 * @access  Private
 */
router.get('/status', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+driveToken +driveRefreshToken');
    
    if (!user.driveToken) {
      return res.json({
        success: true,
        message: 'Drive status retrieved',
        data: {
          connected: false,
          hasAccess: false
        }
      });
    }

    const driveService = new GoogleDriveService();
    driveService.setCredentials({
      access_token: user.driveToken,
      refresh_token: user.driveRefreshToken
    });

    const hasAccess = await driveService.checkAccess();

    res.json({
      success: true,
      message: 'Drive status retrieved',
      data: {
        connected: true,
        hasAccess
      }
    });

  } catch (error) {
    logger.error('Error checking Drive status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check Drive status'
    });
  }
});

/**
 * @route   GET /api/drive/files
 * @desc    List files in Google Drive
 * @access  Private
 */
router.get('/files', [
  query('folderId').optional().isString(),
  query('pageSize').optional().isInt({ min: 1, max: 1000 }),
  query('pageToken').optional().isString(),
  query('query').optional().isString(),
  query('orderBy').optional().isIn(['name', 'modifiedTime', 'createdTime', 'size'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user._id).select('+driveToken +driveRefreshToken');
    
    if (!user.driveToken) {
      return res.status(401).json({
        success: false,
        message: 'Google Drive not connected'
      });
    }

    const driveService = new GoogleDriveService();
    driveService.setCredentials({
      access_token: user.driveToken,
      refresh_token: user.driveRefreshToken
    });

    const options = {
      folderId: req.query.folderId,
      pageSize: parseInt(req.query.pageSize) || 100,
      pageToken: req.query.pageToken,
      query: req.query.query,
      orderBy: req.query.orderBy ? `${req.query.orderBy} desc` : 'modifiedTime desc'
    };

    const result = await driveService.listFiles(options);

    res.json({
      success: true,
      message: 'Files retrieved successfully',
      data: result
    });

  } catch (error) {
    logger.error('Error listing Drive files:', error);
    
    if (error.message.includes('invalid_grant') || error.message.includes('unauthorized')) {
      return res.status(401).json({
        success: false,
        message: 'Drive access expired. Please reconnect.',
        code: 'DRIVE_ACCESS_EXPIRED'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve files'
    });
  }
});

/**
 * @route   GET /api/drive/files/:fileId
 * @desc    Get file metadata from Google Drive
 * @access  Private
 */
router.get('/files/:fileId', [
  param('fileId').notEmpty().withMessage('File ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user._id).select('+driveToken +driveRefreshToken');
    
    if (!user.driveToken) {
      return res.status(401).json({
        success: false,
        message: 'Google Drive not connected'
      });
    }

    const driveService = new GoogleDriveService();
    driveService.setCredentials({
      access_token: user.driveToken,
      refresh_token: user.driveRefreshToken
    });

    const fileMetadata = await driveService.getFileMetadata(req.params.fileId);

    res.json({
      success: true,
      message: 'File metadata retrieved successfully',
      data: {
        file: fileMetadata
      }
    });

  } catch (error) {
    logger.error('Error getting file metadata:', error);
    
    if (error.message.includes('invalid_grant') || error.message.includes('unauthorized')) {
      return res.status(401).json({
        success: false,
        message: 'Drive access expired. Please reconnect.',
        code: 'DRIVE_ACCESS_EXPIRED'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to get file metadata'
    });
  }
});

/**
 * @route   GET /api/drive/files/:fileId/download
 * @desc    Download file content from Google Drive
 * @access  Private
 */
router.get('/files/:fileId/download', [
  param('fileId').notEmpty().withMessage('File ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user._id).select('+driveToken +driveRefreshToken');
    
    if (!user.driveToken) {
      return res.status(401).json({
        success: false,
        message: 'Google Drive not connected'
      });
    }

    const driveService = new GoogleDriveService();
    driveService.setCredentials({
      access_token: user.driveToken,
      refresh_token: user.driveRefreshToken
    });

    // Get file metadata first
    const fileMetadata = await driveService.getFileMetadata(req.params.fileId);
    
    // Check if file is downloadable (not a Google Workspace file)
    if (fileMetadata.mimeType.startsWith('application/vnd.google-apps.')) {
      return res.status(400).json({
        success: false,
        message: 'Google Workspace files cannot be downloaded directly'
      });
    }

    const fileContent = await driveService.downloadFile(req.params.fileId);

    res.json({
      success: true,
      message: 'File downloaded successfully',
      data: {
        name: fileMetadata.name,
        mimeType: fileMetadata.mimeType,
        size: fileMetadata.size,
        content: fileContent.toString('base64')
      }
    });

  } catch (error) {
    logger.error('Error downloading file:', error);
    
    if (error.message.includes('invalid_grant') || error.message.includes('unauthorized')) {
      return res.status(401).json({
        success: false,
        message: 'Drive access expired. Please reconnect.',
        code: 'DRIVE_ACCESS_EXPIRED'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to download file'
    });
  }
});

/**
 * @route   POST /api/drive/files
 * @desc    Upload file to Google Drive
 * @access  Private
 */
router.post('/files', [
  body('name').notEmpty().withMessage('File name is required'),
  body('content').notEmpty().withMessage('File content is required'),
  body('mimeType').optional().isString(),
  body('parentId').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user._id).select('+driveToken +driveRefreshToken');
    
    if (!user.driveToken) {
      return res.status(401).json({
        success: false,
        message: 'Google Drive not connected'
      });
    }

    const driveService = new GoogleDriveService();
    driveService.setCredentials({
      access_token: user.driveToken,
      refresh_token: user.driveRefreshToken
    });

    const { name, content, mimeType, parentId } = req.body;
    
    // Decode base64 content if provided
    let fileContent = content;
    if (typeof content === 'string' && content.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
      try {
        fileContent = Buffer.from(content, 'base64');
      } catch (e) {
        // If base64 decode fails, use as plain text
        fileContent = content;
      }
    }

    const uploadedFile = await driveService.uploadFile({
      name,
      content: fileContent,
      mimeType,
      parentId
    });

    logger.info(`File uploaded to Drive: ${name} by user: ${req.user.email}`);

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        file: uploadedFile
      }
    });

  } catch (error) {
    logger.error('Error uploading file:', error);
    
    if (error.message.includes('invalid_grant') || error.message.includes('unauthorized')) {
      return res.status(401).json({
        success: false,
        message: 'Drive access expired. Please reconnect.',
        code: 'DRIVE_ACCESS_EXPIRED'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload file'
    });
  }
});

/**
 * @route   PUT /api/drive/files/:fileId
 * @desc    Update file content in Google Drive
 * @access  Private
 */
router.put('/files/:fileId', [
  param('fileId').notEmpty().withMessage('File ID is required'),
  body('content').notEmpty().withMessage('File content is required'),
  body('mimeType').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user._id).select('+driveToken +driveRefreshToken');
    
    if (!user.driveToken) {
      return res.status(401).json({
        success: false,
        message: 'Google Drive not connected'
      });
    }

    const driveService = new GoogleDriveService();
    driveService.setCredentials({
      access_token: user.driveToken,
      refresh_token: user.driveRefreshToken
    });

    const { content, mimeType } = req.body;
    
    // Decode base64 content if provided
    let fileContent = content;
    if (typeof content === 'string' && content.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
      try {
        fileContent = Buffer.from(content, 'base64');
      } catch (e) {
        fileContent = content;
      }
    }

    const updatedFile = await driveService.updateFile(
      req.params.fileId,
      fileContent,
      mimeType
    );

    logger.info(`File updated in Drive: ${updatedFile.name} by user: ${req.user.email}`);

    res.json({
      success: true,
      message: 'File updated successfully',
      data: {
        file: updatedFile
      }
    });

  } catch (error) {
    logger.error('Error updating file:', error);
    
    if (error.message.includes('invalid_grant') || error.message.includes('unauthorized')) {
      return res.status(401).json({
        success: false,
        message: 'Drive access expired. Please reconnect.',
        code: 'DRIVE_ACCESS_EXPIRED'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update file'
    });
  }
});

/**
 * @route   POST /api/drive/folders
 * @desc    Create folder in Google Drive
 * @access  Private
 */
router.post('/folders', [
  body('name').notEmpty().withMessage('Folder name is required'),
  body('parentId').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user._id).select('+driveToken +driveRefreshToken');
    
    if (!user.driveToken) {
      return res.status(401).json({
        success: false,
        message: 'Google Drive not connected'
      });
    }

    const driveService = new GoogleDriveService();
    driveService.setCredentials({
      access_token: user.driveToken,
      refresh_token: user.driveRefreshToken
    });

    const { name, parentId } = req.body;
    const createdFolder = await driveService.createFolder(name, parentId);

    logger.info(`Folder created in Drive: ${name} by user: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Folder created successfully',
      data: {
        folder: createdFolder
      }
    });

  } catch (error) {
    logger.error('Error creating folder:', error);
    
    if (error.message.includes('invalid_grant') || error.message.includes('unauthorized')) {
      return res.status(401).json({
        success: false,
        message: 'Drive access expired. Please reconnect.',
        code: 'DRIVE_ACCESS_EXPIRED'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create folder'
    });
  }
});

/**
 * @route   DELETE /api/drive/files/:fileId
 * @desc    Delete file from Google Drive
 * @access  Private
 */
router.delete('/files/:fileId', [
  param('fileId').notEmpty().withMessage('File ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user._id).select('+driveToken +driveRefreshToken');
    
    if (!user.driveToken) {
      return res.status(401).json({
        success: false,
        message: 'Google Drive not connected'
      });
    }

    const driveService = new GoogleDriveService();
    driveService.setCredentials({
      access_token: user.driveToken,
      refresh_token: user.driveRefreshToken
    });

    await driveService.deleteFile(req.params.fileId);

    logger.info(`File deleted from Drive: ${req.params.fileId} by user: ${req.user.email}`);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting file:', error);
    
    if (error.message.includes('invalid_grant') || error.message.includes('unauthorized')) {
      return res.status(401).json({
        success: false,
        message: 'Drive access expired. Please reconnect.',
        code: 'DRIVE_ACCESS_EXPIRED'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete file'
    });
  }
});

/**
 * @route   GET /api/drive/search
 * @desc    Search files in Google Drive
 * @access  Private
 */
router.get('/search', [
  query('q').notEmpty().withMessage('Search query is required'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }),
  query('pageToken').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user._id).select('+driveToken +driveRefreshToken');
    
    if (!user.driveToken) {
      return res.status(401).json({
        success: false,
        message: 'Google Drive not connected'
      });
    }

    const driveService = new GoogleDriveService();
    driveService.setCredentials({
      access_token: user.driveToken,
      refresh_token: user.driveRefreshToken
    });

    const options = {
      pageSize: parseInt(req.query.pageSize) || 50,
      pageToken: req.query.pageToken
    };

    const result = await driveService.searchFiles(req.query.q, options);

    res.json({
      success: true,
      message: 'Search completed successfully',
      data: result
    });

  } catch (error) {
    logger.error('Error searching files:', error);
    
    if (error.message.includes('invalid_grant') || error.message.includes('unauthorized')) {
      return res.status(401).json({
        success: false,
        message: 'Drive access expired. Please reconnect.',
        code: 'DRIVE_ACCESS_EXPIRED'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to search files'
    });
  }
});

/**
 * @route   GET /api/drive/storage
 * @desc    Get Google Drive storage information
 * @access  Private
 */
router.get('/storage', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+driveToken +driveRefreshToken');
    
    if (!user.driveToken) {
      return res.status(401).json({
        success: false,
        message: 'Google Drive not connected'
      });
    }

    const driveService = new GoogleDriveService();
    driveService.setCredentials({
      access_token: user.driveToken,
      refresh_token: user.driveRefreshToken
    });

    const storageInfo = await driveService.getStorageInfo();

    res.json({
      success: true,
      message: 'Storage information retrieved successfully',
      data: storageInfo
    });

  } catch (error) {
    logger.error('Error getting storage info:', error);
    
    if (error.message.includes('invalid_grant') || error.message.includes('unauthorized')) {
      return res.status(401).json({
        success: false,
        message: 'Drive access expired. Please reconnect.',
        code: 'DRIVE_ACCESS_EXPIRED'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to get storage information'
    });
  }
});

/**
 * @route   POST /api/drive/sync/:workspaceId
 * @desc    Sync workspace to Google Drive
 * @access  Private
 */
router.post('/sync/:workspaceId', [
  param('workspaceId').isMongoId().withMessage('Valid workspace ID is required'),
  body('createFolder').optional().isBoolean(),
  body('overwriteExisting').optional().isBoolean(),
  body('excludePatterns').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const syncService = new WorkspaceSyncService();
    const options = {
      createFolder: req.body.createFolder !== false,
      overwriteExisting: req.body.overwriteExisting || false,
      excludePatterns: req.body.excludePatterns || ['.git', 'node_modules', '.env']
    };

    const result = await syncService.syncWorkspaceToDrive(
      req.params.workspaceId,
      req.user._id.toString(),
      options
    );

    res.json({
      success: true,
      message: 'Workspace synced to Drive successfully',
      data: result
    });

  } catch (error) {
    logger.error('Error syncing workspace to Drive:', error);
    
    if (error.message.includes('Sync already in progress')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to sync workspace to Drive'
    });
  }
});

/**
 * @route   POST /api/drive/import/:workspaceId
 * @desc    Import files from Google Drive to workspace
 * @access  Private
 */
router.post('/import/:workspaceId', [
  param('workspaceId').isMongoId().withMessage('Valid workspace ID is required'),
  body('folderId').notEmpty().withMessage('Drive folder ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const syncService = new WorkspaceSyncService();
    const result = await syncService.syncDriveToWorkspace(
      req.params.workspaceId,
      req.user._id.toString(),
      req.body.folderId
    );

    res.json({
      success: true,
      message: 'Files imported from Drive successfully',
      data: result
    });

  } catch (error) {
    logger.error('Error importing from Drive:', error);
    
    if (error.message.includes('Import already in progress')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to import files from Drive'
    });
  }
});

/**
 * @route   GET /api/drive/sync/:workspaceId/status
 * @desc    Get workspace sync status
 * @access  Private
 */
router.get('/sync/:workspaceId/status', [
  param('workspaceId').isMongoId().withMessage('Valid workspace ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const syncService = new WorkspaceSyncService();
    const status = await syncService.getSyncStatus(req.params.workspaceId);

    res.json({
      success: true,
      message: 'Sync status retrieved successfully',
      data: status
    });

  } catch (error) {
    logger.error('Error getting sync status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sync status'
    });
  }
});

/**
 * @route   POST /api/drive/disconnect
 * @desc    Disconnect Google Drive integration
 * @access  Private
 */
router.post('/disconnect', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $unset: {
        driveToken: 1,
        driveRefreshToken: 1
      }
    });

    logger.info(`Drive disconnected for user: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Google Drive disconnected successfully'
    });

  } catch (error) {
    logger.error('Error disconnecting Drive:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect Google Drive'
    });
  }
});

module.exports = router;