const { Server } = require('socket.io');
const JWTUtils = require('../utils/jwt');
const User = require('../models/User');
const logger = require('../utils/logger');
const config = require('../config');
const terminalService = require('./terminal');
const collaborationService = require('./collaborationService');

/**
 * WebSocket service for handling Socket.IO connections and events
 */
class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> Set of socket IDs
    this.userSessions = new Map(); // socketId -> user session data
  }

  /**
   * Initialize Socket.IO server
   * @param {Object} server - HTTP server instance
   */
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: config.cors.origin,
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Initialize collaboration service
    collaborationService.initialize(this.io);

    // Authentication middleware
    this.io.use(this.authenticateSocket.bind(this));

    // Connection handling
    this.io.on('connection', this.handleConnection.bind(this));

    logger.info('Socket.IO server initialized');
  }

  /**
   * Socket authentication middleware
   * @param {Object} socket - Socket.IO socket instance
   * @param {Function} next - Next middleware function
   */
  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        logger.warn('Socket connection attempted without token', {
          socketId: socket.id,
          ip: socket.handshake.address
        });
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = await JWTUtils.verifyToken(token);
      
      // Find user
      const user = await User.findById(decoded.id).select('-password -driveToken -driveRefreshToken');
      
      if (!user) {
        logger.warn('Socket connection attempted with invalid user', {
          socketId: socket.id,
          userId: decoded.id
        });
        return next(new Error('User not found'));
      }

      if (!user.isActive) {
        logger.warn('Socket connection attempted by inactive user', {
          socketId: socket.id,
          userId: user._id
        });
        return next(new Error('Account is inactive'));
      }

      // Check if password was changed after token was issued
      if (user.changedPasswordAfter(decoded.iat)) {
        logger.warn('Socket connection attempted with outdated token', {
          socketId: socket.id,
          userId: user._id
        });
        return next(new Error('Token is outdated, please login again'));
      }

      // Attach user to socket
      socket.user = user;
      socket.userId = user._id.toString();
      
      logger.info('Socket authenticated successfully', {
        socketId: socket.id,
        userId: user._id,
        email: user.email
      });

      next();
    } catch (error) {
      logger.error('Socket authentication error:', {
        error: error.message,
        socketId: socket.id,
        ip: socket.handshake.address
      });
      
      if (error.message === 'Token has expired') {
        return next(new Error('Token has expired'));
      }
      
      if (error.message === 'Invalid token') {
        return next(new Error('Invalid token'));
      }
      
      return next(new Error('Authentication failed'));
    }
  }

  /**
   * Handle new socket connection
   * @param {Object} socket - Socket.IO socket instance
   */
  handleConnection(socket) {
    const userId = socket.userId;
    const user = socket.user;

    logger.info('User connected via WebSocket', {
      socketId: socket.id,
      userId: userId,
      email: user.email
    });

    // Track connected user
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId).add(socket.id);

    // Store user session data
    this.userSessions.set(socket.id, {
      userId: userId,
      user: user,
      connectedAt: new Date(),
      lastActivity: new Date(),
      workspaceId: null,
      terminalSessions: new Map()
    });

    // Join user to their personal room
    socket.join(`user:${userId}`);

    // Set up event handlers
    this.setupEventHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });

    // Send connection confirmation
    socket.emit('connection:confirmed', {
      socketId: socket.id,
      userId: userId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Set up event handlers for a socket
   * @param {Object} socket - Socket.IO socket instance
   */
  setupEventHandlers(socket) {
    const session = this.userSessions.get(socket.id);

    // Update last activity on any event
    socket.use((event, next) => {
      if (session) {
        session.lastActivity = new Date();
      }
      next();
    });

    // Workspace events
    socket.on('workspace:join', (data) => {
      this.handleWorkspaceJoin(socket, data);
    });

    socket.on('workspace:leave', (data) => {
      this.handleWorkspaceLeave(socket, data);
    });

    // Terminal events (will be implemented in next subtask)
    socket.on('terminal:create', (data) => {
      this.handleTerminalCreate(socket, data);
    });

    socket.on('terminal:input', (data) => {
      this.handleTerminalInput(socket, data);
    });

    socket.on('terminal:resize', (data) => {
      this.handleTerminalResize(socket, data);
    });

    socket.on('terminal:destroy', (data) => {
      this.handleTerminalDestroy(socket, data);
    });

    socket.on('terminal:autocomplete', (data) => {
      this.handleTerminalAutocomplete(socket, data);
    });

    socket.on('terminal:history', (data) => {
      this.handleTerminalHistory(socket, data);
    });

    // Collaboration events
    socket.on('collaboration:document-join', (data) => {
      collaborationService.handleDocumentJoin(socket, data);
    });

    socket.on('collaboration:document-leave', (data) => {
      collaborationService.handleDocumentLeave(socket, data);
    });

    socket.on('collaboration:document-update', (data) => {
      collaborationService.handleDocumentUpdate(socket, data);
    });

    socket.on('collaboration:awareness-update', (data) => {
      collaborationService.handleAwarenessUpdate(socket, data);
    });

    // File events (placeholder for future implementation)
    socket.on('file:watch', (data) => {
      this.handleFileWatch(socket, data);
    });

    socket.on('file:unwatch', (data) => {
      this.handleFileUnwatch(socket, data);
    });

    // Execution events (placeholder for future implementation)
    socket.on('execution:start', (data) => {
      this.handleExecutionStart(socket, data);
    });

    socket.on('execution:stop', (data) => {
      this.handleExecutionStop(socket, data);
    });

    // LSP events
    socket.on('lsp:start', (data) => {
      this.handleLSPStart(socket, data);
    });

    socket.on('lsp:stop', (data) => {
      this.handleLSPStop(socket, data);
    });

    socket.on('lsp:connect', (data) => {
      this.handleLSPConnect(socket, data);
    });

    socket.on('lsp:disconnect', (data) => {
      this.handleLSPDisconnect(socket, data);
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error('Socket error:', {
        socketId: socket.id,
        userId: session?.userId,
        error: error.message
      });
    });
  }

  /**
   * Handle workspace join
   * @param {Object} socket - Socket.IO socket instance
   * @param {Object} data - Event data
   */
  handleWorkspaceJoin(socket, data) {
    const session = this.userSessions.get(socket.id);
    if (!session) return;

    const { workspaceId } = data;
    
    if (!workspaceId) {
      socket.emit('error', { message: 'Workspace ID is required' });
      return;
    }

    // Leave previous workspace if any
    if (session.workspaceId) {
      socket.leave(`workspace:${session.workspaceId}`);
    }

    // Join new workspace
    session.workspaceId = workspaceId;
    socket.join(`workspace:${workspaceId}`);

    logger.info('User joined workspace', {
      socketId: socket.id,
      userId: session.userId,
      workspaceId: workspaceId
    });

    // Notify other users in the workspace
    socket.to(`workspace:${workspaceId}`).emit('user:joined', {
      userId: session.userId,
      user: {
        id: session.user._id,
        name: session.user.name,
        email: session.user.email,
        avatar: session.user.avatar
      },
      timestamp: new Date().toISOString()
    });

    socket.emit('workspace:joined', {
      workspaceId: workspaceId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle workspace leave
   * @param {Object} socket - Socket.IO socket instance
   * @param {Object} data - Event data
   */
  handleWorkspaceLeave(socket, data) {
    const session = this.userSessions.get(socket.id);
    if (!session || !session.workspaceId) return;

    const workspaceId = session.workspaceId;
    
    // Leave workspace room
    socket.leave(`workspace:${workspaceId}`);

    logger.info('User left workspace', {
      socketId: socket.id,
      userId: session.userId,
      workspaceId: workspaceId
    });

    // Notify other users in the workspace
    socket.to(`workspace:${workspaceId}`).emit('user:left', {
      userId: session.userId,
      timestamp: new Date().toISOString()
    });

    session.workspaceId = null;

    socket.emit('workspace:left', {
      workspaceId: workspaceId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle terminal creation
   * @param {Object} socket - Socket.IO socket instance
   * @param {Object} data - Event data
   */
  handleTerminalCreate(socket, data) {
    const session = this.userSessions.get(socket.id);
    if (!session) {
      socket.emit('terminal:error', { message: 'Session not found' });
      return;
    }

    const { workspaceId, shell, cols, rows, cwd } = data;
    
    if (!workspaceId) {
      socket.emit('terminal:error', { message: 'Workspace ID is required' });
      return;
    }

    try {
      // Create terminal session
      const terminalInfo = terminalService.createTerminal(session.userId, workspaceId, {
        shell,
        cols: cols || 80,
        rows: rows || 24,
        cwd
      });

      // Store terminal in session
      session.terminalSessions.set(terminalInfo.terminalId, {
        terminalId: terminalInfo.terminalId,
        workspaceId: workspaceId,
        createdAt: new Date()
      });

      // Set up output streaming
      this.setupTerminalStreaming(socket, terminalInfo.terminalId);

      logger.info('Terminal created via WebSocket', {
        socketId: socket.id,
        userId: session.userId,
        terminalId: terminalInfo.terminalId,
        workspaceId: workspaceId
      });

      socket.emit('terminal:created', {
        terminalId: terminalInfo.terminalId,
        shell: terminalInfo.shell,
        cwd: terminalInfo.cwd,
        cols: terminalInfo.cols,
        rows: terminalInfo.rows,
        pid: terminalInfo.pid,
        createdAt: terminalInfo.createdAt
      });

    } catch (error) {
      logger.error('Failed to create terminal via WebSocket', {
        socketId: socket.id,
        userId: session.userId,
        workspaceId: workspaceId,
        error: error.message
      });

      socket.emit('terminal:error', {
        message: 'Failed to create terminal',
        error: error.message
      });
    }
  }

  /**
   * Handle terminal input
   * @param {Object} socket - Socket.IO socket instance
   * @param {Object} data - Event data
   */
  handleTerminalInput(socket, data) {
    const session = this.userSessions.get(socket.id);
    if (!session) {
      socket.emit('terminal:error', { message: 'Session not found' });
      return;
    }

    const { terminalId, input } = data;
    
    if (!terminalId) {
      socket.emit('terminal:error', { message: 'Terminal ID is required' });
      return;
    }

    if (!session.terminalSessions.has(terminalId)) {
      socket.emit('terminal:error', { message: 'Terminal not found in session' });
      return;
    }

    try {
      terminalService.writeInput(terminalId, input);
      
      logger.debug('Terminal input processed', {
        socketId: socket.id,
        userId: session.userId,
        terminalId: terminalId,
        inputLength: input.length
      });

    } catch (error) {
      logger.error('Failed to process terminal input', {
        socketId: socket.id,
        userId: session.userId,
        terminalId: terminalId,
        error: error.message
      });

      socket.emit('terminal:error', {
        terminalId: terminalId,
        message: 'Failed to process input',
        error: error.message
      });
    }
  }

  /**
   * Handle terminal resize
   * @param {Object} socket - Socket.IO socket instance
   * @param {Object} data - Event data
   */
  handleTerminalResize(socket, data) {
    const session = this.userSessions.get(socket.id);
    if (!session) {
      socket.emit('terminal:error', { message: 'Session not found' });
      return;
    }

    const { terminalId, cols, rows } = data;
    
    if (!terminalId) {
      socket.emit('terminal:error', { message: 'Terminal ID is required' });
      return;
    }

    if (!session.terminalSessions.has(terminalId)) {
      socket.emit('terminal:error', { message: 'Terminal not found in session' });
      return;
    }

    if (!cols || !rows || cols < 1 || rows < 1) {
      socket.emit('terminal:error', { message: 'Invalid terminal dimensions' });
      return;
    }

    try {
      terminalService.resizeTerminal(terminalId, cols, rows);
      
      logger.debug('Terminal resized', {
        socketId: socket.id,
        userId: session.userId,
        terminalId: terminalId,
        cols: cols,
        rows: rows
      });

      socket.emit('terminal:resized', {
        terminalId: terminalId,
        cols: cols,
        rows: rows
      });

    } catch (error) {
      logger.error('Failed to resize terminal', {
        socketId: socket.id,
        userId: session.userId,
        terminalId: terminalId,
        error: error.message
      });

      socket.emit('terminal:error', {
        terminalId: terminalId,
        message: 'Failed to resize terminal',
        error: error.message
      });
    }
  }

  /**
   * Handle terminal destroy
   * @param {Object} socket - Socket.IO socket instance
   * @param {Object} data - Event data
   */
  handleTerminalDestroy(socket, data) {
    const session = this.userSessions.get(socket.id);
    if (!session) {
      socket.emit('terminal:error', { message: 'Session not found' });
      return;
    }

    const { terminalId } = data;
    
    if (!terminalId) {
      socket.emit('terminal:error', { message: 'Terminal ID is required' });
      return;
    }

    if (!session.terminalSessions.has(terminalId)) {
      socket.emit('terminal:error', { message: 'Terminal not found in session' });
      return;
    }

    try {
      const destroyed = terminalService.destroyTerminal(terminalId);
      
      if (destroyed) {
        // Remove from session
        session.terminalSessions.delete(terminalId);

        logger.info('Terminal destroyed via WebSocket', {
          socketId: socket.id,
          userId: session.userId,
          terminalId: terminalId
        });

        socket.emit('terminal:destroyed', {
          terminalId: terminalId
        });
      } else {
        socket.emit('terminal:error', {
          terminalId: terminalId,
          message: 'Terminal not found or already destroyed'
        });
      }

    } catch (error) {
      logger.error('Failed to destroy terminal', {
        socketId: socket.id,
        userId: session.userId,
        terminalId: terminalId,
        error: error.message
      });

      socket.emit('terminal:error', {
        terminalId: terminalId,
        message: 'Failed to destroy terminal',
        error: error.message
      });
    }
  }

  /**
   * Handle collaboration join - now handled by collaborationService
   * @param {Object} socket - Socket.IO socket instance
   * @param {Object} data - Event data
   */
  handleCollaborationJoin(socket, data) {
    // Redirected to collaboration service
    collaborationService.handleDocumentJoin(socket, data);
  }

  /**
   * Handle collaboration leave - now handled by collaborationService
   * @param {Object} socket - Socket.IO socket instance
   * @param {Object} data - Event data
   */
  handleCollaborationLeave(socket, data) {
    // Redirected to collaboration service
    collaborationService.handleDocumentLeave(socket, data);
  }

  /**
   * Handle file watch (placeholder)
   * @param {Object} socket - Socket.IO socket instance
   * @param {Object} data - Event data
   */
  handleFileWatch(socket, data) {
    // Placeholder for future file watching implementation
    logger.debug('File watch received (placeholder)', {
      socketId: socket.id,
      data: data
    });
  }

  /**
   * Handle file unwatch (placeholder)
   * @param {Object} socket - Socket.IO socket instance
   * @param {Object} data - Event data
   */
  handleFileUnwatch(socket, data) {
    // Placeholder for future file watching implementation
    logger.debug('File unwatch received (placeholder)', {
      socketId: socket.id,
      data: data
    });
  }

  /**
   * Handle execution start
   * @param {Object} socket - Socket.IO socket instance
   * @param {Object} data - Event data
   */
  async handleExecutionStart(socket, data) {
    const session = this.userSessions.get(socket.id);
    if (!session) {
      socket.emit('execution:error', { message: 'Session not found' });
      return;
    }

    const { containerId, code, filename, executionId } = data;
    
    if (!containerId) {
      socket.emit('execution:error', { message: 'Container ID is required' });
      return;
    }

    if (!code) {
      socket.emit('execution:error', { message: 'Code is required' });
      return;
    }

    try {
      const executionService = require('./executionService');
      
      // Add user ID to socket for execution service
      socket.userId = session.userId;
      
      const execId = await executionService.startExecution(socket, {
        containerId,
        code,
        filename,
        executionId
      });

      logger.info('Code execution started via WebSocket', {
        socketId: socket.id,
        userId: session.userId,
        executionId: execId,
        containerId: containerId
      });

    } catch (error) {
      logger.error('Failed to start execution via WebSocket', {
        socketId: socket.id,
        userId: session.userId,
        containerId: containerId,
        error: error.message
      });

      socket.emit('execution:error', {
        message: 'Failed to start execution',
        error: error.message
      });
    }
  }

  /**
   * Handle execution stop
   * @param {Object} socket - Socket.IO socket instance
   * @param {Object} data - Event data
   */
  async handleExecutionStop(socket, data) {
    const session = this.userSessions.get(socket.id);
    if (!session) {
      socket.emit('execution:error', { message: 'Session not found' });
      return;
    }

    const { executionId } = data;
    
    if (!executionId) {
      socket.emit('execution:error', { message: 'Execution ID is required' });
      return;
    }

    try {
      const executionService = require('./executionService');
      const stopped = await executionService.stopExecution(executionId);

      if (stopped) {
        logger.info('Code execution stopped via WebSocket', {
          socketId: socket.id,
          userId: session.userId,
          executionId: executionId
        });
      } else {
        socket.emit('execution:error', {
          executionId: executionId,
          message: 'Execution not found or already completed'
        });
      }

    } catch (error) {
      logger.error('Failed to stop execution via WebSocket', {
        socketId: socket.id,
        userId: session.userId,
        executionId: executionId,
        error: error.message
      });

      socket.emit('execution:error', {
        executionId: executionId,
        message: 'Failed to stop execution',
        error: error.message
      });
    }
  }

  /**
   * Handle terminal autocomplete request
   * @param {Object} socket - Socket.IO socket instance
   * @param {Object} data - Event data
   */
  handleTerminalAutocomplete(socket, data) {
    const session = this.userSessions.get(socket.id);
    if (!session) {
      socket.emit('terminal:error', { message: 'Session not found' });
      return;
    }

    const { terminalId, partial } = data;
    
    if (!terminalId) {
      socket.emit('terminal:error', { message: 'Terminal ID is required' });
      return;
    }

    if (!session.terminalSessions.has(terminalId)) {
      socket.emit('terminal:error', { message: 'Terminal not found in session' });
      return;
    }

    if (!partial || typeof partial !== 'string') {
      socket.emit('terminal:error', { message: 'Partial command is required' });
      return;
    }

    try {
      const suggestions = terminalService.getAutocompleteSuggestions(terminalId, partial);
      
      socket.emit('terminal:autocomplete:response', {
        terminalId: terminalId,
        partial: partial,
        suggestions: suggestions
      });

    } catch (error) {
      logger.error('Failed to get autocomplete suggestions', {
        socketId: socket.id,
        userId: session.userId,
        terminalId: terminalId,
        error: error.message
      });

      socket.emit('terminal:error', {
        terminalId: terminalId,
        message: 'Failed to get autocomplete suggestions',
        error: error.message
      });
    }
  }

  /**
   * Handle terminal history request
   * @param {Object} socket - Socket.IO socket instance
   * @param {Object} data - Event data
   */
  handleTerminalHistory(socket, data) {
    const session = this.userSessions.get(socket.id);
    if (!session) {
      socket.emit('terminal:error', { message: 'Session not found' });
      return;
    }

    const { terminalId } = data;
    
    if (!terminalId) {
      socket.emit('terminal:error', { message: 'Terminal ID is required' });
      return;
    }

    if (!session.terminalSessions.has(terminalId)) {
      socket.emit('terminal:error', { message: 'Terminal not found in session' });
      return;
    }

    try {
      const history = terminalService.getCommandHistory(terminalId);
      
      socket.emit('terminal:history:response', {
        terminalId: terminalId,
        history: history,
        count: history.length
      });

    } catch (error) {
      logger.error('Failed to get command history', {
        socketId: socket.id,
        userId: session.userId,
        terminalId: terminalId,
        error: error.message
      });

      socket.emit('terminal:error', {
        terminalId: terminalId,
        message: 'Failed to get command history',
        error: error.message
      });
    }
  }

  /**
   * Handle socket disconnection
   * @param {Object} socket - Socket.IO socket instance
   * @param {string} reason - Disconnection reason
   */
  handleDisconnection(socket, reason) {
    const session = this.userSessions.get(socket.id);
    
    if (session) {
      const userId = session.userId;
      const workspaceId = session.workspaceId;

      logger.info('User disconnected from WebSocket', {
        socketId: socket.id,
        userId: userId,
        reason: reason,
        connectedDuration: Date.now() - session.connectedAt.getTime()
      });

      // Remove from connected users
      if (this.connectedUsers.has(userId)) {
        this.connectedUsers.get(userId).delete(socket.id);
        if (this.connectedUsers.get(userId).size === 0) {
          this.connectedUsers.delete(userId);
        }
      }

      // Notify workspace users if user was in a workspace
      if (workspaceId) {
        socket.to(`workspace:${workspaceId}`).emit('user:disconnected', {
          userId: userId,
          timestamp: new Date().toISOString()
        });
      }

      // Clean up terminal sessions
      if (session.terminalSessions) {
        for (const terminalId of session.terminalSessions.keys()) {
          try {
            terminalService.destroyTerminal(terminalId);
          } catch (error) {
            logger.error('Error cleaning up terminal on disconnect', {
              terminalId,
              error: error.message
            });
          }
        }
        session.terminalSessions.clear();
      }

      // Clean up collaboration sessions
      collaborationService.handleDisconnection(socket);

      // Remove session data
      this.userSessions.delete(socket.id);
    }
  }

  /**
   * Get connected users count
   * @returns {number} Number of connected users
   */
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  /**
   * Get user's socket IDs
   * @param {string} userId - User ID
   * @returns {Set} Set of socket IDs for the user
   */
  getUserSockets(userId) {
    return this.connectedUsers.get(userId) || new Set();
  }

  /**
   * Check if user is connected
   * @param {string} userId - User ID
   * @returns {boolean} True if user is connected
   */
  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }

  /**
   * Send message to user
   * @param {string} userId - User ID
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  sendToUser(userId, event, data) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }

  /**
   * Send message to workspace
   * @param {string} workspaceId - Workspace ID
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  sendToWorkspace(workspaceId, event, data) {
    if (this.io) {
      this.io.to(`workspace:${workspaceId}`).emit(event, data);
    }
  }

  /**
   * Broadcast message to all connected users
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  broadcast(event, data) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  /**
   * Set up terminal output streaming
   * @param {Object} socket - Socket.IO socket instance
   * @param {string} terminalId - Terminal ID
   */
  setupTerminalStreaming(socket, terminalId) {
    try {
      const streams = terminalService.getOutputStream(terminalId);
      
      // Stream stdout
      streams.stdout.on('data', (data) => {
        socket.emit('terminal:output', {
          terminalId: terminalId,
          data: data.toString(),
          stream: 'stdout'
        });
      });

      // Stream stderr
      streams.stderr.on('data', (data) => {
        socket.emit('terminal:output', {
          terminalId: terminalId,
          data: data.toString(),
          stream: 'stderr'
        });
      });

      // Handle stream errors
      streams.stdout.on('error', (error) => {
        logger.error('Terminal stdout stream error', {
          terminalId,
          error: error.message
        });
        socket.emit('terminal:error', {
          terminalId: terminalId,
          message: 'Output stream error',
          error: error.message
        });
      });

      streams.stderr.on('error', (error) => {
        logger.error('Terminal stderr stream error', {
          terminalId,
          error: error.message
        });
        socket.emit('terminal:error', {
          terminalId: terminalId,
          message: 'Error stream error',
          error: error.message
        });
      });

    } catch (error) {
      logger.error('Failed to set up terminal streaming', {
        terminalId,
        error: error.message
      });
      socket.emit('terminal:error', {
        terminalId: terminalId,
        message: 'Failed to set up output streaming',
        error: error.message
      });
    }
  }

  /**
   * Handle LSP server start
   * @param {Object} socket - Socket.IO socket instance
   * @param {Object} data - Event data
   */
  async handleLSPStart(socket, data) {
    const session = this.userSessions.get(socket.id);
    if (!session) {
      socket.emit('lsp:error', { message: 'Session not found' });
      return;
    }

    const { language, workspaceRoot } = data;
    
    if (!language) {
      socket.emit('lsp:error', { message: 'Language is required' });
      return;
    }

    if (!workspaceRoot) {
      socket.emit('lsp:error', { message: 'Workspace root is required' });
      return;
    }

    try {
      const lspService = require('./lspService');
      const serverId = await lspService.startServer(language, workspaceRoot);

      logger.info('LSP server started via WebSocket', {
        socketId: socket.id,
        userId: session.userId,
        serverId: serverId,
        language: language,
        workspaceRoot: workspaceRoot
      });

      socket.emit('lsp:started', {
        serverId: serverId,
        language: language,
        workspaceRoot: workspaceRoot
      });

    } catch (error) {
      logger.error('Failed to start LSP server via WebSocket', {
        socketId: socket.id,
        userId: session.userId,
        language: language,
        error: error.message
      });

      socket.emit('lsp:error', {
        message: 'Failed to start LSP server',
        error: error.message
      });
    }
  }

  /**
   * Handle LSP server stop
   * @param {Object} socket - Socket.IO socket instance
   * @param {Object} data - Event data
   */
  async handleLSPStop(socket, data) {
    const session = this.userSessions.get(socket.id);
    if (!session) {
      socket.emit('lsp:error', { message: 'Session not found' });
      return;
    }

    const { serverId } = data;
    
    if (!serverId) {
      socket.emit('lsp:error', { message: 'Server ID is required' });
      return;
    }

    try {
      const lspService = require('./lspService');
      const stopped = await lspService.stopServer(serverId);

      if (stopped) {
        logger.info('LSP server stopped via WebSocket', {
          socketId: socket.id,
          userId: session.userId,
          serverId: serverId
        });

        socket.emit('lsp:stopped', {
          serverId: serverId
        });
      } else {
        socket.emit('lsp:error', {
          serverId: serverId,
          message: 'LSP server not found or already stopped'
        });
      }

    } catch (error) {
      logger.error('Failed to stop LSP server via WebSocket', {
        socketId: socket.id,
        userId: session.userId,
        serverId: serverId,
        error: error.message
      });

      socket.emit('lsp:error', {
        serverId: serverId,
        message: 'Failed to stop LSP server',
        error: error.message
      });
    }
  }

  /**
   * Handle LSP connection
   * @param {Object} socket - Socket.IO socket instance
   * @param {Object} data - Event data
   */
  handleLSPConnect(socket, data) {
    const session = this.userSessions.get(socket.id);
    if (!session) {
      socket.emit('lsp:error', { message: 'Session not found' });
      return;
    }

    const { serverId, workspaceRoot } = data;
    
    if (!serverId) {
      socket.emit('lsp:error', { message: 'Server ID is required' });
      return;
    }

    if (!workspaceRoot) {
      socket.emit('lsp:error', { message: 'Workspace root is required' });
      return;
    }

    try {
      const lspService = require('./lspService');
      const connectionId = lspService.createConnection(serverId, socket, workspaceRoot);

      logger.info('LSP connection created via WebSocket', {
        socketId: socket.id,
        userId: session.userId,
        serverId: serverId,
        connectionId: connectionId,
        workspaceRoot: workspaceRoot
      });

      socket.emit('lsp:connected', {
        serverId: serverId,
        connectionId: connectionId,
        workspaceRoot: workspaceRoot
      });

    } catch (error) {
      logger.error('Failed to create LSP connection via WebSocket', {
        socketId: socket.id,
        userId: session.userId,
        serverId: serverId,
        error: error.message
      });

      socket.emit('lsp:error', {
        serverId: serverId,
        message: 'Failed to create LSP connection',
        error: error.message
      });
    }
  }

  /**
   * Handle LSP disconnection
   * @param {Object} socket - Socket.IO socket instance
   * @param {Object} data - Event data
   */
  handleLSPDisconnect(socket, data) {
    const session = this.userSessions.get(socket.id);
    if (!session) {
      socket.emit('lsp:error', { message: 'Session not found' });
      return;
    }

    const { connectionId } = data;
    
    if (!connectionId) {
      socket.emit('lsp:error', { message: 'Connection ID is required' });
      return;
    }

    try {
      const lspService = require('./lspService');
      const removed = lspService.removeConnection(connectionId);

      if (removed) {
        logger.info('LSP connection removed via WebSocket', {
          socketId: socket.id,
          userId: session.userId,
          connectionId: connectionId
        });

        socket.emit('lsp:disconnected', {
          connectionId: connectionId
        });
      } else {
        socket.emit('lsp:error', {
          connectionId: connectionId,
          message: 'LSP connection not found'
        });
      }

    } catch (error) {
      logger.error('Failed to remove LSP connection via WebSocket', {
        socketId: socket.id,
        userId: session.userId,
        connectionId: connectionId,
        error: error.message
      });

      socket.emit('lsp:error', {
        connectionId: connectionId,
        message: 'Failed to remove LSP connection',
        error: error.message
      });
    }
  }

  /**
   * Get Socket.IO instance
   * @returns {Object} Socket.IO server instance
   */
  getIO() {
    return this.io;
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

module.exports = webSocketService;