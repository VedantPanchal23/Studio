import { websocketService } from './websocket'

/**
 * Language Server Protocol service for frontend
 */
class LSPService {
  constructor() {
    this.activeServers = new Map() // language -> serverId
    this.activeConnections = new Map() // serverId -> connectionId
    this.documentVersions = new Map() // uri -> version
    this.pendingRequests = new Map() // requestId -> { resolve, reject }
    this.requestId = 0
    this.eventHandlers = new Map() // event -> Set of handlers
    this.isInitialized = false
  }

  /**
   * Initialize the LSP service
   */
  initialize() {
    if (this.isInitialized) return

    const socket = websocketService.connect()
    this.setupWebSocketHandlers(socket)
    this.isInitialized = true
  }

  /**
   * Set up WebSocket event handlers for LSP communication
   * @param {Object} socket - WebSocket instance
   */
  setupWebSocketHandlers(socket) {
    // Handle LSP server started
    socket.on('lsp:started', (data) => {
      const { serverId, language, workspaceRoot } = data
      this.activeServers.set(language, serverId)
      this.emit('server:started', { serverId, language, workspaceRoot })
    })

    // Handle LSP server stopped
    socket.on('lsp:stopped', (data) => {
      const { serverId } = data
      // Remove from active servers
      for (const [language, id] of this.activeServers.entries()) {
        if (id === serverId) {
          this.activeServers.delete(language)
          break
        }
      }
      this.activeConnections.delete(serverId)
      this.emit('server:stopped', { serverId })
    })

    // Handle LSP connection established
    socket.on('lsp:connected', (data) => {
      const { serverId, connectionId, workspaceRoot } = data
      this.activeConnections.set(serverId, connectionId)
      this.emit('connection:established', { serverId, connectionId, workspaceRoot })
    })

    // Handle LSP connection removed
    socket.on('lsp:disconnected', (data) => {
      const { connectionId } = data
      // Remove from active connections
      for (const [serverId, id] of this.activeConnections.entries()) {
        if (id === connectionId) {
          this.activeConnections.delete(serverId)
          break
        }
      }
      this.emit('connection:removed', { connectionId })
    })

    // Handle LSP responses
    socket.on('lsp:response', (data) => {
      const { id, result } = data
      if (this.pendingRequests.has(id)) {
        const { resolve } = this.pendingRequests.get(id)
        this.pendingRequests.delete(id)
        resolve(result)
      }
    })

    // Handle LSP errors
    socket.on('lsp:error', (data) => {
      const { id, error, serverId } = data
      if (id && this.pendingRequests.has(id)) {
        const { reject } = this.pendingRequests.get(id)
        this.pendingRequests.delete(id)
        reject(new Error(error.message || error))
      } else {
        this.emit('error', { error, serverId })
      }
    })

    // Handle LSP messages from server
    socket.on('lsp:message', (message) => {
      this.handleServerMessage(message)
    })

    // Handle server exit
    socket.on('lsp:server:exit', (data) => {
      const { serverId, exitCode } = data
      // Clean up
      for (const [language, id] of this.activeServers.entries()) {
        if (id === serverId) {
          this.activeServers.delete(language)
          break
        }
      }
      this.activeConnections.delete(serverId)
      this.emit('server:exit', { serverId, exitCode })
    })
  }

  /**
   * Start an LSP server for a language
   * @param {string} language - Programming language
   * @param {string} workspaceRoot - Workspace root directory
   * @returns {Promise<string>} Server ID
   */
  async startServer(language, workspaceRoot) {
    return new Promise((resolve, reject) => {
      const socket = websocketService.connect()
      
      // Set up one-time listeners for response
      const onStarted = (data) => {
        if (data.language === language) {
          socket.off('lsp:started', onStarted)
          socket.off('lsp:error', onError)
          resolve(data.serverId)
        }
      }
      
      const onError = (data) => {
        socket.off('lsp:started', onStarted)
        socket.off('lsp:error', onError)
        reject(new Error(data.error || data.message))
      }
      
      socket.on('lsp:started', onStarted)
      socket.on('lsp:error', onError)
      
      // Send start request
      socket.emit('lsp:start', { language, workspaceRoot })
      
      // Set timeout
      setTimeout(() => {
        socket.off('lsp:started', onStarted)
        socket.off('lsp:error', onError)
        reject(new Error('LSP server start timeout'))
      }, 30000)
    })
  }

  /**
   * Stop an LSP server
   * @param {string} serverId - Server ID
   * @returns {Promise<boolean>} Success status
   */
  async stopServer(serverId) {
    return new Promise((resolve, reject) => {
      const socket = websocketService.connect()
      
      // Set up one-time listeners for response
      const onStopped = (data) => {
        if (data.serverId === serverId) {
          socket.off('lsp:stopped', onStopped)
          socket.off('lsp:error', onError)
          resolve(true)
        }
      }
      
      const onError = (data) => {
        socket.off('lsp:stopped', onStopped)
        socket.off('lsp:error', onError)
        reject(new Error(data.error || data.message))
      }
      
      socket.on('lsp:stopped', onStopped)
      socket.on('lsp:error', onError)
      
      // Send stop request
      socket.emit('lsp:stop', { serverId })
      
      // Set timeout
      setTimeout(() => {
        socket.off('lsp:stopped', onStopped)
        socket.off('lsp:error', onError)
        resolve(false)
      }, 10000)
    })
  }

  /**
   * Connect to an LSP server
   * @param {string} serverId - Server ID
   * @param {string} workspaceRoot - Workspace root directory
   * @returns {Promise<string>} Connection ID
   */
  async connectToServer(serverId, workspaceRoot) {
    return new Promise((resolve, reject) => {
      const socket = websocketService.connect()
      
      // Set up one-time listeners for response
      const onConnected = (data) => {
        if (data.serverId === serverId) {
          socket.off('lsp:connected', onConnected)
          socket.off('lsp:error', onError)
          resolve(data.connectionId)
        }
      }
      
      const onError = (data) => {
        socket.off('lsp:connected', onConnected)
        socket.off('lsp:error', onError)
        reject(new Error(data.error || data.message))
      }
      
      socket.on('lsp:connected', onConnected)
      socket.on('lsp:error', onError)
      
      // Send connect request
      socket.emit('lsp:connect', { serverId, workspaceRoot })
      
      // Set timeout
      setTimeout(() => {
        socket.off('lsp:connected', onConnected)
        socket.off('lsp:error', onError)
        reject(new Error('LSP connection timeout'))
      }, 10000)
    })
  }

  /**
   * Send an LSP request
   * @param {string} method - LSP method name
   * @param {Object} params - Request parameters
   * @returns {Promise<any>} Response result
   */
  async sendRequest(method, params) {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId
      const socket = websocketService.connect()
      
      // Store pending request
      this.pendingRequests.set(id, { resolve, reject })
      
      // Send request
      socket.emit('lsp:request', { method, params, id })
      
      // Set timeout
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error(`LSP request timeout: ${method}`))
        }
      }, 30000)
    })
  }

  /**
   * Send an LSP notification
   * @param {string} method - LSP method name
   * @param {Object} params - Notification parameters
   */
  sendNotification(method, params) {
    const socket = websocketService.connect()
    socket.emit('lsp:notification', { method, params })
  }

  /**
   * Open a document in the LSP server
   * @param {string} uri - Document URI
   * @param {string} languageId - Language identifier
   * @param {string} text - Document content
   */
  openDocument(uri, languageId, text) {
    const version = 1
    this.documentVersions.set(uri, version)
    
    const socket = websocketService.connect()
    socket.emit('lsp:textDocument/didOpen', {
      uri,
      languageId,
      version,
      text
    })
  }

  /**
   * Update document content
   * @param {string} uri - Document URI
   * @param {Array} contentChanges - Array of content changes
   */
  changeDocument(uri, contentChanges) {
    const version = (this.documentVersions.get(uri) || 0) + 1
    this.documentVersions.set(uri, version)
    
    const socket = websocketService.connect()
    socket.emit('lsp:textDocument/didChange', {
      uri,
      version,
      contentChanges
    })
  }

  /**
   * Close a document
   * @param {string} uri - Document URI
   */
  closeDocument(uri) {
    this.documentVersions.delete(uri)
    
    const socket = websocketService.connect()
    socket.emit('lsp:textDocument/didClose', { uri })
  }

  /**
   * Get hover information
   * @param {string} uri - Document URI
   * @param {Object} position - Position in document
   * @returns {Promise<Object>} Hover information
   */
  async getHover(uri, position) {
    return this.sendRequest('textDocument/hover', {
      textDocument: { uri },
      position
    })
  }

  /**
   * Get completion items
   * @param {string} uri - Document URI
   * @param {Object} position - Position in document
   * @returns {Promise<Object>} Completion items
   */
  async getCompletion(uri, position) {
    return this.sendRequest('textDocument/completion', {
      textDocument: { uri },
      position
    })
  }

  /**
   * Go to definition
   * @param {string} uri - Document URI
   * @param {Object} position - Position in document
   * @returns {Promise<Object>} Definition location
   */
  async getDefinition(uri, position) {
    return this.sendRequest('textDocument/definition', {
      textDocument: { uri },
      position
    })
  }

  /**
   * Find references
   * @param {string} uri - Document URI
   * @param {Object} position - Position in document
   * @returns {Promise<Array>} Reference locations
   */
  async getReferences(uri, position) {
    return this.sendRequest('textDocument/references', {
      textDocument: { uri },
      position,
      context: { includeDeclaration: true }
    })
  }

  /**
   * Get signature help
   * @param {string} uri - Document URI
   * @param {Object} position - Position in document
   * @returns {Promise<Object>} Signature help
   */
  async getSignatureHelp(uri, position) {
    return this.sendRequest('textDocument/signatureHelp', {
      textDocument: { uri },
      position
    })
  }

  /**
   * Format document
   * @param {string} uri - Document URI
   * @param {Object} options - Formatting options
   * @returns {Promise<Array>} Text edits
   */
  async formatDocument(uri, options = {}) {
    return this.sendRequest('textDocument/formatting', {
      textDocument: { uri },
      options: {
        tabSize: options.tabSize || 2,
        insertSpaces: options.insertSpaces !== false
      }
    })
  }

  /**
   * Format document range
   * @param {string} uri - Document URI
   * @param {Object} range - Range to format
   * @param {Object} options - Formatting options
   * @returns {Promise<Array>} Text edits
   */
  async formatDocumentRange(uri, range, options = {}) {
    return this.sendRequest('textDocument/rangeFormatting', {
      textDocument: { uri },
      range,
      options: {
        tabSize: options.tabSize || 2,
        insertSpaces: options.insertSpaces !== false
      }
    })
  }

  /**
   * Get document symbols
   * @param {string} uri - Document URI
   * @returns {Promise<Array>} Document symbols
   */
  async getDocumentSymbols(uri) {
    return this.sendRequest('textDocument/documentSymbol', {
      textDocument: { uri }
    })
  }

  /**
   * Get code actions
   * @param {string} uri - Document URI
   * @param {Object} range - Range for code actions
   * @param {Object} context - Code action context
   * @returns {Promise<Array>} Code actions
   */
  async getCodeActions(uri, range, context = {}) {
    return this.sendRequest('textDocument/codeAction', {
      textDocument: { uri },
      range,
      context
    })
  }

  /**
   * Rename symbol
   * @param {string} uri - Document URI
   * @param {Object} position - Position of symbol
   * @param {string} newName - New name
   * @returns {Promise<Object>} Workspace edit
   */
  async rename(uri, position, newName) {
    return this.sendRequest('textDocument/rename', {
      textDocument: { uri },
      position,
      newName
    })
  }

  /**
   * Prepare rename
   * @param {string} uri - Document URI
   * @param {Object} position - Position of symbol
   * @returns {Promise<Object>} Rename range and placeholder
   */
  async prepareRename(uri, position) {
    return this.sendRequest('textDocument/prepareRename', {
      textDocument: { uri },
      position
    })
  }

  /**
   * Get diagnostics (if supported by server)
   * @param {string} uri - Document URI
   * @returns {Promise<Array>} Diagnostics
   */
  async getDiagnostics(uri) {
    // Note: Most LSP servers send diagnostics automatically via publishDiagnostics
    // This method is for servers that support manual diagnostic requests
    try {
      return this.sendRequest('textDocument/diagnostic', {
        textDocument: { uri }
      })
    } catch (error) {
      // Not all servers support this method
      console.debug('Diagnostics request not supported:', error.message)
      return null
    }
  }

  /**
   * Handle messages from LSP server
   * @param {Object} message - LSP message
   */
  handleServerMessage(message) {
    if (message.method) {
      // Handle notifications from server
      switch (message.method) {
        case 'textDocument/publishDiagnostics':
          this.emit('diagnostics', message.params)
          break
        case 'window/showMessage':
          this.emit('showMessage', message.params)
          break
        case 'window/logMessage':
          this.emit('logMessage', message.params)
          break
        default:
          this.emit('message', message)
      }
    }
  }

  /**
   * Get active server for language
   * @param {string} language - Programming language
   * @returns {string|null} Server ID or null
   */
  getActiveServer(language) {
    return this.activeServers.get(language) || null
  }

  /**
   * Check if server is active for language
   * @param {string} language - Programming language
   * @returns {boolean} True if server is active
   */
  hasActiveServer(language) {
    return this.activeServers.has(language)
  }

  /**
   * Get all active servers
   * @returns {Map} Map of language -> serverId
   */
  getActiveServers() {
    return new Map(this.activeServers)
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event).add(handler)
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).delete(handler)
    }
  }

  /**
   * Emit event
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error('Error in LSP event handler:', error)
        }
      })
    }
  }

  /**
   * Convert file path to URI
   * @param {string} filePath - File path
   * @returns {string} URI
   */
  pathToUri(filePath) {
    // Simple conversion - in a real implementation, this would be more robust
    return `file://${filePath.replace(/\\/g, '/')}`
  }

  /**
   * Convert URI to file path
   * @param {string} uri - URI
   * @returns {string} File path
   */
  uriToPath(uri) {
    return uri.replace('file://', '').replace(/\//g, '\\')
  }

  /**
   * Get language identifier from file extension
   * @param {string} fileName - File name
   * @returns {string} Language identifier
   */
  getLanguageId(fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase()
    
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascriptreact',
      'ts': 'typescript',
      'tsx': 'typescriptreact',
      'py': 'python',
      'java': 'java',
      'go': 'go',
      'rs': 'rust',
      'c': 'c',
      'cpp': 'cpp',
      'cc': 'cpp',
      'cxx': 'cpp',
      'h': 'c',
      'hpp': 'cpp',
      'json': 'json',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'less': 'less',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sh': 'shellscript',
      'bash': 'shellscript',
      'zsh': 'shellscript',
      'fish': 'shellscript'
    }
    
    return languageMap[ext] || 'plaintext'
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.pendingRequests.clear()
    this.documentVersions.clear()
    this.eventHandlers.clear()
    this.activeServers.clear()
    this.activeConnections.clear()
    this.isInitialized = false
  }
}

// Create singleton instance
export const lspService = new LSPService()
export default lspService