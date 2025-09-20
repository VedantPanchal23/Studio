const { spawn } = require('child_process');
const crypto = require('crypto');
const logger = require('../utils/logger');
const path = require('path');
const os = require('os');

/**
 * Terminal service for managing terminal sessions
 */
class TerminalService {
  constructor() {
    this.terminals = new Map(); // terminalId -> terminal instance
    this.userTerminals = new Map(); // userId -> Set of terminalIds
    this.commandHistory = new Map(); // terminalId -> command history array
  }

  /**
   * Create a new terminal session
   * @param {string} userId - User ID
   * @param {string} workspaceId - Workspace ID
   * @param {Object} options - Terminal options
   * @returns {Object} Terminal session info
   */
  createTerminal(userId, workspaceId, options = {}) {
    const terminalId = 'terminal_' + crypto.randomBytes(16).toString('hex');
    
    // Determine shell and working directory
    const shell = this.getShell(options.shell);
    const cwd = this.getWorkingDirectory(workspaceId, options.cwd);
    
    // Determine shell arguments
    const shellArgs = this.getShellArgs(shell, options);
    
    logger.info('Creating terminal session', {
      terminalId,
      userId,
      workspaceId,
      shell,
      cwd,
      shellArgs
    });

    try {
      // Spawn the shell process
      const childProcess = spawn(shell, shellArgs, {
        cwd: cwd,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLUMNS: options.cols || 80,
          LINES: options.rows || 24,
          // Add workspace-specific environment variables
          WORKSPACE_ID: workspaceId,
          USER_ID: userId
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const terminal = {
        id: terminalId,
        userId: userId,
        workspaceId: workspaceId,
        process: childProcess,
        shell: shell,
        cwd: cwd,
        createdAt: new Date(),
        lastActivity: new Date(),
        isActive: true,
        cols: options.cols || 80,
        rows: options.rows || 24
      };

      // Store terminal
      this.terminals.set(terminalId, terminal);
      
      // Track user terminals
      if (!this.userTerminals.has(userId)) {
        this.userTerminals.set(userId, new Set());
      }
      this.userTerminals.get(userId).add(terminalId);

      // Set up process event handlers
      this.setupProcessHandlers(terminal);

      logger.info('Terminal session created successfully', {
        terminalId,
        userId,
        pid: process.pid
      });

      return {
        terminalId: terminalId,
        shell: shell,
        cwd: cwd,
        cols: terminal.cols,
        rows: terminal.rows,
        pid: childProcess.pid,
        createdAt: terminal.createdAt
      };

    } catch (error) {
      logger.error('Failed to create terminal session', {
        terminalId,
        userId,
        workspaceId,
        error: error.message
      });
      throw new Error(`Failed to create terminal: ${error.message}`);
    }
  }

  /**
   * Get appropriate shell for the platform
   * @param {string} requestedShell - Requested shell
   * @returns {string} Shell path
   */
  getShell(requestedShell) {
    if (requestedShell) {
      return requestedShell;
    }

    // Default shells by platform
    switch (os.platform()) {
      case 'win32':
        return process.env.COMSPEC || 'cmd.exe';
      case 'darwin':
      case 'linux':
        return process.env.SHELL || '/bin/bash';
      default:
        return '/bin/sh';
    }
  }

  /**
   * Get shell arguments based on shell type
   * @param {string} shell - Shell path
   * @param {Object} options - Terminal options
   * @returns {Array} Shell arguments
   */
  getShellArgs(shell, options) {
    const shellName = path.basename(shell).toLowerCase();
    
    // Windows Command Prompt
    if (shellName === 'cmd.exe') {
      return ['/k']; // Keep window open after command
    }
    
    // PowerShell
    if (shellName.includes('powershell') || shellName === 'pwsh.exe') {
      return ['-NoExit', '-NoLogo'];
    }
    
    // Unix shells (bash, zsh, etc.)
    if (shellName.includes('bash') || shellName.includes('zsh') || shellName.includes('sh')) {
      return ['--login']; // Login shell to load profile
    }
    
    return [];
  }

  /**
   * Get working directory for terminal
   * @param {string} workspaceId - Workspace ID
   * @param {string} requestedCwd - Requested working directory
   * @returns {string} Working directory path
   */
  getWorkingDirectory(workspaceId, requestedCwd) {
    if (requestedCwd) {
      return requestedCwd;
    }

    // Default to workspace directory
    const workspaceDir = path.join(process.cwd(), 'workspaces', workspaceId);
    
    // Ensure workspace directory exists
    const fs = require('fs');
    if (!fs.existsSync(workspaceDir)) {
      fs.mkdirSync(workspaceDir, { recursive: true });
    }
    
    return workspaceDir;
  }

  /**
   * Set up process event handlers
   * @param {Object} terminal - Terminal instance
   */
  setupProcessHandlers(terminal) {
    const { process: childProcess, id: terminalId, userId } = terminal;

    // Handle process exit
    childProcess.on('exit', (code, signal) => {
      logger.info('Terminal process exited', {
        terminalId,
        userId,
        code,
        signal
      });
      
      terminal.isActive = false;
      terminal.exitCode = code;
      terminal.exitSignal = signal;
      terminal.exitedAt = new Date();
    });

    // Handle process errors
    childProcess.on('error', (error) => {
      logger.error('Terminal process error', {
        terminalId,
        userId,
        error: error.message
      });
      
      terminal.isActive = false;
      terminal.error = error.message;
    });

    // Handle process close
    childProcess.on('close', (code, signal) => {
      logger.info('Terminal process closed', {
        terminalId,
        userId,
        code,
        signal
      });
      
      // Clean up terminal after a delay
      setTimeout(() => {
        this.destroyTerminal(terminalId);
      }, 5000); // 5 second delay to allow final output
    });
  }

  /**
   * Write input to terminal
   * @param {string} terminalId - Terminal ID
   * @param {string} input - Input data
   */
  writeInput(terminalId, input) {
    const terminal = this.terminals.get(terminalId);
    
    if (!terminal) {
      throw new Error('Terminal not found');
    }

    if (!terminal.isActive) {
      throw new Error('Terminal is not active');
    }

    try {
      terminal.process.stdin.write(input);
      terminal.lastActivity = new Date();
      
      // Track command history for commands ending with newline
      if (input.includes('\n') || input.includes('\r')) {
        this.addToCommandHistory(terminalId, input.trim());
      }
      
      logger.debug('Input written to terminal', {
        terminalId,
        inputLength: input.length
      });
    } catch (error) {
      logger.error('Failed to write input to terminal', {
        terminalId,
        error: error.message
      });
      throw new Error(`Failed to write input: ${error.message}`);
    }
  }

  /**
   * Resize terminal
   * @param {string} terminalId - Terminal ID
   * @param {number} cols - Number of columns
   * @param {number} rows - Number of rows
   */
  resizeTerminal(terminalId, cols, rows) {
    const terminal = this.terminals.get(terminalId);
    
    if (!terminal) {
      throw new Error('Terminal not found');
    }

    terminal.cols = cols;
    terminal.rows = rows;
    terminal.lastActivity = new Date();

    // Update environment variables for the process
    // Note: This won't affect the running process, but will be used for new commands
    if (terminal.process && terminal.process.env) {
      terminal.process.env.COLUMNS = cols.toString();
      terminal.process.env.LINES = rows.toString();
    }

    logger.debug('Terminal resized', {
      terminalId,
      cols,
      rows
    });
  }

  /**
   * Get terminal output stream
   * @param {string} terminalId - Terminal ID
   * @returns {Object} Output streams
   */
  getOutputStream(terminalId) {
    const terminal = this.terminals.get(terminalId);
    
    if (!terminal) {
      throw new Error('Terminal not found');
    }

    return {
      stdout: terminal.process.stdout,
      stderr: terminal.process.stderr
    };
  }

  /**
   * Destroy terminal session
   * @param {string} terminalId - Terminal ID
   */
  destroyTerminal(terminalId) {
    const terminal = this.terminals.get(terminalId);
    
    if (!terminal) {
      return false;
    }

    logger.info('Destroying terminal session', {
      terminalId,
      userId: terminal.userId
    });

    try {
      // Kill the process if it's still running
      if (terminal.process && !terminal.process.killed) {
        terminal.process.kill('SIGTERM');
        
        // Force kill after 5 seconds if still running
        setTimeout(() => {
          if (!terminal.process.killed) {
            terminal.process.kill('SIGKILL');
          }
        }, 5000);
      }

      // Remove from user terminals
      if (this.userTerminals.has(terminal.userId)) {
        this.userTerminals.get(terminal.userId).delete(terminalId);
        if (this.userTerminals.get(terminal.userId).size === 0) {
          this.userTerminals.delete(terminal.userId);
        }
      }

      // Remove terminal
      this.terminals.delete(terminalId);

      // Clean up command history
      this.commandHistory.delete(terminalId);

      return true;
    } catch (error) {
      logger.error('Error destroying terminal', {
        terminalId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get terminal info
   * @param {string} terminalId - Terminal ID
   * @returns {Object} Terminal info
   */
  getTerminalInfo(terminalId) {
    const terminal = this.terminals.get(terminalId);
    
    if (!terminal) {
      return null;
    }

    return {
      id: terminal.id,
      userId: terminal.userId,
      workspaceId: terminal.workspaceId,
      shell: terminal.shell,
      cwd: terminal.cwd,
      cols: terminal.cols,
      rows: terminal.rows,
      isActive: terminal.isActive,
      createdAt: terminal.createdAt,
      lastActivity: terminal.lastActivity,
      pid: terminal.process ? terminal.process.pid : null,
      exitCode: terminal.exitCode,
      exitSignal: terminal.exitSignal,
      exitedAt: terminal.exitedAt,
      error: terminal.error
    };
  }

  /**
   * Get user terminals
   * @param {string} userId - User ID
   * @returns {Array} Array of terminal info
   */
  getUserTerminals(userId) {
    const terminalIds = this.userTerminals.get(userId) || new Set();
    return Array.from(terminalIds).map(id => this.getTerminalInfo(id)).filter(Boolean);
  }

  /**
   * Get all terminals
   * @returns {Array} Array of terminal info
   */
  getAllTerminals() {
    return Array.from(this.terminals.keys()).map(id => this.getTerminalInfo(id));
  }

  /**
   * Clean up inactive terminals
   */
  cleanupInactiveTerminals() {
    const now = new Date();
    const maxInactiveTime = 30 * 60 * 1000; // 30 minutes

    for (const [terminalId, terminal] of this.terminals) {
      if (!terminal.isActive || (now - terminal.lastActivity) > maxInactiveTime) {
        logger.info('Cleaning up inactive terminal', {
          terminalId,
          userId: terminal.userId,
          lastActivity: terminal.lastActivity
        });
        this.destroyTerminal(terminalId);
      }
    }
  }

  /**
   * Destroy all user terminals
   * @param {string} userId - User ID
   */
  destroyUserTerminals(userId) {
    const terminalIds = this.userTerminals.get(userId) || new Set();
    
    for (const terminalId of terminalIds) {
      this.destroyTerminal(terminalId);
    }
  }

  /**
   * Add command to history
   * @param {string} terminalId - Terminal ID
   * @param {string} command - Command to add
   */
  addToCommandHistory(terminalId, command) {
    if (!command || command.trim().length === 0) {
      return;
    }

    if (!this.commandHistory.has(terminalId)) {
      this.commandHistory.set(terminalId, []);
    }

    const history = this.commandHistory.get(terminalId);
    const cleanCommand = command.replace(/[\r\n]/g, '').trim();
    
    // Don't add duplicate consecutive commands
    if (history.length === 0 || history[history.length - 1] !== cleanCommand) {
      history.push(cleanCommand);
      
      // Limit history size to 1000 commands
      if (history.length > 1000) {
        history.shift();
      }
    }
  }

  /**
   * Get command history for terminal
   * @param {string} terminalId - Terminal ID
   * @returns {Array} Command history
   */
  getCommandHistory(terminalId) {
    return this.commandHistory.get(terminalId) || [];
  }

  /**
   * Clear command history for terminal
   * @param {string} terminalId - Terminal ID
   */
  clearCommandHistory(terminalId) {
    this.commandHistory.delete(terminalId);
  }

  /**
   * Get autocomplete suggestions for partial command
   * @param {string} terminalId - Terminal ID
   * @param {string} partial - Partial command
   * @returns {Array} Autocomplete suggestions
   */
  getAutocompleteSuggestions(terminalId, partial) {
    const history = this.getCommandHistory(terminalId);
    const suggestions = new Set();

    // Add matching commands from history
    for (const command of history) {
      if (command.startsWith(partial) && command !== partial) {
        suggestions.add(command);
      }
    }

    // Add common commands based on platform
    const commonCommands = this.getCommonCommands();
    for (const command of commonCommands) {
      if (command.startsWith(partial) && command !== partial) {
        suggestions.add(command);
      }
    }

    return Array.from(suggestions).slice(0, 10); // Limit to 10 suggestions
  }

  /**
   * Get common commands for the platform
   * @returns {Array} Common commands
   */
  getCommonCommands() {
    const platform = os.platform();
    
    if (platform === 'win32') {
      return [
        'dir', 'cd', 'mkdir', 'rmdir', 'del', 'copy', 'move', 'type', 'echo',
        'cls', 'exit', 'help', 'tree', 'attrib', 'find', 'findstr', 'tasklist',
        'taskkill', 'ping', 'ipconfig', 'systeminfo', 'whoami', 'date', 'time'
      ];
    } else {
      return [
        'ls', 'cd', 'mkdir', 'rmdir', 'rm', 'cp', 'mv', 'cat', 'echo',
        'clear', 'exit', 'help', 'tree', 'chmod', 'chown', 'grep', 'find',
        'ps', 'kill', 'ping', 'ifconfig', 'uname', 'whoami', 'date', 'pwd',
        'which', 'man', 'history', 'alias', 'export', 'source', 'sudo'
      ];
    }
  }
}

// Create singleton instance
const terminalService = new TerminalService();

// Set up cleanup interval
setInterval(() => {
  terminalService.cleanupInactiveTerminals();
}, 5 * 60 * 1000); // Run cleanup every 5 minutes

module.exports = terminalService;