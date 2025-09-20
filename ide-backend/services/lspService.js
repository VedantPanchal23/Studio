const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs').promises;

/**
 * Language Server Protocol service for managing LSP servers
 */
class LSPService extends EventEmitter {
  constructor() {
    super();
    this.servers = new Map(); // serverId -> LSPServer instance
    this.serverConfigs = new Map(); // language -> server config
    this.activeConnections = new Map(); // connectionId -> { serverId, socket }
    this.documentVersions = new Map(); // uri -> version number
    
    this.initializeServerConfigs();
  }

  /**
   * Initialize LSP server configurations for different languages
   */
  initializeServerConfigs() {
    // TypeScript/JavaScript Language Server
    this.serverConfigs.set('typescript', {
      name: 'typescript-language-server',
      command: 'typescript-language-server',
      args: ['--stdio'],
      languages: ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'],
      initializationOptions: {},
      settings: {
        typescript: {
          preferences: {
            includePackageJsonAutoImports: 'auto'
          }
        },
        javascript: {
          preferences: {
            includePackageJsonAutoImports: 'auto'
          }
        }
      }
    });

    // Python Language Server (Pylsp)
    this.serverConfigs.set('python', {
      name: 'python-lsp-server',
      command: 'pylsp',
      args: [],
      languages: ['python'],
      initializationOptions: {},
      settings: {
        pylsp: {
          plugins: {
            pycodestyle: { enabled: true },
            pyflakes: { enabled: true },
            pylint: { enabled: false },
            autopep8: { enabled: true },
            yapf: { enabled: false }
          }
        }
      }
    });

    // Java Language Server
    this.serverConfigs.set('java', {
      name: 'jdtls',
      command: 'jdtls',
      args: [],
      languages: ['java'],
      initializationOptions: {},
      settings: {
        java: {
          configuration: {
            runtimes: []
          }
        }
      }
    });

    // Go Language Server
    this.serverConfigs.set('go', {
      name: 'gopls',
      command: 'gopls',
      args: [],
      languages: ['go'],
      initializationOptions: {},
      settings: {
        gopls: {
          analyses: {
            unusedparams: true
          },
          staticcheck: true
        }
      }
    });

    // Rust Language Server
    this.serverConfigs.set('rust', {
      name: 'rust-analyzer',
      command: 'rust-analyzer',
      args: [],
      languages: ['rust'],
      initializationOptions: {},
      settings: {
        'rust-analyzer': {
          checkOnSave: {
            command: 'clippy'
          }
        }
      }
    });

    // C/C++ Language Server
    this.serverConfigs.set('cpp', {
      name: 'clangd',
      command: 'clangd',
      args: ['--background-index'],
      languages: ['c', 'cpp', 'objective-c', 'objective-cpp'],
      initializationOptions: {},
      settings: {}
    });

    logger.info('LSP server configurations initialized', {
      supportedLanguages: Array.from(this.serverConfigs.keys())
    });
  }

  /**
   * Get server configuration for a language
   * @param {string} language - Programming language
   * @returns {Object|null} Server configuration or null if not supported
   */
  getServerConfig(language) {
    // Direct match
    if (this.serverConfigs.has(language)) {
      return this.serverConfigs.get(language);
    }

    // Find by supported languages
    for (const [key, config] of this.serverConfigs.entries()) {
      if (config.languages.includes(language)) {
        return config;
      }
    }

    return null;
  }

  /**
   * Start an LSP server for a specific language
   * @param {string} language - Programming language
   * @param {string} workspaceRoot - Workspace root directory
   * @returns {Promise<string>} Server ID
   */
  async startServer(language, workspaceRoot) {
    const config = this.getServerConfig(language);
    if (!config) {
      throw new Error(`No LSP server configuration found for language: ${language}`);
    }

    const serverId = `${language}-${Date.now()}`;
    
    try {
      // Check if server executable exists
      await this.checkServerExecutable(config.command);

      const server = new LSPServer(serverId, config, workspaceRoot);
      await server.start();

      this.servers.set(serverId, server);

      // Set up server event handlers
      server.on('message', (message) => {
        this.handleServerMessage(serverId, message);
      });

      server.on('error', (error) => {
        this.handleServerError(serverId, error);
      });

      server.on('exit', (code) => {
        this.handleServerExit(serverId, code);
      });

      logger.info('LSP server started successfully', {
        serverId,
        language,
        serverName: config.name,
        workspaceRoot
      });

      return serverId;
    } catch (error) {
      logger.error('Failed to start LSP server', {
        language,
        serverName: config.name,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Stop an LSP server
   * @param {string} serverId - Server ID
   * @returns {Promise<boolean>} True if server was stopped
   */
  async stopServer(serverId) {
    const server = this.servers.get(serverId);
    if (!server) {
      return false;
    }

    try {
      await server.stop();
      this.servers.delete(serverId);

      // Clean up connections
      for (const [connectionId, connection] of this.activeConnections.entries()) {
        if (connection.serverId === serverId) {
          this.activeConnections.delete(connectionId);
        }
      }

      logger.info('LSP server stopped', { serverId });
      return true;
    } catch (error) {
      logger.error('Error stopping LSP server', {
        serverId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Create a connection between a WebSocket and an LSP server
   * @param {string} serverId - Server ID
   * @param {Object} socket - WebSocket connection
   * @param {string} workspaceRoot - Workspace root directory
   * @returns {string} Connection ID
   */
  createConnection(serverId, socket, workspaceRoot) {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`LSP server not found: ${serverId}`);
    }

    const connectionId = `${serverId}-${socket.id}`;
    
    this.activeConnections.set(connectionId, {
      serverId,
      socket,
      workspaceRoot,
      createdAt: new Date()
    });

    // Set up WebSocket event handlers for LSP communication
    this.setupWebSocketHandlers(socket, serverId, connectionId);

    logger.info('LSP connection created', {
      connectionId,
      serverId,
      socketId: socket.id,
      workspaceRoot
    });

    return connectionId;
  }

  /**
   * Remove a connection
   * @param {string} connectionId - Connection ID
   * @returns {boolean} True if connection was removed
   */
  removeConnection(connectionId) {
    const connection = this.activeConnections.get(connectionId);
    if (!connection) {
      return false;
    }

    this.activeConnections.delete(connectionId);
    
    logger.info('LSP connection removed', {
      connectionId,
      serverId: connection.serverId
    });

    return true;
  }

  /**
   * Set up WebSocket event handlers for LSP communication
   * @param {Object} socket - WebSocket connection
   * @param {string} serverId - Server ID
   * @param {string} connectionId - Connection ID
   */
  setupWebSocketHandlers(socket, serverId, connectionId) {
    const server = this.servers.get(serverId);
    if (!server) return;

    // Handle LSP requests from client
    socket.on('lsp:request', async (data) => {
      try {
        const { method, params, id } = data;
        const response = await server.sendRequest(method, params, id);
        
        socket.emit('lsp:response', {
          id,
          result: response
        });
      } catch (error) {
        socket.emit('lsp:error', {
          id: data.id,
          error: {
            code: -32603,
            message: error.message
          }
        });
      }
    });

    // Handle LSP notifications from client
    socket.on('lsp:notification', (data) => {
      try {
        const { method, params } = data;
        server.sendNotification(method, params);
      } catch (error) {
        logger.error('Error sending LSP notification', {
          connectionId,
          method: data.method,
          error: error.message
        });
      }
    });

    // Handle document synchronization
    socket.on('lsp:textDocument/didOpen', (data) => {
      this.handleDocumentOpen(serverId, data);
    });

    socket.on('lsp:textDocument/didChange', (data) => {
      this.handleDocumentChange(serverId, data);
    });

    socket.on('lsp:textDocument/didClose', (data) => {
      this.handleDocumentClose(serverId, data);
    });

    // Handle cleanup on disconnect
    socket.on('disconnect', () => {
      this.removeConnection(connectionId);
    });
  }

  /**
   * Handle document open notification
   * @param {string} serverId - Server ID
   * @param {Object} data - Document data
   */
  handleDocumentOpen(serverId, data) {
    const server = this.servers.get(serverId);
    if (!server) return;

    const { uri, languageId, version, text } = data;
    
    // Track document version
    this.documentVersions.set(uri, version);

    server.sendNotification('textDocument/didOpen', {
      textDocument: {
        uri,
        languageId,
        version,
        text
      }
    });

    logger.debug('Document opened in LSP server', {
      serverId,
      uri,
      languageId,
      version
    });
  }

  /**
   * Handle document change notification
   * @param {string} serverId - Server ID
   * @param {Object} data - Document change data
   */
  handleDocumentChange(serverId, data) {
    const server = this.servers.get(serverId);
    if (!server) return;

    const { uri, version, contentChanges } = data;
    
    // Update document version
    this.documentVersions.set(uri, version);

    server.sendNotification('textDocument/didChange', {
      textDocument: {
        uri,
        version
      },
      contentChanges
    });

    logger.debug('Document changed in LSP server', {
      serverId,
      uri,
      version,
      changesCount: contentChanges.length
    });
  }

  /**
   * Handle document close notification
   * @param {string} serverId - Server ID
   * @param {Object} data - Document data
   */
  handleDocumentClose(serverId, data) {
    const server = this.servers.get(serverId);
    if (!server) return;

    const { uri } = data;
    
    // Remove document version tracking
    this.documentVersions.delete(uri);

    server.sendNotification('textDocument/didClose', {
      textDocument: { uri }
    });

    logger.debug('Document closed in LSP server', {
      serverId,
      uri
    });
  }

  /**
   * Handle messages from LSP server
   * @param {string} serverId - Server ID
   * @param {Object} message - LSP message
   */
  handleServerMessage(serverId, message) {
    // Broadcast server messages to all connections for this server
    for (const [connectionId, connection] of this.activeConnections.entries()) {
      if (connection.serverId === serverId) {
        connection.socket.emit('lsp:message', message);
      }
    }
  }

  /**
   * Handle LSP server errors
   * @param {string} serverId - Server ID
   * @param {Error} error - Error object
   */
  handleServerError(serverId, error) {
    logger.error('LSP server error', {
      serverId,
      error: error.message
    });

    // Notify all connections about the error
    for (const [connectionId, connection] of this.activeConnections.entries()) {
      if (connection.serverId === serverId) {
        connection.socket.emit('lsp:error', {
          serverId,
          error: error.message
        });
      }
    }
  }

  /**
   * Handle LSP server exit
   * @param {string} serverId - Server ID
   * @param {number} code - Exit code
   */
  handleServerExit(serverId, code) {
    logger.warn('LSP server exited', {
      serverId,
      exitCode: code
    });

    // Clean up server
    this.servers.delete(serverId);

    // Notify connections and clean up
    for (const [connectionId, connection] of this.activeConnections.entries()) {
      if (connection.serverId === serverId) {
        connection.socket.emit('lsp:server:exit', {
          serverId,
          exitCode: code
        });
        this.activeConnections.delete(connectionId);
      }
    }
  }

  /**
   * Check if server executable exists
   * @param {string} command - Command to check
   * @returns {Promise<void>}
   */
  async checkServerExecutable(command) {
    return new Promise((resolve, reject) => {
      const checkProcess = spawn('which', [command], { shell: true });
      
      checkProcess.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`LSP server executable not found: ${command}`));
        }
      });

      checkProcess.on('error', () => {
        reject(new Error(`Failed to check LSP server executable: ${command}`));
      });
    });
  }

  /**
   * Get list of supported languages
   * @returns {Array<string>} Array of supported language identifiers
   */
  getSupportedLanguages() {
    const languages = new Set();
    
    for (const config of this.serverConfigs.values()) {
      config.languages.forEach(lang => languages.add(lang));
    }
    
    return Array.from(languages);
  }

  /**
   * Get active servers information
   * @returns {Array<Object>} Array of active server information
   */
  getActiveServers() {
    const servers = [];
    
    for (const [serverId, server] of this.servers.entries()) {
      servers.push({
        serverId,
        language: server.language,
        name: server.config.name,
        status: server.status,
        startedAt: server.startedAt,
        connections: Array.from(this.activeConnections.entries())
          .filter(([_, conn]) => conn.serverId === serverId)
          .length
      });
    }
    
    return servers;
  }

  /**
   * Shutdown all LSP servers
   * @returns {Promise<void>}
   */
  async shutdown() {
    logger.info('Shutting down all LSP servers');
    
    const shutdownPromises = [];
    
    for (const serverId of this.servers.keys()) {
      shutdownPromises.push(this.stopServer(serverId));
    }
    
    await Promise.all(shutdownPromises);
    
    this.servers.clear();
    this.activeConnections.clear();
    this.documentVersions.clear();
    
    logger.info('All LSP servers shut down');
  }
}

/**
 * Individual LSP Server instance
 */
class LSPServer extends EventEmitter {
  constructor(serverId, config, workspaceRoot) {
    super();
    this.serverId = serverId;
    this.config = config;
    this.workspaceRoot = workspaceRoot;
    this.process = null;
    this.status = 'stopped';
    this.startedAt = null;
    this.messageId = 0;
    this.pendingRequests = new Map();
    this.initialized = false;
  }

  /**
   * Start the LSP server process
   * @returns {Promise<void>}
   */
  async start() {
    if (this.status === 'running') {
      throw new Error('Server is already running');
    }

    this.status = 'starting';
    
    try {
      // Spawn the LSP server process
      this.process = spawn(this.config.command, this.config.args, {
        cwd: this.workspaceRoot,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.startedAt = new Date();

      // Set up process event handlers
      this.setupProcessHandlers();

      // Initialize the server
      await this.initialize();

      this.status = 'running';
      
      logger.info('LSP server process started', {
        serverId: this.serverId,
        pid: this.process.pid,
        command: this.config.command
      });

    } catch (error) {
      this.status = 'error';
      throw error;
    }
  }

  /**
   * Stop the LSP server process
   * @returns {Promise<void>}
   */
  async stop() {
    if (this.status === 'stopped') {
      return;
    }

    this.status = 'stopping';

    try {
      // Send shutdown request
      if (this.initialized) {
        await this.sendRequest('shutdown', {});
        this.sendNotification('exit', {});
      }

      // Kill process if still running
      if (this.process && !this.process.killed) {
        this.process.kill('SIGTERM');
        
        // Force kill after timeout
        setTimeout(() => {
          if (this.process && !this.process.killed) {
            this.process.kill('SIGKILL');
          }
        }, 5000);
      }

      this.status = 'stopped';
      this.initialized = false;
      
    } catch (error) {
      logger.error('Error stopping LSP server', {
        serverId: this.serverId,
        error: error.message
      });
    }
  }

  /**
   * Set up process event handlers
   */
  setupProcessHandlers() {
    let buffer = '';

    // Handle stdout (LSP messages)
    this.process.stdout.on('data', (data) => {
      buffer += data.toString();
      
      // Process complete messages
      let lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.trim()) {
          this.processMessage(line.trim());
        }
      }
    });

    // Handle stderr (error logs)
    this.process.stderr.on('data', (data) => {
      logger.warn('LSP server stderr', {
        serverId: this.serverId,
        data: data.toString()
      });
    });

    // Handle process exit
    this.process.on('exit', (code, signal) => {
      this.status = 'stopped';
      this.initialized = false;
      
      logger.info('LSP server process exited', {
        serverId: this.serverId,
        code,
        signal
      });
      
      this.emit('exit', code);
    });

    // Handle process errors
    this.process.on('error', (error) => {
      this.status = 'error';
      
      logger.error('LSP server process error', {
        serverId: this.serverId,
        error: error.message
      });
      
      this.emit('error', error);
    });
  }

  /**
   * Process incoming LSP message
   * @param {string} line - Message line
   */
  processMessage(line) {
    try {
      // LSP messages are JSON-RPC with Content-Length header
      if (line.startsWith('Content-Length:')) {
        return; // Skip headers
      }
      
      if (line.trim() === '') {
        return; // Skip empty lines
      }

      const message = JSON.parse(line);
      
      // Handle responses to our requests
      if (message.id && this.pendingRequests.has(message.id)) {
        const { resolve, reject } = this.pendingRequests.get(message.id);
        this.pendingRequests.delete(message.id);
        
        if (message.error) {
          reject(new Error(message.error.message));
        } else {
          resolve(message.result);
        }
        return;
      }
      
      // Emit message for external handling
      this.emit('message', message);
      
    } catch (error) {
      logger.error('Error processing LSP message', {
        serverId: this.serverId,
        line,
        error: error.message
      });
    }
  }

  /**
   * Initialize the LSP server
   * @returns {Promise<void>}
   */
  async initialize() {
    const initParams = {
      processId: process.pid,
      rootUri: `file://${this.workspaceRoot}`,
      capabilities: {
        textDocument: {
          synchronization: {
            dynamicRegistration: false,
            willSave: false,
            willSaveWaitUntil: false,
            didSave: false
          },
          completion: {
            dynamicRegistration: false,
            completionItem: {
              snippetSupport: false
            }
          },
          hover: {
            dynamicRegistration: false
          },
          signatureHelp: {
            dynamicRegistration: false
          },
          definition: {
            dynamicRegistration: false
          },
          references: {
            dynamicRegistration: false
          },
          documentHighlight: {
            dynamicRegistration: false
          },
          documentSymbol: {
            dynamicRegistration: false
          },
          codeAction: {
            dynamicRegistration: false
          },
          codeLens: {
            dynamicRegistration: false
          },
          formatting: {
            dynamicRegistration: false
          },
          rangeFormatting: {
            dynamicRegistration: false
          },
          onTypeFormatting: {
            dynamicRegistration: false
          },
          rename: {
            dynamicRegistration: false
          },
          publishDiagnostics: {
            relatedInformation: false
          }
        },
        workspace: {
          applyEdit: false,
          workspaceEdit: {
            documentChanges: false
          },
          didChangeConfiguration: {
            dynamicRegistration: false
          },
          didChangeWatchedFiles: {
            dynamicRegistration: false
          },
          symbol: {
            dynamicRegistration: false
          },
          executeCommand: {
            dynamicRegistration: false
          }
        }
      },
      initializationOptions: this.config.initializationOptions
    };

    const result = await this.sendRequest('initialize', initParams);
    
    // Send initialized notification
    this.sendNotification('initialized', {});
    
    this.initialized = true;
    
    logger.info('LSP server initialized', {
      serverId: this.serverId,
      capabilities: result.capabilities
    });
  }

  /**
   * Send a request to the LSP server
   * @param {string} method - LSP method name
   * @param {Object} params - Request parameters
   * @param {number} id - Request ID (optional)
   * @returns {Promise<any>} Response result
   */
  sendRequest(method, params, id = null) {
    return new Promise((resolve, reject) => {
      if (!this.process || this.process.killed) {
        reject(new Error('LSP server is not running'));
        return;
      }

      const requestId = id || ++this.messageId;
      
      const message = {
        jsonrpc: '2.0',
        id: requestId,
        method,
        params
      };

      // Store pending request
      this.pendingRequests.set(requestId, { resolve, reject });

      // Send message
      const messageStr = JSON.stringify(message);
      const content = `Content-Length: ${Buffer.byteLength(messageStr)}\r\n\r\n${messageStr}`;
      
      this.process.stdin.write(content);
      
      // Set timeout for request
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error(`LSP request timeout: ${method}`));
        }
      }, 30000);
    });
  }

  /**
   * Send a notification to the LSP server
   * @param {string} method - LSP method name
   * @param {Object} params - Notification parameters
   */
  sendNotification(method, params) {
    if (!this.process || this.process.killed) {
      throw new Error('LSP server is not running');
    }

    const message = {
      jsonrpc: '2.0',
      method,
      params
    };

    const messageStr = JSON.stringify(message);
    const content = `Content-Length: ${Buffer.byteLength(messageStr)}\r\n\r\n${messageStr}`;
    
    this.process.stdin.write(content);
  }
}

// Create singleton instance
const lspService = new LSPService();

module.exports = lspService;