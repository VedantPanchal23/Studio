import React, { useEffect, useRef, useState } from 'react'
import useCollaboration from '../hooks/useCollaboration'
import UserPresence from './UserPresence'

/**
 * Collaborative textarea component with real-time synchronization
 */
const CollaborativeTextArea = ({
  workspaceId,
  filePath,
  userInfo,
  placeholder = 'Start typing...',
  className = '',
  rows = 10,
  onContentChange,
  ...textareaProps
}) => {
  const textareaRef = useRef(null)
  const [content, setContent] = useState('')
  const [isBinding, setIsBinding] = useState(false)
  const bindingRef = useRef(null)

  // Use collaboration hook
  const {
    isConnected,
    isSynced,
    users,
    error,
    isJoining,
    doc,
    awareness,
    updateAwareness
  } = useCollaboration(workspaceId, filePath, userInfo)

  // Set up text binding when document is ready
  useEffect(() => {
    if (!doc || !textareaRef.current || isBinding) {
      return
    }

    setIsBinding(true)

    try {
      // Get Yjs text object
      const yText = doc.getText('content')
      
      // Set initial content
      const initialContent = yText.toString()
      setContent(initialContent)
      textareaRef.current.value = initialContent

      // Set up Yjs text binding
      const handleYjsChange = () => {
        const newContent = yText.toString()
        if (textareaRef.current && textareaRef.current.value !== newContent) {
          const cursorPos = textareaRef.current.selectionStart
          textareaRef.current.value = newContent
          setContent(newContent)
          
          // Restore cursor position
          textareaRef.current.setSelectionRange(cursorPos, cursorPos)
          
          if (onContentChange) {
            onContentChange(newContent)
          }
        }
      }

      // Listen for Yjs changes
      yText.observe(handleYjsChange)

      // Store binding reference for cleanup
      bindingRef.current = {
        yText,
        cleanup: () => {
          yText.unobserve(handleYjsChange)
        }
      }

      console.log('Text binding created for collaborative editing')
    } catch (error) {
      console.error('Failed to create text binding:', error)
    } finally {
      setIsBinding(false)
    }

    return () => {
      if (bindingRef.current) {
        bindingRef.current.cleanup()
        bindingRef.current = null
      }
    }
  }, [doc, isBinding, onContentChange])

  // Handle textarea input changes
  const handleInputChange = (event) => {
    if (!bindingRef.current) return

    const newValue = event.target.value
    const yText = bindingRef.current.yText
    const currentText = yText.toString()

    if (newValue !== currentText) {
      // Apply changes to Yjs document
      yText.delete(0, currentText.length)
      yText.insert(0, newValue)
    }

    setContent(newValue)

    // Update cursor awareness
    if (awareness) {
      updateAwareness({
        cursor: {
          line: 0, // Simple implementation for textarea
          column: event.target.selectionStart
        },
        selection: event.target.selectionStart !== event.target.selectionEnd ? {
          start: event.target.selectionStart,
          end: event.target.selectionEnd
        } : null
      })
    }
  }

  // Handle selection changes
  const handleSelectionChange = () => {
    if (!textareaRef.current || !awareness) return

    const textarea = textareaRef.current
    updateAwareness({
      cursor: {
        line: 0,
        column: textarea.selectionStart
      },
      selection: textarea.selectionStart !== textarea.selectionEnd ? {
        start: textarea.selectionStart,
        end: textarea.selectionEnd
      } : null
    })
  }

  // Connection status
  const getConnectionStatus = () => {
    if (isJoining) return { text: 'Joining...', color: 'text-yellow-500' }
    if (error) return { text: 'Error', color: 'text-red-500' }
    if (!isConnected) return { text: 'Disconnected', color: 'text-red-500' }
    if (!isSynced) return { text: 'Syncing...', color: 'text-yellow-500' }
    return { text: 'Connected', color: 'text-green-500' }
  }

  const status = getConnectionStatus()

  return (
    <div className={`relative ${className}`}>
      {/* Header with status and presence */}
      <div className="flex items-center justify-between mb-2">
        <div className={`text-xs ${status.color} flex items-center gap-1`}>
          <div className={`w-2 h-2 rounded-full ${
            status.text === 'Connected' ? 'bg-green-500' :
            status.text === 'Syncing...' || status.text === 'Joining...' ? 'bg-yellow-500' :
            'bg-red-500'
          }`} />
          {status.text}
        </div>
        
        {users.length > 0 && (
          <UserPresence users={users} currentUserId={userInfo?.id} />
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-2 bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
          Collaboration error: {error}
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleInputChange}
        onSelect={handleSelectionChange}
        onMouseUp={handleSelectionChange}
        onKeyUp={handleSelectionChange}
        placeholder={placeholder}
        rows={rows}
        className={`w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical ${
          !isConnected ? 'bg-gray-100' : ''
        }`}
        disabled={!isConnected || isJoining}
        {...textareaProps}
      />

      {/* User cursors overlay (simplified for textarea) */}
      {users.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          {users.map(userState => {
            const user = userState.user
            if (!user || user.id === userInfo?.id) return null
            
            return (
              <div key={user.id} className="inline-flex items-center gap-1 mr-3">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: user.color || '#007ACC' }}
                />
                <span>{user.name}</span>
                {userState.cursor && (
                  <span className="text-gray-400">
                    (pos: {userState.cursor.column})
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CollaborativeTextArea