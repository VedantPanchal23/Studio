import { useState, useEffect, useCallback, useRef } from 'react'
import collaborationService from '../services/collaborationService'

/**
 * React hook for collaborative document editing
 * @param {string} workspaceId - Workspace ID
 * @param {string} filePath - File path
 * @param {Object} userInfo - Current user information
 * @returns {Object} Collaboration state and methods
 */
export function useCollaboration(workspaceId, filePath, userInfo) {
  const [isConnected, setIsConnected] = useState(false)
  const [isSynced, setIsSynced] = useState(false)
  const [users, setUsers] = useState([])
  const [error, setError] = useState(null)
  const [isJoining, setIsJoining] = useState(false)
  
  const documentId = `${workspaceId}:${filePath}`
  const collaborationRef = useRef(null)
  const listenersRef = useRef(new Set())

  // Initialize collaboration service
  useEffect(() => {
    collaborationService.initialize()
  }, [])

  // Join document when parameters change
  useEffect(() => {
    if (!workspaceId || !filePath || !userInfo?.id) {
      return
    }

    let isMounted = true

    const joinDocument = async () => {
      try {
        setIsJoining(true)
        setError(null)

        const collaboration = await collaborationService.joinDocument(
          documentId,
          workspaceId,
          filePath,
          userInfo
        )

        if (isMounted) {
          collaborationRef.current = collaboration
          setIsJoining(false)
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message)
          setIsJoining(false)
        }
      }
    }

    joinDocument()

    return () => {
      isMounted = false
      if (collaborationRef.current) {
        collaborationService.leaveDocument(documentId, userInfo.id)
        collaborationRef.current = null
      }
    }
  }, [documentId, workspaceId, filePath, userInfo?.id])

  // Set up event listeners
  useEffect(() => {
    if (!collaborationRef.current) return

    const handleConnectionStatus = (data) => {
      setIsConnected(data.connected)
    }

    const handleSyncStatus = (data) => {
      setIsSynced(data.synced)
    }

    const handleUsersChanged = (data) => {
      setUsers(data.users || [])
    }

    const handleUserJoined = (user) => {
      setUsers(prev => {
        const exists = prev.some(u => u.user?.id === user.user?.id)
        return exists ? prev : [...prev, user]
      })
    }

    const handleUserLeft = (data) => {
      setUsers(prev => prev.filter(u => u.user?.id !== data.userId))
    }

    // Add event listeners
    collaborationService.addEventListener(documentId, 'connection-status', handleConnectionStatus)
    collaborationService.addEventListener(documentId, 'sync-status', handleSyncStatus)
    collaborationService.addEventListener(documentId, 'users-changed', handleUsersChanged)
    collaborationService.addEventListener(documentId, 'user-joined', handleUserJoined)
    collaborationService.addEventListener(documentId, 'user-left', handleUserLeft)

    // Store listeners for cleanup
    listenersRef.current.add({ event: 'connection-status', callback: handleConnectionStatus })
    listenersRef.current.add({ event: 'sync-status', callback: handleSyncStatus })
    listenersRef.current.add({ event: 'users-changed', callback: handleUsersChanged })
    listenersRef.current.add({ event: 'user-joined', callback: handleUserJoined })
    listenersRef.current.add({ event: 'user-left', callback: handleUserLeft })

    return () => {
      // Remove event listeners
      for (const listener of listenersRef.current) {
        collaborationService.removeEventListener(documentId, listener.event, listener.callback)
      }
      listenersRef.current.clear()
    }
  }, [documentId, collaborationRef.current])

  // Get document text
  const getDocumentText = useCallback((textName = 'content') => {
    return collaborationService.getDocumentText(documentId, textName)
  }, [documentId])

  // Update awareness (cursor, selection, etc.)
  const updateAwareness = useCallback((awarenessData) => {
    collaborationService.updateAwareness(documentId, awarenessData)
  }, [documentId])

  // Get document statistics
  const getStats = useCallback(() => {
    return collaborationService.getDocumentStats(documentId)
  }, [documentId])

  // Bind Yjs text to a text area or input
  const bindTextElement = useCallback((element, textName = 'content') => {
    if (!collaborationRef.current || !element) return null

    const yText = collaborationService.getDocumentText(documentId, textName)
    if (!yText) return null

    // Set initial content
    if (element.value !== yText.toString()) {
      element.value = yText.toString()
    }

    // Listen for Yjs changes
    const handleYjsChange = () => {
      if (element.value !== yText.toString()) {
        const cursorPos = element.selectionStart
        element.value = yText.toString()
        element.setSelectionRange(cursorPos, cursorPos)
      }
    }

    // Listen for input changes
    const handleInputChange = (event) => {
      const value = event.target.value
      const currentText = yText.toString()
      
      if (value !== currentText) {
        // Calculate diff and apply changes
        yText.delete(0, currentText.length)
        yText.insert(0, value)
      }

      // Update cursor awareness
      updateAwareness({
        cursor: {
          line: 0, // Simple implementation - could be enhanced for multi-line
          column: element.selectionStart
        },
        selection: element.selectionStart !== element.selectionEnd ? {
          start: element.selectionStart,
          end: element.selectionEnd
        } : null
      })
    }

    // Listen for selection changes
    const handleSelectionChange = () => {
      updateAwareness({
        cursor: {
          line: 0,
          column: element.selectionStart
        },
        selection: element.selectionStart !== element.selectionEnd ? {
          start: element.selectionStart,
          end: element.selectionEnd
        } : null
      })
    }

    yText.observe(handleYjsChange)
    element.addEventListener('input', handleInputChange)
    element.addEventListener('selectionchange', handleSelectionChange)
    element.addEventListener('select', handleSelectionChange)

    // Return cleanup function
    return () => {
      yText.unobserve(handleYjsChange)
      element.removeEventListener('input', handleInputChange)
      element.removeEventListener('selectionchange', handleSelectionChange)
      element.removeEventListener('select', handleSelectionChange)
    }
  }, [documentId, updateAwareness])

  return {
    // State
    isConnected,
    isSynced,
    users,
    error,
    isJoining,
    documentId,
    
    // Methods
    getDocumentText,
    updateAwareness,
    getStats,
    bindTextElement,
    
    // Raw collaboration objects (for advanced usage)
    doc: collaborationRef.current?.doc,
    provider: collaborationRef.current?.provider,
    awareness: collaborationRef.current?.awareness
  }
}

export default useCollaboration