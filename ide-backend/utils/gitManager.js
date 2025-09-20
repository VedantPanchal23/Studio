const fs = require('fs').promises;
const path = require('path');
const { execSync, spawn } = require('child_process');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

const logger = require('./logger');
const fileSystem = require('./fileSystem');

class GitManager {
  constructor() {
    this.gitExecutable = 'git';
  }

  /**
   * Initialize Git manager and verify Git installation
   */
  async initialize() {
    try {
      await this.checkGitInstallation();
      logger.info('Git manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Git manager:', error);
      throw error;
    }
  }

  /**
   * Check if Git is installed and accessible
   */
  async checkGitInstallation() {
    try {
      const { stdout } = await exec('git --version');
      logger.info(`Git version detected: ${stdout.trim()}`);
      return true;
    } catch (error) {
      throw new Error('Git is not installed or not accessible in PATH');
    }
  }

  /**
   * Get workspace Git directory path
   */
  getWorkspaceGitPath(workspaceId) {
    return fileSystem.getWorkspacePath(workspaceId);
  }

  /**
   * Execute Git command in workspace directory
   */
  async executeGitCommand(workspaceId, command, args = [], options = {}) {
    const workspacePath = this.getWorkspaceGitPath(workspaceId);
    
    try {
      // Ensure workspace directory exists
      await fileSystem.ensureWorkspaceExists(workspaceId);
      
      const fullCommand = `${this.gitExecutable} ${command} ${args.join(' ')}`;
      logger.debug(`Executing Git command: ${fullCommand} in ${workspacePath}`);
      
      const { stdout, stderr } = await exec(fullCommand, {
        cwd: workspacePath,
        timeout: 30000, // 30 second timeout
        ...options
      });
      
      return {
        success: true,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      };
    } catch (error) {
      logger.error(`Git command failed: ${command}`, error);
      return {
        success: false,
        error: error.message,
        stdout: error.stdout || '',
        stderr: error.stderr || ''
      };
    }
  }

  /**
   * Initialize a new Git repository
   */
  async initRepository(workspaceId, options = {}) {
    try {
      const result = await this.executeGitCommand(workspaceId, 'init', []);
      
      if (result.success) {
        // Set default configuration if provided
        if (options.userName) {
          await this.setConfig(workspaceId, 'user.name', options.userName);
        }
        if (options.userEmail) {
          await this.setConfig(workspaceId, 'user.email', options.userEmail);
        }
        
        // Set default branch name to main
        await this.executeGitCommand(workspaceId, 'config', ['init.defaultBranch', 'main']);
      }
      
      return result;
    } catch (error) {
      logger.error('Error initializing Git repository:', error);
      throw error;
    }
  }

  /**
   * Clone a repository
   */
  async cloneRepository(workspaceId, repoUrl, options = {}) {
    try {
      const workspacePath = this.getWorkspaceGitPath(workspaceId);
      
      // Ensure parent directory exists
      await fileSystem.ensureWorkspaceExists(workspaceId);
      
      const args = ['clone'];
      
      if (options.branch) {
        args.push('-b', options.branch);
      }
      
      if (options.depth) {
        args.push('--depth', options.depth.toString());
      }
      
      args.push(repoUrl, '.');
      
      const result = await this.executeGitCommand(workspaceId, '', args);
      return result;
    } catch (error) {
      logger.error('Error cloning repository:', error);
      throw error;
    }
  }

  /**
   * Get repository status
   */
  async getStatus(workspaceId) {
    try {
      const result = await this.executeGitCommand(workspaceId, 'status', ['--porcelain']);
      
      if (!result.success) {
        return result;
      }
      
      const files = [];
      const lines = result.stdout.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const status = line.substring(0, 2);
        const filePath = line.substring(3);
        
        files.push({
          path: filePath,
          status: this.parseFileStatus(status),
          staged: status[0] !== ' ' && status[0] !== '?',
          modified: status[1] !== ' '
        });
      }
      
      return {
        success: true,
        files,
        clean: files.length === 0
      };
    } catch (error) {
      logger.error('Error getting Git status:', error);
      throw error;
    }
  }

  /**
   * Parse Git file status codes
   */
  parseFileStatus(status) {
    const statusMap = {
      'M ': 'modified_staged',
      ' M': 'modified',
      'MM': 'modified_both',
      'A ': 'added',
      'AM': 'added_modified',
      'D ': 'deleted_staged',
      ' D': 'deleted',
      'R ': 'renamed_staged',
      ' R': 'renamed',
      'C ': 'copied_staged',
      ' C': 'copied',
      'U ': 'unmerged_staged',
      ' U': 'unmerged',
      '??': 'untracked',
      '!!': 'ignored'
    };
    
    return statusMap[status] || 'unknown';
  }

  /**
   * Add files to staging area
   */
  async addFiles(workspaceId, files = []) {
    try {
      const args = ['add'];
      
      if (files.length === 0) {
        args.push('.');
      } else {
        args.push(...files);
      }
      
      return await this.executeGitCommand(workspaceId, '', args);
    } catch (error) {
      logger.error('Error adding files to Git:', error);
      throw error;
    }
  }

  /**
   * Remove files from staging area
   */
  async unstageFiles(workspaceId, files = []) {
    try {
      const args = ['reset', 'HEAD'];
      
      if (files.length > 0) {
        args.push('--', ...files);
      }
      
      return await this.executeGitCommand(workspaceId, '', args);
    } catch (error) {
      logger.error('Error unstaging files:', error);
      throw error;
    }
  }

  /**
   * Commit changes
   */
  async commit(workspaceId, message, options = {}) {
    try {
      const args = ['commit', '-m', message];
      
      if (options.author) {
        args.push('--author', options.author);
      }
      
      if (options.amend) {
        args.push('--amend');
      }
      
      return await this.executeGitCommand(workspaceId, '', args);
    } catch (error) {
      logger.error('Error committing changes:', error);
      throw error;
    }
  }

  /**
   * Get commit history
   */
  async getCommitHistory(workspaceId, options = {}) {
    try {
      const args = ['log', '--oneline'];
      
      if (options.limit) {
        args.push('-n', options.limit.toString());
      }
      
      if (options.since) {
        args.push('--since', options.since);
      }
      
      const result = await this.executeGitCommand(workspaceId, '', args);
      
      if (!result.success) {
        return result;
      }
      
      const commits = [];
      const lines = result.stdout.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const [hash, ...messageParts] = line.split(' ');
        commits.push({
          hash,
          message: messageParts.join(' ')
        });
      }
      
      return {
        success: true,
        commits
      };
    } catch (error) {
      logger.error('Error getting commit history:', error);
      throw error;
    }
  }

  /**
   * Get current branch information
   */
  async getBranchInfo(workspaceId) {
    try {
      const currentBranchResult = await this.executeGitCommand(workspaceId, 'branch', ['--show-current']);
      const allBranchesResult = await this.executeGitCommand(workspaceId, 'branch', ['-a']);
      
      if (!currentBranchResult.success || !allBranchesResult.success) {
        return {
          success: false,
          error: 'Failed to get branch information'
        };
      }
      
      const currentBranch = currentBranchResult.stdout.trim();
      const branches = allBranchesResult.stdout
        .split('\n')
        .map(line => line.trim())
        .filter(line => line)
        .map(line => {
          const isCurrent = line.startsWith('*');
          const name = line.replace(/^\*\s*/, '').replace(/^remotes\//, '');
          return {
            name,
            current: isCurrent,
            remote: line.includes('remotes/')
          };
        });
      
      return {
        success: true,
        currentBranch,
        branches
      };
    } catch (error) {
      logger.error('Error getting branch info:', error);
      throw error;
    }
  }

  /**
   * Create a new branch
   */
  async createBranch(workspaceId, branchName, options = {}) {
    try {
      const args = ['checkout', '-b', branchName];
      
      if (options.startPoint) {
        args.push(options.startPoint);
      }
      
      return await this.executeGitCommand(workspaceId, '', args);
    } catch (error) {
      logger.error('Error creating branch:', error);
      throw error;
    }
  }

  /**
   * Switch to a branch
   */
  async switchBranch(workspaceId, branchName) {
    try {
      return await this.executeGitCommand(workspaceId, 'checkout', [branchName]);
    } catch (error) {
      logger.error('Error switching branch:', error);
      throw error;
    }
  }

  /**
   * Delete a branch
   */
  async deleteBranch(workspaceId, branchName, options = {}) {
    try {
      const args = ['branch'];
      
      if (options.force) {
        args.push('-D');
      } else {
        args.push('-d');
      }
      
      args.push(branchName);
      
      return await this.executeGitCommand(workspaceId, '', args);
    } catch (error) {
      logger.error('Error deleting branch:', error);
      throw error;
    }
  }

  /**
   * Add remote repository
   */
  async addRemote(workspaceId, name, url) {
    try {
      return await this.executeGitCommand(workspaceId, 'remote', ['add', name, url]);
    } catch (error) {
      logger.error('Error adding remote:', error);
      throw error;
    }
  }

  /**
   * Get remote repositories
   */
  async getRemotes(workspaceId) {
    try {
      const result = await this.executeGitCommand(workspaceId, 'remote', ['-v']);
      
      if (!result.success) {
        return result;
      }
      
      const remotes = {};
      const lines = result.stdout.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const [name, url, type] = line.split(/\s+/);
        if (!remotes[name]) {
          remotes[name] = {};
        }
        remotes[name][type.replace(/[()]/g, '')] = url;
      }
      
      return {
        success: true,
        remotes
      };
    } catch (error) {
      logger.error('Error getting remotes:', error);
      throw error;
    }
  }

  /**
   * Push changes to remote
   */
  async push(workspaceId, options = {}) {
    try {
      const args = ['push'];
      
      if (options.remote) {
        args.push(options.remote);
      }
      
      if (options.branch) {
        args.push(options.branch);
      }
      
      if (options.setUpstream) {
        args.push('-u');
      }
      
      if (options.force) {
        args.push('--force');
      }
      
      return await this.executeGitCommand(workspaceId, '', args);
    } catch (error) {
      logger.error('Error pushing changes:', error);
      throw error;
    }
  }

  /**
   * Pull changes from remote
   */
  async pull(workspaceId, options = {}) {
    try {
      const args = ['pull'];
      
      if (options.remote) {
        args.push(options.remote);
      }
      
      if (options.branch) {
        args.push(options.branch);
      }
      
      if (options.rebase) {
        args.push('--rebase');
      }
      
      return await this.executeGitCommand(workspaceId, '', args);
    } catch (error) {
      logger.error('Error pulling changes:', error);
      throw error;
    }
  }

  /**
   * Fetch changes from remote
   */
  async fetch(workspaceId, options = {}) {
    try {
      const args = ['fetch'];
      
      if (options.remote) {
        args.push(options.remote);
      }
      
      if (options.all) {
        args.push('--all');
      }
      
      return await this.executeGitCommand(workspaceId, '', args);
    } catch (error) {
      logger.error('Error fetching changes:', error);
      throw error;
    }
  }

  /**
   * Set Git configuration
   */
  async setConfig(workspaceId, key, value, options = {}) {
    try {
      const args = ['config'];
      
      if (options.global) {
        args.push('--global');
      }
      
      args.push(key, value);
      
      return await this.executeGitCommand(workspaceId, '', args);
    } catch (error) {
      logger.error('Error setting Git config:', error);
      throw error;
    }
  }

  /**
   * Get Git configuration
   */
  async getConfig(workspaceId, key = null) {
    try {
      const args = ['config'];
      
      if (key) {
        args.push(key);
      } else {
        args.push('--list');
      }
      
      const result = await this.executeGitCommand(workspaceId, '', args);
      
      if (!result.success) {
        return result;
      }
      
      if (key) {
        return {
          success: true,
          value: result.stdout.trim()
        };
      } else {
        const config = {};
        const lines = result.stdout.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          const [configKey, ...valueParts] = line.split('=');
          if (configKey && valueParts.length > 0) {
            config[configKey] = valueParts.join('=');
          }
        }
        
        return {
          success: true,
          config
        };
      }
    } catch (error) {
      logger.error('Error getting Git config:', error);
      throw error;
    }
  }

  /**
   * Check if directory is a Git repository
   */
  async isGitRepository(workspaceId) {
    try {
      const result = await this.executeGitCommand(workspaceId, 'rev-parse', ['--is-inside-work-tree']);
      return result.success && result.stdout.trim() === 'true';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get diff for files
   */
  async getDiff(workspaceId, options = {}) {
    try {
      const args = ['diff'];
      
      if (options.staged) {
        args.push('--staged');
      }
      
      if (options.file) {
        args.push('--', options.file);
      }
      
      return await this.executeGitCommand(workspaceId, '', args);
    } catch (error) {
      logger.error('Error getting diff:', error);
      throw error;
    }
  }

  /**
   * Stash changes
   */
  async stash(workspaceId, message = null) {
    try {
      const args = ['stash'];
      
      if (message) {
        args.push('push', '-m', message);
      }
      
      return await this.executeGitCommand(workspaceId, '', args);
    } catch (error) {
      logger.error('Error stashing changes:', error);
      throw error;
    }
  }

  /**
   * Apply stash
   */
  async stashPop(workspaceId, stashIndex = null) {
    try {
      const args = ['stash', 'pop'];
      
      if (stashIndex !== null) {
        args.push(`stash@{${stashIndex}}`);
      }
      
      return await this.executeGitCommand(workspaceId, '', args);
    } catch (error) {
      logger.error('Error applying stash:', error);
      throw error;
    }
  }

  /**
   * List stashes
   */
  async listStashes(workspaceId) {
    try {
      const result = await this.executeGitCommand(workspaceId, 'stash', ['list']);
      
      if (!result.success) {
        return result;
      }
      
      const stashes = [];
      const lines = result.stdout.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const match = line.match(/^stash@\{(\d+)\}:\s*(.+)$/);
        if (match) {
          stashes.push({
            index: parseInt(match[1]),
            message: match[2]
          });
        }
      }
      
      return {
        success: true,
        stashes
      };
    } catch (error) {
      logger.error('Error listing stashes:', error);
      throw error;
    }
  }
}

// Create singleton instance
const gitManager = new GitManager();

module.exports = gitManager;