const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const fileSystem = require('../utils/fileSystem');

const router = express.Router();

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Validation rules
const createWorkspaceValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Workspace name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Workspace name can only contain letters, numbers, spaces, hyphens, and underscores'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),
  body('settings.runtime')
    .optional()
    .isIn(['node', 'python', 'java', 'cpp', 'go', 'rust', 'php', 'ruby'])
    .withMessage('Invalid runtime specified')
];

const updateWorkspaceValidation = [
  param('workspaceId')
    .isMongoId()
    .withMessage('Invalid workspace ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Workspace name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Workspace name can only contain letters, numbers, spaces, hyphens, and underscores'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean')
];

const collaboratorValidation = [
  param('workspaceId')
    .isMongoId()
    .withMessage('Invalid workspace ID'),
  body('email')
    .isEmail()
    .withMessage('Valid email is required'),
  body('role')
    .isIn(['owner', 'editor', 'viewer'])
    .withMessage('Role must be owner, editor, or viewer')
];

// Middleware to check workspace access
const checkWorkspaceAccess = (requiredPermission = 'read') => {
  return async (req, res, next) => {
    try {
      const { workspaceId } = req.params;
      const userId = req.user.id;

      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found'
        });
      }

      // Check if user is owner
      if (workspace.owner.toString() === userId) {
        req.workspace = workspace;
        req.userRole = 'owner';
        return next();
      }

      // Check if user is collaborator
      const collaborator = workspace.collaborators.find(
        collab => collab.userId.toString() === userId
      );

      if (!collaborator) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this workspace'
        });
      }

      // Check permissions
      const hasPermission = collaborator.permissions[requiredPermission];
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Insufficient permissions: ${requiredPermission} access required`
        });
      }

      req.workspace = workspace;
      req.userRole = collaborator.role;
      next();
    } catch (error) {
      logger.error('Error checking workspace access:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

// GET /api/workspaces - List user workspaces
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      search, 
      sortBy = 'lastActivity', 
      sortOrder = 'desc',
      includeArchived = false 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [`stats.${sortBy}`]: sortOrder === 'desc' ? -1 : 1 };

    // Build query
    const query = {
      $or: [
        { owner: userId },
        { 'collaborators.userId': userId }
      ]
    };

    if (!includeArchived) {
      query.isArchived = false;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const workspaces = await Workspace.find(query)
      .populate('owner', 'name email avatar')
      .populate('collaborators.userId', 'name email avatar')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Workspace.countDocuments(query);

    // Add user role to each workspace
    const workspacesWithRole = workspaces.map(workspace => {
      let userRole = 'viewer';
      if (workspace.owner._id.toString() === userId) {
        userRole = 'owner';
      } else {
        const collaborator = workspace.collaborators.find(
          collab => collab.userId._id.toString() === userId
        );
        if (collaborator) {
          userRole = collaborator.role;
        }
      }

      return {
        ...workspace,
        userRole
      };
    });

    res.json({
      success: true,
      data: {
        workspaces: workspacesWithRole,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Error listing workspaces:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list workspaces'
    });
  }
});

// POST /api/workspaces - Create new workspace
router.post('/', authenticateToken, createWorkspaceValidation, validateRequest, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, isPublic = false, settings = {} } = req.body;

    // Check if user already has a workspace with this name
    const existingWorkspace = await Workspace.findOne({
      owner: userId,
      name: name.trim(),
      isArchived: false
    });

    if (existingWorkspace) {
      return res.status(409).json({
        success: false,
        message: 'A workspace with this name already exists'
      });
    }

    // Create workspace
    const workspace = new Workspace({
      name: name.trim(),
      description: description?.trim() || '',
      owner: userId,
      isPublic,
      settings: {
        runtime: settings.runtime || 'node',
        version: settings.version || 'latest',
        dependencies: settings.dependencies || [],
        environment: new Map(Object.entries(settings.environment || {})),
        buildCommand: settings.buildCommand || '',
        runCommand: settings.runCommand || ''
      }
    });

    await workspace.save();

    // Initialize workspace file system
    await fileSystem.initializeWorkspace(workspace._id.toString());

    // Populate owner information
    await workspace.populate('owner', 'name email avatar');

    logger.info(`Workspace created: ${workspace.name} by user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Workspace created successfully',
      data: {
        workspace: {
          ...workspace.toObject(),
          userRole: 'owner'
        }
      }
    });
  } catch (error) {
    logger.error('Error creating workspace:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create workspace'
    });
  }
});

// GET /api/workspaces/:workspaceId - Get workspace details
router.get('/:workspaceId', authenticateToken, checkWorkspaceAccess('read'), async (req, res) => {
  try {
    const workspace = req.workspace;
    const userRole = req.userRole;

    // Populate references
    await workspace.populate('owner', 'name email avatar');
    await workspace.populate('collaborators.userId', 'name email avatar');

    res.json({
      success: true,
      data: {
        workspace: {
          ...workspace.toObject(),
          userRole
        }
      }
    });
  } catch (error) {
    logger.error('Error getting workspace:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get workspace details'
    });
  }
});

// PUT /api/workspaces/:workspaceId - Update workspace
router.put('/:workspaceId', authenticateToken, updateWorkspaceValidation, validateRequest, checkWorkspaceAccess('admin'), async (req, res) => {
  try {
    const workspace = req.workspace;
    const { name, description, isPublic, settings } = req.body;

    // Update fields if provided
    if (name !== undefined) {
      // Check if another workspace with this name exists
      const existingWorkspace = await Workspace.findOne({
        owner: workspace.owner,
        name: name.trim(),
        _id: { $ne: workspace._id },
        isArchived: false
      });

      if (existingWorkspace) {
        return res.status(409).json({
          success: false,
          message: 'A workspace with this name already exists'
        });
      }

      workspace.name = name.trim();
    }

    if (description !== undefined) {
      workspace.description = description.trim();
    }

    if (isPublic !== undefined) {
      workspace.isPublic = isPublic;
    }

    if (settings) {
      if (settings.runtime) workspace.settings.runtime = settings.runtime;
      if (settings.version) workspace.settings.version = settings.version;
      if (settings.dependencies) workspace.settings.dependencies = settings.dependencies;
      if (settings.environment) {
        workspace.settings.environment = new Map(Object.entries(settings.environment));
      }
      if (settings.buildCommand !== undefined) workspace.settings.buildCommand = settings.buildCommand;
      if (settings.runCommand !== undefined) workspace.settings.runCommand = settings.runCommand;
    }

    await workspace.save();

    // Populate references
    await workspace.populate('owner', 'name email avatar');
    await workspace.populate('collaborators.userId', 'name email avatar');

    logger.info(`Workspace updated: ${workspace.name} by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Workspace updated successfully',
      data: {
        workspace: {
          ...workspace.toObject(),
          userRole: req.userRole
        }
      }
    });
  } catch (error) {
    logger.error('Error updating workspace:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update workspace'
    });
  }
});

// DELETE /api/workspaces/:workspaceId - Delete workspace
router.delete('/:workspaceId', authenticateToken, checkWorkspaceAccess('admin'), async (req, res) => {
  try {
    const workspace = req.workspace;
    const { permanent = false } = req.query;

    if (permanent === 'true') {
      // Permanently delete workspace
      await fileSystem.deleteWorkspace(workspace._id.toString());
      await Workspace.findByIdAndDelete(workspace._id);
      
      logger.info(`Workspace permanently deleted: ${workspace.name} by user ${req.user.id}`);
      
      res.json({
        success: true,
        message: 'Workspace permanently deleted'
      });
    } else {
      // Archive workspace
      workspace.isArchived = true;
      await workspace.save();
      
      logger.info(`Workspace archived: ${workspace.name} by user ${req.user.id}`);
      
      res.json({
        success: true,
        message: 'Workspace archived successfully'
      });
    }
  } catch (error) {
    logger.error('Error deleting workspace:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete workspace'
    });
  }
});

// POST /api/workspaces/:workspaceId/collaborators - Add collaborator
router.post('/:workspaceId/collaborators', authenticateToken, collaboratorValidation, validateRequest, checkWorkspaceAccess('admin'), async (req, res) => {
  try {
    const workspace = req.workspace;
    const { email, role = 'viewer' } = req.body;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email address'
      });
    }

    // Check if user is already owner
    if (workspace.owner.toString() === user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'User is already the owner of this workspace'
      });
    }

    // Add collaborator
    try {
      await workspace.addCollaborator(user._id, role, req.user.id);
      
      // Populate the new collaborator data
      await workspace.populate('collaborators.userId', 'name email avatar');
      
      const newCollaborator = workspace.collaborators.find(
        collab => collab.userId._id.toString() === user._id.toString()
      );

      logger.info(`Collaborator added to workspace ${workspace.name}: ${email} as ${role}`);

      res.status(201).json({
        success: true,
        message: 'Collaborator added successfully',
        data: {
          collaborator: newCollaborator
        }
      });
    } catch (error) {
      if (error.message === 'User is already a collaborator') {
        return res.status(409).json({
          success: false,
          message: 'User is already a collaborator on this workspace'
        });
      }
      throw error;
    }
  } catch (error) {
    logger.error('Error adding collaborator:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add collaborator'
    });
  }
});

// PUT /api/workspaces/:workspaceId/collaborators/:userId - Update collaborator role
router.put('/:workspaceId/collaborators/:userId', authenticateToken, checkWorkspaceAccess('admin'), async (req, res) => {
  try {
    const workspace = req.workspace;
    const { userId } = req.params;
    const { role } = req.body;

    if (!['owner', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be owner, editor, or viewer'
      });
    }

    // Cannot change owner role through this endpoint
    if (workspace.owner.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change owner role through this endpoint'
      });
    }

    try {
      await workspace.updateCollaboratorRole(userId, role);
      
      await workspace.populate('collaborators.userId', 'name email avatar');
      
      const updatedCollaborator = workspace.collaborators.find(
        collab => collab.userId._id.toString() === userId
      );

      logger.info(`Collaborator role updated in workspace ${workspace.name}: ${userId} to ${role}`);

      res.json({
        success: true,
        message: 'Collaborator role updated successfully',
        data: {
          collaborator: updatedCollaborator
        }
      });
    } catch (error) {
      if (error.message === 'Collaborator not found') {
        return res.status(404).json({
          success: false,
          message: 'Collaborator not found'
        });
      }
      throw error;
    }
  } catch (error) {
    logger.error('Error updating collaborator role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update collaborator role'
    });
  }
});

// DELETE /api/workspaces/:workspaceId/collaborators/:userId - Remove collaborator
router.delete('/:workspaceId/collaborators/:userId', authenticateToken, checkWorkspaceAccess('admin'), async (req, res) => {
  try {
    const workspace = req.workspace;
    const { userId } = req.params;

    // Cannot remove owner
    if (workspace.owner.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove workspace owner'
      });
    }

    // Check if collaborator exists
    const collaborator = workspace.collaborators.find(
      collab => collab.userId.toString() === userId
    );

    if (!collaborator) {
      return res.status(404).json({
        success: false,
        message: 'Collaborator not found'
      });
    }

    await workspace.removeCollaborator(userId);

    logger.info(`Collaborator removed from workspace ${workspace.name}: ${userId}`);

    res.json({
      success: true,
      message: 'Collaborator removed successfully'
    });
  } catch (error) {
    logger.error('Error removing collaborator:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove collaborator'
    });
  }
});

// POST /api/workspaces/:workspaceId/duplicate - Duplicate workspace
router.post('/:workspaceId/duplicate', authenticateToken, checkWorkspaceAccess('read'), async (req, res) => {
  try {
    const originalWorkspace = req.workspace;
    const { name } = req.body;
    const userId = req.user.id;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Workspace name is required'
      });
    }

    // Check if user already has a workspace with this name
    const existingWorkspace = await Workspace.findOne({
      owner: userId,
      name: name.trim(),
      isArchived: false
    });

    if (existingWorkspace) {
      return res.status(409).json({
        success: false,
        message: 'A workspace with this name already exists'
      });
    }

    // Create duplicate workspace
    const duplicateWorkspace = new Workspace({
      name: name.trim(),
      description: `Copy of ${originalWorkspace.name}`,
      owner: userId,
      isPublic: false, // Duplicates are private by default
      settings: originalWorkspace.settings,
      files: originalWorkspace.files.filter(file => !file.isDeleted).map(file => ({
        path: file.path,
        content: file.content,
        language: file.language,
        size: file.size,
        modifiedBy: userId
      }))
    });

    await duplicateWorkspace.save();

    // Initialize workspace file system and copy files
    await fileSystem.initializeWorkspace(duplicateWorkspace._id.toString());
    await fileSystem.copyWorkspaceFiles(originalWorkspace._id.toString(), duplicateWorkspace._id.toString());

    await duplicateWorkspace.populate('owner', 'name email avatar');

    logger.info(`Workspace duplicated: ${originalWorkspace.name} -> ${duplicateWorkspace.name} by user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Workspace duplicated successfully',
      data: {
        workspace: {
          ...duplicateWorkspace.toObject(),
          userRole: 'owner'
        }
      }
    });
  } catch (error) {
    logger.error('Error duplicating workspace:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to duplicate workspace'
    });
  }
});

// POST /api/workspaces/:workspaceId/restore - Restore archived workspace
router.post('/:workspaceId/restore', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found'
      });
    }

    // Check if user is owner
    if (workspace.owner.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only workspace owner can restore archived workspaces'
      });
    }

    if (!workspace.isArchived) {
      return res.status(400).json({
        success: false,
        message: 'Workspace is not archived'
      });
    }

    workspace.isArchived = false;
    await workspace.save();

    await workspace.populate('owner', 'name email avatar');
    await workspace.populate('collaborators.userId', 'name email avatar');

    logger.info(`Workspace restored: ${workspace.name} by user ${userId}`);

    res.json({
      success: true,
      message: 'Workspace restored successfully',
      data: {
        workspace: {
          ...workspace.toObject(),
          userRole: 'owner'
        }
      }
    });
  } catch (error) {
    logger.error('Error restoring workspace:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore workspace'
    });
  }
});

// GET /api/workspaces/public - List public workspaces
router.get('/public/list', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {
      isPublic: true,
      isArchived: false
    };

    if (search) {
      query.$text = { $search: search };
    }

    const workspaces = await Workspace.find(query)
      .populate('owner', 'name email avatar')
      .select('-files -collaborators') // Don't include sensitive data
      .sort({ 'stats.lastActivity': -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Workspace.countDocuments(query);

    res.json({
      success: true,
      data: {
        workspaces,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Error listing public workspaces:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list public workspaces'
    });
  }
});

// GET /api/workspaces/stats - Get workspace statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's workspace statistics
    const userStats = await Workspace.aggregate([
      {
        $match: {
          $or: [
            { owner: userId },
            { 'collaborators.userId': userId }
          ]
        }
      },
      {
        $group: {
          _id: null,
          totalWorkspaces: { $sum: 1 },
          ownedWorkspaces: {
            $sum: { $cond: [{ $eq: ['$owner', userId] }, 1, 0] }
          },
          collaborativeWorkspaces: {
            $sum: { $cond: [{ $ne: ['$owner', userId] }, 1, 0] }
          },
          publicWorkspaces: {
            $sum: { $cond: [{ $eq: ['$isPublic', true] }, 1, 0] }
          },
          archivedWorkspaces: {
            $sum: { $cond: [{ $eq: ['$isArchived', true] }, 1, 0] }
          },
          totalFiles: { $sum: '$stats.totalFiles' },
          totalSize: { $sum: '$stats.totalSize' },
          totalExecutions: { $sum: '$stats.executionCount' }
        }
      }
    ]);

    const stats = userStats[0] || {
      totalWorkspaces: 0,
      ownedWorkspaces: 0,
      collaborativeWorkspaces: 0,
      publicWorkspaces: 0,
      archivedWorkspaces: 0,
      totalFiles: 0,
      totalSize: 0,
      totalExecutions: 0
    };

    // Get recent activity
    const recentWorkspaces = await Workspace.find({
      $or: [
        { owner: userId },
        { 'collaborators.userId': userId }
      ],
      isArchived: false
    })
      .populate('owner', 'name email avatar')
      .select('name description owner stats.lastActivity')
      .sort({ 'stats.lastActivity': -1 })
      .limit(5)
      .lean();

    res.json({
      success: true,
      data: {
        stats,
        recentWorkspaces
      }
    });
  } catch (error) {
    logger.error('Error getting workspace statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get workspace statistics'
    });
  }
});

module.exports = router;