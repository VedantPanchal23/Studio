const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');

const { authenticateFirebase } = require('../middleware/firebaseAuth');
const { Workspace } = require('../models');
const fileSystem = require('../utils/fileSystem');
const fileValidation = require('../utils/fileValidation');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Max 10 files at once
  },
  fileFilter: (req, file, cb) => {
    // Validate file extension
    if (!fileValidation.isAllowedExtension(file.originalname)) {
      return cb(new Error(`File type not allowed: ${path.extname(file.originalname)}`));
    }
    cb(null, true);
  }
});

// Middleware to check workspace access
const checkWorkspaceAccess = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Check if user has access to workspace
    const hasAccess = workspace.owner.toString() === userId ||
      workspace.collaborators.some(collab => collab.userId.toString() === userId);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to workspace' });
    }

    // Check permissions for write operations
    const isWriteOperation = ['POST', 'PUT', 'DELETE'].includes(req.method);
    if (isWriteOperation) {
      const isOwner = workspace.owner.toString() === userId;
      const collaborator = workspace.collaborators.find(collab => collab.userId.toString() === userId);
      const hasWriteAccess = isOwner || (collaborator && collaborator.permissions.write);

      if (!hasWriteAccess) {
        return res.status(403).json({ error: 'Write access denied' });
      }
    }

    req.workspace = workspace;
    next();
  } catch (error) {
    logger.error('Error checking workspace access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Validation middleware
const validateFilePath = [
  param('filePath').custom((value) => {
    if (!value) return true; // Optional for some routes
    const validation = fileValidation.validateFilePath(value);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }
    return true;
  })
];

const validateFileContent = [
  body('content').isString().withMessage('Content must be a string'),
  body('language').optional().isString().withMessage('Language must be a string')
];

// GET /api/files/:workspaceId - List files in workspace root
router.get('/:workspaceId',
  authenticateFirebase,
  param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
  query('path').optional().isString(),
  checkWorkspaceAccess,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { workspaceId } = req.params;
      const dirPath = req.query.path || '';

      // List files from file system
      const files = await fileSystem.listDirectory(workspaceId, dirPath);
      
      // Get workspace stats
      const stats = await fileSystem.getWorkspaceStats(workspaceId);

      res.json({
        files,
        stats,
        path: dirPath
      });
    } catch (error) {
      logger.error('Error listing files:', error);
      if (error.message === 'Directory not found') {
        return res.status(404).json({ error: 'Directory not found' });
      }
      res.status(500).json({ error: 'Failed to list files' });
    }
  }
);

// GET /api/files/:workspaceId/*filePath - Get file content
router.get('/:workspaceId/*',
  authenticateFirebase,
  param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
  checkWorkspaceAccess,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { workspaceId } = req.params;
      const filePath = req.params[0]; // Get the wildcard path

      if (!filePath) {
        return res.status(400).json({ error: 'File path is required' });
      }

      // Validate file path
      const validation = fileValidation.validateFilePath(filePath);
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.errors.join(', ') });
      }

      // Check if file exists
      const exists = await fileSystem.exists(workspaceId, filePath);
      if (!exists) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Get file stats
      const stats = await fileSystem.getItemStats(workspaceId, filePath);
      
      if (stats.type === 'directory') {
        // Return directory listing
        const files = await fileSystem.listDirectory(workspaceId, filePath);
        return res.json({
          type: 'directory',
          path: filePath,
          files
        });
      }

      // Read file content
      const content = await fileSystem.readFile(workspaceId, filePath);
      const language = fileValidation.detectLanguage(filePath);

      res.json({
        type: 'file',
        path: filePath,
        content,
        language,
        size: stats.size,
        lastModified: stats.modified
      });
    } catch (error) {
      logger.error('Error getting file:', error);
      if (error.message === 'File not found') {
        return res.status(404).json({ error: 'File not found' });
      }
      res.status(500).json({ error: 'Failed to get file' });
    }
  }
);

// PUT /api/files/:workspaceId/*filePath - Create or update file
router.put('/:workspaceId/*',
  authenticateFirebase,
  param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
  validateFileContent,
  checkWorkspaceAccess,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { workspaceId } = req.params;
      const filePath = req.params[0];
      const { content, language } = req.body;

      if (!filePath) {
        return res.status(400).json({ error: 'File path is required' });
      }

      // Validate file path
      const pathValidation = fileValidation.validateFilePath(filePath);
      if (!pathValidation.isValid) {
        return res.status(400).json({ error: pathValidation.errors.join(', ') });
      }

      // Validate file content
      const contentValidation = fileValidation.validateFileContent(content, filePath);
      if (!contentValidation.isValid) {
        return res.status(400).json({ error: contentValidation.errors.join(', ') });
      }

      // Write file to filesystem
      const size = await fileSystem.writeFile(workspaceId, filePath, content);

      // Update workspace model
      const detectedLanguage = language || contentValidation.language;
      await req.workspace.updateFile(filePath, content, detectedLanguage, req.user.id);

      res.json({
        message: 'File saved successfully',
        path: filePath,
        size,
        language: detectedLanguage,
        warnings: contentValidation.warnings
      });
    } catch (error) {
      logger.error('Error saving file:', error);
      res.status(500).json({ error: 'Failed to save file' });
    }
  }
);

// POST /api/files/:workspaceId/create - Create new file or directory
router.post('/:workspaceId/create',
  authenticateFirebase,
  param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
  body('path').isString().notEmpty().withMessage('Path is required'),
  body('type').isIn(['file', 'directory']).withMessage('Type must be file or directory'),
  body('content').optional().isString(),
  checkWorkspaceAccess,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { workspaceId } = req.params;
      const { path: itemPath, type, content = '' } = req.body;

      // Validate path
      const pathValidation = fileValidation.validateFilePath(itemPath);
      if (!pathValidation.isValid) {
        return res.status(400).json({ error: pathValidation.errors.join(', ') });
      }

      // Check if item already exists
      const exists = await fileSystem.exists(workspaceId, itemPath);
      if (exists) {
        return res.status(409).json({ error: 'File or directory already exists' });
      }

      if (type === 'directory') {
        await fileSystem.createDirectory(workspaceId, itemPath);
        res.json({
          message: 'Directory created successfully',
          path: itemPath,
          type: 'directory'
        });
      } else {
        // Validate file content
        const contentValidation = fileValidation.validateFileContent(content, itemPath);
        if (!contentValidation.isValid) {
          return res.status(400).json({ error: contentValidation.errors.join(', ') });
        }

        // Create file
        const size = await fileSystem.writeFile(workspaceId, itemPath, content);
        
        // Update workspace model
        await req.workspace.updateFile(itemPath, content, contentValidation.language, req.user.id);

        res.json({
          message: 'File created successfully',
          path: itemPath,
          type: 'file',
          size,
          language: contentValidation.language,
          warnings: contentValidation.warnings
        });
      }
    } catch (error) {
      logger.error('Error creating item:', error);
      res.status(500).json({ error: 'Failed to create item' });
    }
  }
);

// DELETE /api/files/:workspaceId/*filePath - Delete file or directory
router.delete('/:workspaceId/*',
  authenticateFirebase,
  param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
  checkWorkspaceAccess,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { workspaceId } = req.params;
      const filePath = req.params[0];

      if (!filePath) {
        return res.status(400).json({ error: 'File path is required' });
      }

      // Validate file path
      const pathValidation = fileValidation.validateFilePath(filePath);
      if (!pathValidation.isValid) {
        return res.status(400).json({ error: pathValidation.errors.join(', ') });
      }

      // Check if item exists
      const exists = await fileSystem.exists(workspaceId, filePath);
      if (!exists) {
        return res.status(404).json({ error: 'File or directory not found' });
      }

      // Get item stats to determine type
      const stats = await fileSystem.getItemStats(workspaceId, filePath);

      if (stats.type === 'directory') {
        await fileSystem.deleteDirectory(workspaceId, filePath);
      } else {
        await fileSystem.deleteFile(workspaceId, filePath);
        // Update workspace model
        await req.workspace.deleteFile(filePath);
      }

      res.json({
        message: `${stats.type === 'directory' ? 'Directory' : 'File'} deleted successfully`,
        path: filePath,
        type: stats.type
      });
    } catch (error) {
      logger.error('Error deleting item:', error);
      if (error.message === 'File not found') {
        return res.status(404).json({ error: 'File or directory not found' });
      }
      res.status(500).json({ error: 'Failed to delete item' });
    }
  }
);

// POST /api/files/:workspaceId/move - Move/rename file or directory
router.post('/:workspaceId/move',
  authenticateFirebase,
  param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
  body('from').isString().notEmpty().withMessage('Source path is required'),
  body('to').isString().notEmpty().withMessage('Destination path is required'),
  checkWorkspaceAccess,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { workspaceId } = req.params;
      const { from: sourcePath, to: destPath } = req.body;

      // Validate paths
      const sourceValidation = fileValidation.validateFilePath(sourcePath);
      if (!sourceValidation.isValid) {
        return res.status(400).json({ error: `Source path: ${sourceValidation.errors.join(', ')}` });
      }

      const destValidation = fileValidation.validateFilePath(destPath);
      if (!destValidation.isValid) {
        return res.status(400).json({ error: `Destination path: ${destValidation.errors.join(', ')}` });
      }

      // Check if source exists
      const sourceExists = await fileSystem.exists(workspaceId, sourcePath);
      if (!sourceExists) {
        return res.status(404).json({ error: 'Source file or directory not found' });
      }

      // Check if destination already exists
      const destExists = await fileSystem.exists(workspaceId, destPath);
      if (destExists) {
        return res.status(409).json({ error: 'Destination already exists' });
      }

      // Get source stats
      const sourceStats = await fileSystem.getItemStats(workspaceId, sourcePath);

      // Move item
      await fileSystem.moveItem(workspaceId, sourcePath, destPath);

      // Update workspace model for files
      if (sourceStats.type === 'file') {
        // Delete old file entry and create new one
        const file = req.workspace.files.find(f => f.path === sourcePath && !f.isDeleted);
        if (file) {
          file.isDeleted = true;
          await req.workspace.updateFile(destPath, file.content, file.language, req.user.id);
        }
      }

      res.json({
        message: `${sourceStats.type === 'directory' ? 'Directory' : 'File'} moved successfully`,
        from: sourcePath,
        to: destPath,
        type: sourceStats.type
      });
    } catch (error) {
      logger.error('Error moving item:', error);
      res.status(500).json({ error: 'Failed to move item' });
    }
  }
);

// POST /api/files/:workspaceId/copy - Copy file or directory
router.post('/:workspaceId/copy',
  authenticateFirebase,
  param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
  body('from').isString().notEmpty().withMessage('Source path is required'),
  body('to').isString().notEmpty().withMessage('Destination path is required'),
  checkWorkspaceAccess,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { workspaceId } = req.params;
      const { from: sourcePath, to: destPath } = req.body;

      // Validate paths
      const sourceValidation = fileValidation.validateFilePath(sourcePath);
      if (!sourceValidation.isValid) {
        return res.status(400).json({ error: `Source path: ${sourceValidation.errors.join(', ')}` });
      }

      const destValidation = fileValidation.validateFilePath(destPath);
      if (!destValidation.isValid) {
        return res.status(400).json({ error: `Destination path: ${destValidation.errors.join(', ')}` });
      }

      // Check if source exists
      const sourceExists = await fileSystem.exists(workspaceId, sourcePath);
      if (!sourceExists) {
        return res.status(404).json({ error: 'Source file or directory not found' });
      }

      // Check if destination already exists
      const destExists = await fileSystem.exists(workspaceId, destPath);
      if (destExists) {
        return res.status(409).json({ error: 'Destination already exists' });
      }

      // Get source stats
      const sourceStats = await fileSystem.getItemStats(workspaceId, sourcePath);

      // Copy item
      await fileSystem.copyItem(workspaceId, sourcePath, destPath);

      // Update workspace model for files
      if (sourceStats.type === 'file') {
        const file = req.workspace.files.find(f => f.path === sourcePath && !f.isDeleted);
        if (file) {
          await req.workspace.updateFile(destPath, file.content, file.language, req.user.id);
        }
      }

      res.json({
        message: `${sourceStats.type === 'directory' ? 'Directory' : 'File'} copied successfully`,
        from: sourcePath,
        to: destPath,
        type: sourceStats.type
      });
    } catch (error) {
      logger.error('Error copying item:', error);
      res.status(500).json({ error: 'Failed to copy item' });
    }
  }
);

// POST /api/files/:workspaceId/upload - Upload files
router.post('/:workspaceId/upload',
  authenticateFirebase,
  param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
  checkWorkspaceAccess,
  upload.array('files', 10),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { workspaceId } = req.params;
      const { path: uploadPath = '' } = req.body;
      const files = req.files;

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const results = [];
      const uploadErrors = [];

      for (const file of files) {
        try {
          const fileName = fileValidation.sanitizeFileName(file.originalname);
          const filePath = uploadPath ? `${uploadPath}/${fileName}` : fileName;

          // Validate file path
          const pathValidation = fileValidation.validateFilePath(filePath);
          if (!pathValidation.isValid) {
            uploadErrors.push({ file: fileName, error: pathValidation.errors.join(', ') });
            continue;
          }

          // Check if file already exists
          const exists = await fileSystem.exists(workspaceId, filePath);
          if (exists) {
            uploadErrors.push({ file: fileName, error: 'File already exists' });
            continue;
          }

          // Convert buffer to string
          const content = file.buffer.toString('utf8');

          // Validate content
          const contentValidation = fileValidation.validateFileContent(content, filePath);
          if (!contentValidation.isValid) {
            uploadErrors.push({ file: fileName, error: contentValidation.errors.join(', ') });
            continue;
          }

          // Save file
          const size = await fileSystem.writeFile(workspaceId, filePath, content);
          
          // Update workspace model
          await req.workspace.updateFile(filePath, content, contentValidation.language, req.user.id);

          results.push({
            file: fileName,
            path: filePath,
            size,
            language: contentValidation.language,
            warnings: contentValidation.warnings
          });
        } catch (error) {
          logger.error(`Error uploading file ${file.originalname}:`, error);
          uploadErrors.push({ file: file.originalname, error: error.message });
        }
      }

      res.json({
        message: `${results.length} files uploaded successfully`,
        uploaded: results,
        errors: uploadErrors
      });
    } catch (error) {
      logger.error('Error uploading files:', error);
      res.status(500).json({ error: 'Failed to upload files' });
    }
  }
);

// GET /api/files/:workspaceId/download/*filePath - Download file
router.get('/:workspaceId/download/*',
  authenticateFirebase,
  param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
  checkWorkspaceAccess,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { workspaceId } = req.params;
      const filePath = req.params[0];

      if (!filePath) {
        return res.status(400).json({ error: 'File path is required' });
      }

      // Validate file path
      const pathValidation = fileValidation.validateFilePath(filePath);
      if (!pathValidation.isValid) {
        return res.status(400).json({ error: pathValidation.errors.join(', ') });
      }

      // Check if file exists
      const exists = await fileSystem.exists(workspaceId, filePath);
      if (!exists) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Get file stats
      const stats = await fileSystem.getItemStats(workspaceId, filePath);
      
      if (stats.type === 'directory') {
        return res.status(400).json({ error: 'Cannot download directory' });
      }

      // Read file content
      const content = await fileSystem.readFile(workspaceId, filePath);
      const fileName = path.basename(filePath);

      // Set appropriate headers
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));

      res.send(content);
    } catch (error) {
      logger.error('Error downloading file:', error);
      res.status(500).json({ error: 'Failed to download file' });
    }
  }
);

module.exports = router;
