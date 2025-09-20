import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import websocketService from './websocket'

/**
 * Collaboration service for handling Yjs document synchronization on the frontend
 */
class CollaborationService {
  constructor() {
    this.documents = new Map() // documentId -> Y.Doc
    this.providers = new Map() // documentId -> WebsocketProvider
    this.awareness = new Map() // documentId -> Awareness
    this.eventListeners = new Map() // documentId -> Set of listeners
    this.isInitialized = false
  }

  /**
   * Initialize the collaboration service
   */
  initialize() {
    if (this.isInitialized) return

    // Connect to WebSocket if not already connected
    websocketService.connect()
    this.isInitialized = true
    
    console.log('Collaboration service initialized')
  }

  /**
   * Create or get a collaborative document
   * @param {string} documentId - Unique document identifier (workspaceId:filePath)
   * @param {string} workspaceId - Workspace ID
   * @param {string} filePath - File path
   * @param {Object} options - Configuration options
   * @returns {Object} Document, provider, and awareness objects
   */
  getDocument(documentId, workspaceId, filePath, options = {}) {
    if (this.documents.has(documentId)) {
      return {
        doc: this.documents.get(documentId),
        provider: this.providers.get(documentId),
        awareness: this.awareness.get(documentId)
      }
    }

    // Create new Yjs document
    const doc = new Y.Doc()
    
    // Create custom provider using Socket.IO
    const awareness = new Awareness(doc)
    const provider = {
      awareness,
      connect: () => {
        console.log('Provider connected (using Socket.IO)')
      },
      disconnect: () => {
        console.log('Provider disconnected')
      },
      destroy: () => {
        awareness.destroy()
      },
      wsconnected: true,
      synced: true
    }

    // Get awareness for user presence (already created above)

    // Store references
    this.documents.set(documentId, doc)
    this.providers.set(documentId, provider)
    this.awareness.set(documentId, awareness)
    this.eventListeners.set(documentId, new Set())

    // Set up event handlers
    this.setupDocumentEventHandlers(documentId, doc, provider, awareness)

    console.log('Created collaborative document:', documentId)

    return { doc, provider, awareness }
  }

  /**
   * Join a collaborative document
   * @param {string} documentId - Document ID
   * @param {string} workspaceId - Workspace ID  
   * @param {string} filePath - File path
   * @param {Object} userInfo - User information
   * @returns {Promise<Object>} Document objects
   */
  async joinDocument(documentId, workspaceId, filePath, userInfo) {
    try {
      const { doc, provider, awareness } = this.getDocument(documentId, workspaceId, filePath)

      // Set user information in awareness
      awareness.setLocalStateField('user', {
        id: userInfo.id,
        name: userInfo.name,
        email: userInfo.email,
        avatar: userInfo.avatar,
        color: this.generateUserColor(userInfo.id)
      })

      // Connect to WebSocket provider
      provider.connect()

      // Emit join event to backend
      websocketService.emit('collaboration:document-join', {
        documentId,
        workspaceId,
        filePath,
        userId: userInfo.id
      })

      console.log('Joined collaborative document:', documentId)

      return { doc, provider, awareness }
    } catch (error) {
      console.error('Failed to join collaborative document:', error)
      throw error
    }
  }

  /**
   * Leave a collaborative document
   * @param {string} documentId - Document ID
   * @param {string} userId - User ID
   */
  async leaveDocument(documentId, userId) {
    try {
      const provider = this.providers.get(documentId)
      const awareness = this.awareness.get(documentId)

      if (provider) {
        provider.disconnect()
      }

      if (awareness) {
        awareness.destroy()
      }

      // Emit leave event to backend
      websocketService.emit('collaboration:document-leave', {
        documentId,
        userId
      })

      // Clean up references
      this.documents.delete(documentId)
      this.providers.delete(documentId)
      this.awareness.delete(documentId)
      
      const listeners = this.eventListeners.get(documentId)
      if (listeners) {
        listeners.clear()
      }
      this.eventListeners.delete(documentId)

      console.log('Left collaborative document:', documentId)
    } catch (error) {
      console.error('Failed to leave collaborative document:', error)
      throw error
    }
  }

  /**
   * Get text content from a document
   * @param {string} documentId - Document ID
   * @param {string} textName - Name of the text object (default: 'content')
   * @returns {Y.Text|null} Yjs text object
   */
  getDocumentText(documentId, textName = 'content') {
    const doc = this.documents.get(documentId)
    if (!doc) return null
    
    return doc.getText(textName)
  }

  /**
   * Set up event handlers for a document
   * @param {string} documentId - Document ID
   * @param {Y.Doc} doc - Yjs document
   * @param {WebsocketProvider} provider - WebSocket provider
   * @param {Awareness} awareness - Awareness object
   */
  setupDocumentEventHandlers(documentId, doc, provider, awareness) {
    // Document update events
    doc.on('update', (update, origin) => {
      if (origin !== provider) {
        // Local update, send to backend
        websocketService.emit('collaboration:document-update', {
          documentId,
          update: Array.from(update),
          userId: this.getCurrentUserId()
        })
      }
    })

    // Provider connection events
    provider.on('status', (event) => {
      console.log('Provider status changed:', event.status)
      this.notifyListeners(documentId, 'connection-status', {
        status: event.status,
        connected: event.status === 'connected'
      })
    })

    provider.on('sync', (isSynced) => {
      console.log('Document sync status:', isSynced)
      this.notifyListeners(documentId, 'sync-status', {
        synced: isSynced
      })
    })

    // Awareness events (user presence)
    awareness.on('change', (changes) => {
      const users = Array.from(awareness.getStates().values())
      this.notifyListeners(documentId, 'users-changed', {
        users,
        changes
      })
    })

    // WebSocket events from backend
    websocketService.on('collaboration:document-update', (data) => {
      if (data.documentId === documentId) {
        const update = new Uint8Array(data.update)
        Y.applyUpdate(doc, update, provider)
      }
    })

    websocketService.on('collaboration:user-joined', (data) => {
      if (data.documentId === documentId) {
        this.notifyListeners(documentId, 'user-joined', data.user)
      }
    })

    websocketService.on('collaboration:user-left', (data) => {
      if (data.documentId === documentId) {
        this.notifyListeners(documentId, 'user-left', { userId: data.userId })
      }
    })

    websocketService.on('collaboration:awareness-update', (data) => {
      if (data.documentId === documentId) {
        this.notifyListeners(documentId, 'awareness-update', data.awareness)
      }
    })
  }

  /**
   * Add event listener for a document
   * @param {string} documentId - Document ID
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
   */
  addEventListener(documentId, event, callback) {
    const listeners = this.eventListeners.get(documentId)
    if (listeners) {
      listeners.add({ event, callback })
    }
  }

  /**
   * Remove event listener for a document
   * @param {string} documentId - Document ID
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
   */
  removeEventListener(documentId, event, callback) {
    const listeners = this.eventListeners.get(documentId)
    if (listeners) {
      for (const listener of listeners) {
        if (listener.event === event && listener.callback === callback) {
          listeners.delete(listener)
          break
        }
      }
    }
  }

  /**
   * Notify event listeners
   * @param {string} documentId - Document ID
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  notifyListeners(documentId, event, data) {
    const listeners = this.eventListeners.get(documentId)
    if (listeners) {
      for (const listener of listeners) {
        if (listener.event === event) {
          try {
            listener.callback(data)
          } catch (error) {
            console.error('Error in collaboration event listener:', error)
          }
        }
      }
    }
  }

  /**
   * Update user awareness (cursor position, selection, etc.)
   * @param {string} documentId - Document ID
   * @param {Object} awarenessData - Awareness data
   */
  updateAwareness(documentId, awarenessData) {
    const awareness = this.awareness.get(documentId)
    if (awareness) {
      // Update local awareness
      Object.keys(awarenessData).forEach(key => {
        awareness.setLocalStateField(key, awarenessData[key])
      })

      // Send to backend
      websocketService.emit('collaboration:awareness-update', {
        documentId,
        userId: this.getCurrentUserId(),
        ...awarenessData
      })
    }
  }

  /**
   * Get current user ID from authentication
   * @returns {string|null} User ID
   */
  getCurrentUserId() {
    // This should be implemented based on your authentication system
    const authData = localStorage.getItem('authData')
    if (authData) {
      try {
        const parsed = JSON.parse(authData)
        return parsed.user?.id
      } catch (error) {
        console.error('Failed to parse auth data:', error)
      }
    }
    return null
  }

  /**
   * Generate a consistent color for a user
   * @param {string} userId - User ID
   * @returns {string} Hex color
   */
  generateUserColor(userId) {
    // Generate a consistent color based on user ID
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ]
    
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    return colors[Math.abs(hash) % colors.length]
  }

  /**
   * Get document statistics
   * @param {string} documentId - Document ID
   * @returns {Object|null} Document statistics
   */
  getDocumentStats(documentId) {
    const doc = this.documents.get(documentId)
    const provider = this.providers.get(documentId)
    const awareness = this.awareness.get(documentId)

    if (!doc) return null

    return {
      documentId,
      connected: provider?.wsconnected || false,
      synced: provider?.synced || false,
      userCount: awareness?.getStates().size || 0,
      users: Array.from(awareness?.getStates().values() || [])
    }
  }

  /**
   * Cleanup all documents and connections
   */
  cleanup() {
    for (const [documentId, provider] of this.providers.entries()) {
      try {
        provider.disconnect()
        provider.destroy()
      } catch (error) {
        console.error('Error cleaning up provider:', error)
      }
    }

    for (const [documentId, awareness] of this.awareness.entries()) {
      try {
        awareness.destroy()
      } catch (error) {
        console.error('Error cleaning up awareness:', error)
      }
    }

    this.documents.clear()
    this.providers.clear()
    this.awareness.clear()
    this.eventListeners.clear()
    this.isInitialized = false

    console.log('Collaboration service cleaned up')
  }
}

// Create singleton instance
export const collaborationService = new CollaborationService()
export default collaborationService