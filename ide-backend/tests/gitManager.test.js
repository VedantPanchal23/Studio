const gitManager = require('../utils/gitManager');
const fileSystem = require('../utils/fileSystem');
const path = require('path');
const fs = require('fs').promises;

describe('Git Manager', () => {
  const testWorkspaceId = 'test-git-workspace';
  
  beforeAll(async () => {
    // Initialize Git manager
    await gitManager.initialize();
  });
  
  afterAll(async () => {
    // Clean up test workspace
    try {
      const workspacePath = fileSystem.getWorkspacePath(testWorkspaceId);
      await fs.rmdir(workspacePath, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });
  
  beforeEach(async () => {
    // Ensure clean workspace for each test
    try {
      const workspacePath = fileSystem.getWorkspacePath(testWorkspaceId);
      await fs.rmdir(workspacePath, { recursive: true });
    } catch (error) {
      // Ignore if directory doesn't exist
    }
  });
  
  describe('Git Installation', () => {
    test('should detect Git installation', async () => {
      const isInstalled = await gitManager.checkGitInstallation();
      expect(isInstalled).toBe(true);
    });
  });
  
  describe('Repository Operations', () => {
    test('should initialize a new Git repository', async () => {
      const result = await gitManager.initRepository(testWorkspaceId, {
        userName: 'Test User',
        userEmail: 'test@example.com'
      });
      
      expect(result.success).toBe(true);
      
      // Verify it's a Git repository
      const isGitRepo = await gitManager.isGitRepository(testWorkspaceId);
      expect(isGitRepo).toBe(true);
    });
    
    test('should get repository status', async () => {
      // Initialize repository first
      await gitManager.initRepository(testWorkspaceId);
      
      // Create a test file
      await fileSystem.writeFile(testWorkspaceId, 'test.txt', 'Hello World');
      
      const status = await gitManager.getStatus(testWorkspaceId);
      expect(status.success).toBe(true);
      expect(status.files).toHaveLength(1);
      expect(status.files[0].path).toBe('test.txt');
      expect(status.files[0].status).toBe('untracked');
    });
    
    test('should add files to staging area', async () => {
      // Initialize repository and create file
      await gitManager.initRepository(testWorkspaceId);
      await fileSystem.writeFile(testWorkspaceId, 'test.txt', 'Hello World');
      
      // Add file to staging
      const addResult = await gitManager.addFiles(testWorkspaceId, ['test.txt']);
      expect(addResult.success).toBe(true);
      
      // Check status
      const status = await gitManager.getStatus(testWorkspaceId);
      expect(status.success).toBe(true);
      expect(status.files[0].staged).toBe(true);
    });
    
    test('should commit changes', async () => {
      // Initialize repository, create file, and stage it
      await gitManager.initRepository(testWorkspaceId, {
        userName: 'Test User',
        userEmail: 'test@example.com'
      });
      await fileSystem.writeFile(testWorkspaceId, 'test.txt', 'Hello World');
      await gitManager.addFiles(testWorkspaceId, ['test.txt']);
      
      // Commit changes
      const commitResult = await gitManager.commit(testWorkspaceId, 'Initial commit');
      expect(commitResult.success).toBe(true);
      
      // Check status should be clean
      const status = await gitManager.getStatus(testWorkspaceId);
      expect(status.success).toBe(true);
      expect(status.clean).toBe(true);
    });
    
    test('should get commit history', async () => {
      // Initialize repository, create file, stage, and commit
      await gitManager.initRepository(testWorkspaceId, {
        userName: 'Test User',
        userEmail: 'test@example.com'
      });
      await fileSystem.writeFile(testWorkspaceId, 'test.txt', 'Hello World');
      await gitManager.addFiles(testWorkspaceId, ['test.txt']);
      await gitManager.commit(testWorkspaceId, 'Initial commit');
      
      // Get commit history
      const history = await gitManager.getCommitHistory(testWorkspaceId);
      expect(history.success).toBe(true);
      expect(history.commits).toHaveLength(1);
      expect(history.commits[0].message).toBe('Initial commit');
    });
  });
  
  describe('Branch Operations', () => {
    beforeEach(async () => {
      // Initialize repository with initial commit for branch operations
      await gitManager.initRepository(testWorkspaceId, {
        userName: 'Test User',
        userEmail: 'test@example.com'
      });
      await fileSystem.writeFile(testWorkspaceId, 'test.txt', 'Hello World');
      await gitManager.addFiles(testWorkspaceId, ['test.txt']);
      await gitManager.commit(testWorkspaceId, 'Initial commit');
    });
    
    test('should get branch information', async () => {
      const branchInfo = await gitManager.getBranchInfo(testWorkspaceId);
      expect(branchInfo.success).toBe(true);
      expect(branchInfo.currentBranch).toBe('main');
      expect(branchInfo.branches).toHaveLength(1);
    });
    
    test('should create a new branch', async () => {
      const createResult = await gitManager.createBranch(testWorkspaceId, 'feature-branch');
      expect(createResult.success).toBe(true);
      
      // Verify current branch changed
      const branchInfo = await gitManager.getBranchInfo(testWorkspaceId);
      expect(branchInfo.currentBranch).toBe('feature-branch');
    });
    
    test('should switch branches', async () => {
      // Create and switch to new branch
      await gitManager.createBranch(testWorkspaceId, 'feature-branch');
      
      // Switch back to main
      const switchResult = await gitManager.switchBranch(testWorkspaceId, 'main');
      expect(switchResult.success).toBe(true);
      
      // Verify current branch
      const branchInfo = await gitManager.getBranchInfo(testWorkspaceId);
      expect(branchInfo.currentBranch).toBe('main');
    });
  });
  
  describe('Remote Operations', () => {
    beforeEach(async () => {
      await gitManager.initRepository(testWorkspaceId);
    });
    
    test('should add remote repository', async () => {
      const addResult = await gitManager.addRemote(
        testWorkspaceId, 
        'origin', 
        'https://github.com/test/repo.git'
      );
      expect(addResult.success).toBe(true);
      
      // Verify remote was added
      const remotes = await gitManager.getRemotes(testWorkspaceId);
      expect(remotes.success).toBe(true);
      expect(remotes.remotes.origin).toBeDefined();
    });
    
    test('should get remotes', async () => {
      // Add a remote first
      await gitManager.addRemote(testWorkspaceId, 'origin', 'https://github.com/test/repo.git');
      
      const remotes = await gitManager.getRemotes(testWorkspaceId);
      expect(remotes.success).toBe(true);
      expect(Object.keys(remotes.remotes)).toContain('origin');
    });
  });
  
  describe('Configuration', () => {
    beforeEach(async () => {
      await gitManager.initRepository(testWorkspaceId);
    });
    
    test('should set and get Git configuration', async () => {
      // Set configuration
      const setResult = await gitManager.setConfig(testWorkspaceId, 'user.name', 'Test User');
      expect(setResult.success).toBe(true);
      
      // Get configuration
      const getResult = await gitManager.getConfig(testWorkspaceId, 'user.name');
      expect(getResult.success).toBe(true);
      expect(getResult.value).toBe('Test User');
    });
  });
  
  describe('Error Handling', () => {
    test('should handle non-existent workspace', async () => {
      const result = await gitManager.getStatus('non-existent-workspace');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
    
    test('should handle non-Git repository', async () => {
      // Create workspace but don't initialize Git
      await fileSystem.ensureWorkspaceExists(testWorkspaceId);
      
      const isGitRepo = await gitManager.isGitRepository(testWorkspaceId);
      expect(isGitRepo).toBe(false);
      
      const status = await gitManager.getStatus(testWorkspaceId);
      expect(status.success).toBe(false);
    });
  });
});