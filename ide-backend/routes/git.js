const express = require('express');
const { body, param, query, validationResult } = require('express-validator');

const { authenticateToken } = require('../middleware/auth');
const { Workspace } = require('../models');
const gitManager = require('../utils/gitManager');
const githubAPI = require('../utils/githubApi');
const logger = require('../utils/logger');

const router = express.Router();

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

// GET /api/git/:workspaceId/status - Get Git repository status
router.get('/:workspaceId/status',
  authenticateToken,
  param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
  checkWorkspaceAccess,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { workspaceId } = req.params;

      // Check if it's a Git repository
      const isGitRepo = await gitManager.isGitRepository(workspaceId);
      if (!isGitRepo) {
        return res.json({
          isGitRepository: false,
          message: 'Not a Git repository'
        });
      }

      // Get repository status
      const statusResult = await gitManager.getStatus(workspaceId);
      if (!statusResult.success) {
        return res.status(500).json({ error: statusResult.error });
      }

      // Get branch information
      const branchResult = await gitManager.getBranchInfo(workspaceId);
      
      // Get remotes
      const remotesResult = await gitManager.getRemotes(workspaceId);

      res.json({
        isGitRepository: true,
        status: statusResult,
        branches: branchResult.success ? branchResult : null,
        remotes: remotesResult.success ? remotesResult.remotes : {}
      });
    } catch (error) {
      logger.error('Error getting Git status:', error);
      res.status(500).json({ error: 'Failed to get Git status' });
    }
  }
);

// POST /api/git/:workspaceId/init - Initialize Git repository
router.post('/:workspaceId/init',
  authenticateToken,
  param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
  body('userName').optional().isString().trim(),
  body('userEmail').optional().isEmail(),
  checkWorkspaceAccess,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { workspaceId } = req.params;
      const { userName, userEmail } = req.body;

      // Check if already a Git repository
      const isGitRepo = await gitManager.isGitRepository(workspaceId);
      if (isGitRepo) {
        return res.status(409).json({ error: 'Already a Git repository' });
      }

      // Initialize repository
      const result = await gitManager.initRepository(workspaceId, {
        userName: userName || req.user.name,
        userEmail: userEmail || req.user.email
      });

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      // Update workspace model
      req.workspace.gitRepo = {
        initialized: true,
        initializedAt: new Date(),
        initializedBy: req.user.id
      };
      await req.workspace.save();

      res.json({
        message: 'Git repository initialized successfully',
        result: result.stdout
      });
    } catch (error) {
      logger.error('Error initializing Git repository:', error);
      res.status(500).json({ error: 'Failed to initialize Git repository' });
    }
  }
);

// POST /api/git/:workspaceId/clone - Clone repository
router.post('/:workspaceId/clone',
  authenticateToken,
  param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
  body('repoUrl').isURL().withMessage('Valid repository URL is required'),
  body('branch').optional().isString().trim(),
  body('depth').optional().isInt({ min: 1 }),
  checkWorkspaceAccess,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { workspaceId } = req.params;
      const { repoUrl, branch, depth } = req.body;

      // Check if already a Git repository
      const isGitRepo = await gitManager.isGitRepository(workspaceId);
      if (isGitRepo) {
        return res.status(409).json({ error: 'Workspace already contains a Git repository' });
      }

      // Clone repository
      const result = await gitManager.cloneRepository(workspaceId, repoUrl, {
        branch,
        depth
      });

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      // Update workspace model
      req.workspace.gitRepo = {
        url: repoUrl,
        branch: branch || 'main',
        clonedAt: new Date(),
        clonedBy: req.user.id
      };
      await req.workspace.save();

      res.json({
        message: 'Repository cloned successfully',
        repoUrl,
        branch: branch || 'main'
      });
    } catch (error) {
      logger.error('Error cloning repository:', error);
      res.status(500).json({ error: 'Failed to clone repository' });
    }
  }
);

// POST /api/git/:workspaceId/add - Add files to staging area
router.post('/:workspaceId/add',
  authenticateToken,
  param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
  body('files').optional().isArray(),
  body('files.*').isString(),
  checkWorkspaceAccess,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { workspaceId } = req.params;
      const { files = [] } = req.body;

      // Check if it's a Git repository
      const isGitRepo = await gitManager.isGitRepository(workspaceId);
      if (!isGitRepo) {
        return res.status(400).json({ error: 'Not a Git repository' });
      }

      // Add files to staging area
      const result = await gitManager.addFiles(workspaceId, files);

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json({
        message: files.length === 0 ? 'All files added to staging area' : `${files.length} files added to staging area`,
        files: files.length === 0 ? ['all files'] : files
      });
    } catch (error) {
      logger.error('Error adding files to Git:', error);
      res.status(500).json({ error: 'Failed to add files' });
    }
  }
);

// POST /api/git/:workspaceId/unstage - Remove files from staging area
router.post('/:workspaceId/unstage',
  authenticateToken,
  param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
  body('files').optional().isArray(),
  body('files.*').isString(),
  checkWorkspaceAccess,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { workspaceId } = req.params;
      const { files = [] } = req.body;

      // Check if it's a Git repository
      const isGitRepo = await gitManager.isGitRepository(workspaceId);
      if (!isGitRepo) {
        return res.status(400).json({ error: 'Not a Git repository' });
      }

      // Remove files from staging area
      const result = await gitManager.unstageFiles(workspaceId, files);

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json({
        message: files.length === 0 ? 'All files removed from staging area' : `${files.length} files removed from staging area`,
        files: files.length === 0 ? ['all files'] : files
      });
    } catch (error) {
      logger.error('Error unstaging files:', error);
      res.status(500).json({ error: 'Failed to unstage files' });
    }
  }
);

// POST /api/git/:workspaceId/commit - Commit changes
router.post('/:workspaceId/commit',
  authenticateToken,
  param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
  body('message').isString().trim().isLength({ min: 1 }).withMessage('Commit message is required'),
  body('author').optional().isString(),
  body('amend').optional().isBoolean(),
  checkWorkspaceAccess,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { workspaceId } = req.params;
      const { message, author, amend } = req.body;

      // Check if it's a Git repository
      const isGitRepo = await gitManager.isGitRepository(workspaceId);
      if (!isGitRepo) {
        return res.status(400).json({ error: 'Not a Git repository' });
      }

      // Commit changes
      const result = await gitManager.commit(workspaceId, message, {
        author,
        amend
      });

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      // Update workspace model
      req.workspace.gitRepo = {
        ...req.workspace.gitRepo,
        lastCommit: new Date(),
        lastCommitBy: req.user.id,
        lastCommitMessage: message
      };
      await req.workspace.save();

      res.json({
        message: 'Changes committed successfully',
        commitMessage: message,
        result: result.stdout
      });
    } catch (error) {
      logger.error('Error committing changes:', error);
      res.status(500).json({ error: 'Failed to commit changes' });
    }
  }
);

// GET /api/git/:workspaceId/history - Get commit history
router.get('/:workspaceId/history',
  authenticateToken,
  param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('since').optional().isISO8601(),
  checkWorkspaceAccess,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { workspaceId } = req.params;
      const { limit, since } = req.query;

      // Check if it's a Git repository
      const isGitRepo = await gitManager.isGitRepository(workspaceId);
      if (!isGitRepo) {
        return res.status(400).json({ error: 'Not a Git repository' });
      }

      // Get commit history
      const result = await gitManager.getCommitHistory(workspaceId, {
        limit: limit ? parseInt(limit) : 20,
        since
      });

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json({
        commits: result.commits,
        count: result.commits.length
      });
    } catch (error) {
      logger.error('Error getting commit history:', error);
      res.status(500).json({ error: 'Failed to get commit history' });
    }
  }
);

// GET /api/git/:workspaceId/branches - Get branch information
router.get('/:workspaceId/branches',
  authenticateToken,
  param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
  checkWorkspaceAccess,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { workspaceId } = req.params;

      // Check if it's a Git repository
      const isGitRepo = await gitManager.isGitRepository(workspaceId);
      if (!isGitRepo) {
        return res.status(400).json({ error: 'Not a Git repository' });
      }

      // Get branch information
      const result = await gitManager.getBranchInfo(workspaceId);

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json(result);
    } catch (error) {
      logger.error('Error getting branch information:', error);
      res.status(500).json({ error: 'Failed to get branch information' });
    }
  }
);

// POST /api/git/:workspaceId/branches - Create new branch
router.post('/:workspaceId/branches',
  authenticateToken,
  param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
  body('name').isString().trim().isLength({ min: 1 }).withMessage('Branch name is required'),
  body('startPoint').optional().isString(),
  checkWorkspaceAccess,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { workspaceId } = req.params;
      const { name, startPoint } = req.body;

      // Check if it's a Git repository
      const isGitRepo = await gitManager.isGitRepository(workspaceId);
      if (!isGitRepo) {
        return res.status(400).json({ error: 'Not a Git repository' });
      }

      // Create new branch
      const result = await gitManager.createBranch(workspaceId, name, { startPoint });

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json({
        message: `Branch '${name}' created successfully`,
        branchName: name,
        startPoint
      });
    } catch (error) {
      logger.error('Error creating branch:', error);
      res.status(500).json({ error: 'Failed to create branch' });
    }
  }
);

// POST /api/git/:workspaceId/branches/switch - Switch branch
router.post('/:workspaceId/branches/switch',
  authenticateToken,
  param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
  body('name').isString().trim().isLength({ min: 1 }).withMessage('Branch name is required'),
  checkWorkspaceAccess,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { workspaceId } = req.params;
      const { name } = req.body;

      // Check if it's a Git repository
      const isGitRepo = await gitManager.isGitRepository(workspaceId);
      if (!isGitRepo) {
        return res.status(400).json({ error: 'Not a Git repository' });
      }

      // Switch branch
      const result = await gitManager.switchBranch(workspaceId, name);

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json({
        message: `Switched to branch '${name}'`,
        branchName: name
      });
    } catch (error) {
      logger.error('Error switching branch:', error);
      res.status(500).json({ error: 'Failed to switch branch' });
    }
  }
);

// DELETE /api/git/:workspaceId/branches/:branchName - Delete branch
router.delete('/:workspaceId/branches/:branchName',
  authenticateToken,
  param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
  param('branchName').isString().trim().isLength({ min: 1 }).withMessage('Branch name is required'),
  query('force').optional().isBoolean(),
  checkWorkspaceAccess,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { workspaceId, branchName } = req.params;
      const { force } = req.query;

      // Check if it's a Git repository
      const isGitRepo = await gitManager.isGitRepository(workspaceId);
      if (!isGitRepo) {
        return res.status(400).json({ error: 'Not a Git repository' });
      }

      // Delete branch
      const result = await gitManager.deleteBranch(workspaceId, branchName, {
        force: force === 'true'
      });

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json({
        message: `Branch '${branchName}' deleted successfully`,
        branchName
      });
    } catch (error) {
      logger.error('Error deleting branch:', error);
      res.status(500).json({ error: 'Failed to delete branch' });
    }
  }
);

// GET /api/git/:workspaceId/remotes - Get remote repositories
router.get('/:workspaceId/remotes',
  authenticateToken,
  param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
  checkWorkspaceAccess,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { workspaceId } = req.params;

      // Check if it's a Git repository
      const isGitRepo = await gitManager.isGitRepository(workspaceId);
      if (!isGitRepo) {
        return res.status(400).json({ error: 'Not a Git repository' });
      }

      // Get remotes
      const result = await gitManager.getRemotes(workspaceId);

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json(result);
    } catch (error) {
      logger.error('Error getting remotes:', error);
      res.status(500).json({ error: 'Failed to get remotes' });
    }
  }
);

// POST /api/git/:workspaceId/remotes - Add remote repository
router.post('/:workspaceId/remotes',
  authenticateToken,
  param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
  body('name').isString().trim().isLength({ min: 1 }).withMessage('Remote name is required'),
  body('url').isURL().withMessage('Valid remote URL is required'),
  checkWorkspaceAccess,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { workspaceId } = req.params;
      const { name, url } = req.body;

      // Check if it's a Git repository
      const isGitRepo = await gitManager.isGitRepository(workspaceId);
      if (!isGitRepo) {
        return res.status(400).json({ error: 'Not a Git repository' });
      }

      // Add remote
      const result = await gitManager.addRemote(workspaceId, name, url);

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json({
        message: `Remote '${name}' added successfully`,
        name,
        url
      });
    } catch (error) {
      logger.error('Error adding remote:', error);
      res.status(500).json({ error: 'Failed to add remote' });
    }
  }
);

// POST /api/git/:workspaceId/push - Push changes to remote
router.post('/:workspaceId/push',
  authenticateToken,
  param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
  body('remote').optional().isString(),
  body('branch').optional().isString(),
  body('setUpstream').optional().isBoolean(),
  body('force').optional().isBoolean(),
  checkWorkspaceAccess,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { workspaceId } = req.params;
      const { remote, branch, setUpstream, force } = req.body;

      // Check if it's a Git repository
      const isGitRepo = await gitManager.isGitRepository(workspaceId);
      if (!isGitRepo) {
        return res.status(400).json({ error: 'Not a Git repository' });
      }

      // Push changes
      const result = await gitManager.push(workspaceId, {
        remote,
        branch,
        setUpstream,
        force
      });

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json({
        message: 'Changes pushed successfully',
        remote: remote || 'origin',
        branch,
        result: result.stdout
      });
    } catch (error) {
      logger.error('Error pushing changes:', error);
      res.status(500).json({ error: 'Failed to push changes' });
    }
  }
);

// POST /api/git/:workspaceId/pull - Pull changes from remote
router.post('/:workspaceId/pull',
  authenticateToken,
  param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
  body('remote').optional().isString(),
  body('branch').optional().isString(),
  body('rebase').optional().isBoolean(),
  checkWorkspaceAccess,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { workspaceId } = req.params;
      const { remote, branch, rebase } = req.body;

      // Check if it's a Git repository
      const isGitRepo = await gitManager.isGitRepository(workspaceId);
      if (!isGitRepo) {
        return res.status(400).json({ error: 'Not a Git repository' });
      }

      // Pull changes
      const result = await gitManager.pull(workspaceId, {
        remote,
        branch,
        rebase
      });

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json({
        message: 'Changes pulled successfully',
        remote: remote || 'origin',
        branch,
        result: result.stdout
      });
    } catch (error) {
      logger.error('Error pulling changes:', error);
      res.status(500).json({ error: 'Failed to pull changes' });
    }
  }
);

// POST /api/git/:workspaceId/fetch - Fetch changes from remote
router.post('/:workspaceId/fetch',
  authenticateToken,
  param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
  body('remote').optional().isString(),
  body('all').optional().isBoolean(),
  checkWorkspaceAccess,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { workspaceId } = req.params;
      const { remote, all } = req.body;

      // Check if it's a Git repository
      const isGitRepo = await gitManager.isGitRepository(workspaceId);
      if (!isGitRepo) {
        return res.status(400).json({ error: 'Not a Git repository' });
      }

      // Fetch changes
      const result = await gitManager.fetch(workspaceId, {
        remote,
        all
      });

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json({
        message: 'Changes fetched successfully',
        remote: remote || (all ? 'all remotes' : 'origin'),
        result: result.stdout
      });
    } catch (error) {
      logger.error('Error fetching changes:', error);
      res.status(500).json({ error: 'Failed to fetch changes' });
    }
  }
);

// GET /api/git/:workspaceId/diff - Get diff for files
router.get('/:workspaceId/diff',
  authenticateToken,
  param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
  query('staged').optional().isBoolean(),
  query('file').optional().isString(),
  checkWorkspaceAccess,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { workspaceId } = req.params;
      const { staged, file } = req.query;

      // Check if it's a Git repository
      const isGitRepo = await gitManager.isGitRepository(workspaceId);
      if (!isGitRepo) {
        return res.status(400).json({ error: 'Not a Git repository' });
      }

      // Get diff
      const result = await gitManager.getDiff(workspaceId, {
        staged: staged === 'true',
        file
      });

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json({
        diff: result.stdout,
        staged: staged === 'true',
        file: file || 'all files'
      });
    } catch (error) {
      logger.error('Error getting diff:', error);
      res.status(500).json({ error: 'Failed to get diff' });
    }
  }
);

// GitHub API integration routes

// GET /api/git/github/user - Get authenticated GitHub user
router.get('/github/user',
  authenticateToken,
  async (req, res) => {
    try {
      const githubToken = req.user.githubToken;
      if (!githubToken) {
        return res.status(400).json({ error: 'GitHub token not found. Please connect your GitHub account.' });
      }

      const result = await githubAPI.getAuthenticatedUser(githubToken);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result.user);
    } catch (error) {
      logger.error('Error getting GitHub user:', error);
      res.status(500).json({ error: 'Failed to get GitHub user information' });
    }
  }
);

// GET /api/git/github/repositories - List user repositories
router.get('/github/repositories',
  authenticateToken,
  query('visibility').optional().isIn(['all', 'public', 'private']),
  query('sort').optional().isIn(['created', 'updated', 'pushed', 'full_name']),
  query('direction').optional().isIn(['asc', 'desc']),
  query('page').optional().isInt({ min: 1 }),
  query('perPage').optional().isInt({ min: 1, max: 100 }),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const githubToken = req.user.githubToken;
      if (!githubToken) {
        return res.status(400).json({ error: 'GitHub token not found. Please connect your GitHub account.' });
      }

      const { visibility, sort, direction, page, perPage } = req.query;

      const result = await githubAPI.listUserRepositories(githubToken, {
        visibility,
        sort,
        direction,
        page: page ? parseInt(page) : 1,
        perPage: perPage ? parseInt(perPage) : 30
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result);
    } catch (error) {
      logger.error('Error listing GitHub repositories:', error);
      res.status(500).json({ error: 'Failed to list GitHub repositories' });
    }
  }
);

// POST /api/git/github/repositories - Create new repository
router.post('/github/repositories',
  authenticateToken,
  body('name').isString().trim().isLength({ min: 1 }).withMessage('Repository name is required'),
  body('description').optional().isString(),
  body('private').optional().isBoolean(),
  body('autoInit').optional().isBoolean(),
  body('gitignoreTemplate').optional().isString(),
  body('licenseTemplate').optional().isString(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const githubToken = req.user.githubToken;
      if (!githubToken) {
        return res.status(400).json({ error: 'GitHub token not found. Please connect your GitHub account.' });
      }

      const result = await githubAPI.createRepository(githubToken, req.body);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result.repository);
    } catch (error) {
      logger.error('Error creating GitHub repository:', error);
      res.status(500).json({ error: 'Failed to create GitHub repository' });
    }
  }
);

module.exports = router;