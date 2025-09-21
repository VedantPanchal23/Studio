import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Editor } from '@monaco-editor/react'
import { MonacoBinding } from 'y-monaco'
import useCollaboration from '../hooks/useCollaboration'
import UserPresence from './UserPresence'

/**
 * Collaborative Monaco Editor component with real-time synchronization
 */
const CollaborativeEditor = ({
  workspaceId,
  filePath,
  language = 'javascript',
  theme = 'vs-dark',
  userInfo,
  onContentChange,
  className = '',
  ...editorProps
}) => {
  const editorRef = useRef(null)
  const monacoRef = useRef(null)
  const bindingRef = useRef(null)
  const [isEditorReady, setIsEditorReady] = useState(false)
  const [cursors, setCursors] = useState([])
  const [selections, setSelections] = useState([])

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

  // Handle editor mount
  const handleEditorDidMount = useCallback((editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco
    setIsEditorReady(true)

    // Set up editor event listeners
    editor.onDidChangeCursorPosition((e) => {
      if (awareness) {
        updateAwareness({
          cursor: {
            line: e.position.lineNumber,
            column: e.position.column
          },
          selection: null
        })
      }
    })

    editor.onDidChangeCursorSelection((e) => {
      if (awareness) {
        const hasSelection = !e.selection.isEmpty()
        updateAwareness({
          cursor: {
            line: e.selection.endLineNumber,
            column: e.selection.endColumn
          },
          selection: hasSelection ? {
            startLine: e.selection.startLineNumber,
            startColumn: e.selection.startColumn,
            endLine: e.selection.endLineNumber,
            endColumn: e.selection.endColumn
          } : null
        })
      }
    })

    // Set up content change listener
    editor.onDidChangeModelContent(() => {
      if (onContentChange && bindingRef.current) {
        const content = editor.getValue()
        onContentChange(content)
      }
    })
  }, [awareness, updateAwareness, onContentChange])

  // Set up Monaco binding when editor and document are ready
  useEffect(() => {
    if (!isEditorReady || !doc || !awareness || !editorRef.current || !monacoRef.current) {
      return
    }

    try {
      // Get or create text type for the document
      const yText = doc.getText('content')
      
      // Create Monaco binding
      const binding = new MonacoBinding(
        yText,
        editorRef.current.getModel(),
        new Set([editorRef.current]),
        awareness
      )

      bindingRef.current = binding

      console.log('Monaco binding created for collaborative editing')

      return () => {
        if (bindingRef.current) {
          bindingRef.current.destroy()
          bindingRef.current = null
        }
      }
    } catch (error) {
      console.error('Failed to create Monaco binding:', error)
    }
  }, [isEditorReady, doc, awareness])

  // Handle awareness changes for user presence
  useEffect(() => {
    if (!awareness) return

    const handleAwarenessChange = () => {
      const states = Array.from(awareness.getStates().values())
      const otherUsers = states.filter(state => 
        state.user && state.user.id !== userInfo?.id
      )

      // Extract cursors and selections
      const newCursors = []
      const newSelections = []

      otherUsers.forEach(state => {
        if (state.cursor && state.user) {
          newCursors.push({
            userId: state.user.id,
            user: state.user,
            line: state.cursor.line,
            column: state.cursor.column,
            color: state.user.color || '#007ACC'
          })
        }

        if (state.selection && state.user) {
          newSelections.push({
            userId: state.user.id,
            user: state.user,
            startLine: state.selection.startLine,
            startColumn: state.selection.startColumn,
            endLine: state.selection.endLine,
            endColumn: state.selection.endColumn,
            color: state.user.color || '#007ACC'
          })
        }
      })

      setCursors(newCursors)
      setSelections(newSelections)
    }

    awareness.on('change', handleAwarenessChange)
    handleAwarenessChange() // Initial call

    return () => {
      awareness.off('change', handleAwarenessChange)
    }
  }, [awareness, userInfo?.id])

  // Render cursor decorations in Monaco
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return

    const editor = editorRef.current
    const monaco = monacoRef.current

    // Clear existing decorations
    const oldDecorations = editor.getModel()?.getAllDecorations() || []
    const collaborationDecorations = oldDecorations.filter(d => 
      d.options.className?.includes('collaboration-cursor') ||
      d.options.className?.includes('collaboration-selection')
    )

    // Create new decorations for cursors and selections
    const newDecorations = []

    // Add cursor decorations
    cursors.forEach(cursor => {
      newDecorations.push({
        range: new monaco.Range(cursor.line, cursor.column, cursor.line, cursor.column),
        options: {
          className: `collaboration-cursor collaboration-cursor-${cursor.userId}`,
          beforeContentClassName: `collaboration-cursor-line collaboration-cursor-line-${cursor.userId}`,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          hoverMessage: {
            value: `${cursor.user.name} is here`
          }
        }
      })
    })

    // Add selection decorations
    selections.forEach(selection => {
      newDecorations.push({
        range: new monaco.Range(
          selection.startLine,
          selection.startColumn,
          selection.endLine,
          selection.endColumn
        ),
        options: {
          className: `collaboration-selection collaboration-selection-${selection.userId}`,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          hoverMessage: {
            value: `Selected by ${selection.user.name}`
          }
        }
      })
    })

    // Apply decorations
    editor.deltaDecorations(
      collaborationDecorations.map(d => d.id),
      newDecorations
    )

    // Add CSS styles for cursors and selections
    const styleId = 'collaboration-styles'
    let styleElement = document.getElementById(styleId)
    
    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.id = styleId
      document.head.appendChild(styleElement)
    }

    const cursorStyles = cursors.map(cursor => `
      .collaboration-cursor-${cursor.userId} {
        border-left: 2px solid ${cursor.color};
        position: relative;
      }
      .collaboration-cursor-line-${cursor.userId}::before {
        content: '${cursor.user.name}';
        position: absolute;
        top: -20px;
        left: -2px;
        background: ${cursor.color};
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 11px;
        white-space: nowrap;
        z-index: 1000;
        pointer-events: none;
      }
    `).join('\n')

    const selectionStyles = selections.map(selection => `
      .collaboration-selection-${selection.userId} {
        background-color: ${selection.color}33;
        border: 1px solid ${selection.color}66;
      }
    `).join('\n')

    styleElement.textContent = cursorStyles + selectionStyles

  }, [cursors, selections])

  // Connection status indicator
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
      {/* Connection status */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
        <div className={`text-xs ${status.color} flex items-center gap-1`}>
          <div className={`w-2 h-2 rounded-full ${
            status.text === 'Connected' ? 'bg-green-500' :
            status.text === 'Syncing...' || status.text === 'Joining...' ? 'bg-yellow-500' :
            'bg-red-500'
          }`} />
          {status.text}
        </div>
        
        {/* User presence */}
        {users.length > 0 && (
          <UserPresence users={users} currentUserId={userInfo?.id} />
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="absolute top-10 right-2 z-10 bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm max-w-xs">
          Collaboration error: {error}
        </div>
      )}

      {/* Monaco Editor */}
      <Editor
        language={language}
        theme={theme}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          fontSize: 14,
          wordWrap: 'on',
          automaticLayout: true,
          ...editorProps.options
        }}
        {...editorProps}
      />
    </div>
  )
}

export default CollaborativeEditor