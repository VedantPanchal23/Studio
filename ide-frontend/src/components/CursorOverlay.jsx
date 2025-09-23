import { useEffect, useState, useRef, useCallback } from 'react'

/**
 * Cursor overlay component for displaying remote user cursors
 */
const CursorOverlay = ({ cursors, editorRef, monacoRef }) => {
  const [cursorElements, setCursorElements] = useState([])
  const overlayRef = useRef(null)
  const updateTimeoutRef = useRef(null)

  // Debounced position calculation
  const calculatePositions = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
    }

    updateTimeoutRef.current = setTimeout(() => {
      if (!editorRef.current || !monacoRef.current || !overlayRef.current || !cursors.length) {
        setCursorElements([])
        return
      }

      const editor = editorRef.current

      // Calculate cursor positions
      const newCursorElements = cursors.map(cursor => {
        try {
          // Validate cursor data
          if (!cursor.line || !cursor.column || !cursor.userId || !cursor.user) {
            return null
          }

          // Get pixel position for the cursor
          const position = editor.getScrolledVisiblePosition({
            lineNumber: cursor.line,
            column: cursor.column
          })

          if (!position) {
            return null
          }

          // Ensure position is within editor bounds
          const editorDom = editor.getDomNode()
          if (!editorDom) return null

          const editorRect = editorDom.getBoundingClientRect()
          const isVisible = position.left >= 0 && 
                           position.top >= 0 && 
                           position.left <= editorRect.width && 
                           position.top <= editorRect.height

          if (!isVisible) return null

          return {
            id: cursor.userId,
            user: cursor.user,
            color: cursor.color || '#007ACC',
            x: position.left,
            y: position.top,
            line: cursor.line,
            column: cursor.column
          }
        } catch (error) {
          console.warn('Failed to calculate cursor position:', error)
          return null
        }
      }).filter(Boolean)

      setCursorElements(newCursorElements)
    }, 16) // ~60fps
  }, [cursors, editorRef, monacoRef])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    calculatePositions()
  }, [calculatePositions])

  // Update positions on scroll or resize
  useEffect(() => {
    if (!editorRef.current) return

    const editor = editorRef.current

    const scrollDisposable = editor.onDidScrollChange(calculatePositions)
    const layoutDisposable = editor.onDidLayoutChange(calculatePositions)

    return () => {
      scrollDisposable.dispose()
      layoutDisposable.dispose()
    }
  }, [calculatePositions, editorRef])

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ overflow: 'hidden' }}
    >
      {cursorElements.map(cursor => (
        <div
          key={cursor.id}
          className="absolute transition-all duration-150 ease-out"
          style={{
            left: cursor.x,
            top: cursor.y,
            transform: 'translateX(-1px)',
            zIndex: 1000
          }}
        >
          {/* Cursor line */}
          <div
            className="w-0.5 h-5 relative animate-pulse"
            style={{ backgroundColor: cursor.color }}
          >
            {/* User label */}
            <div
              className="absolute -top-7 left-0 text-xs text-white px-2 py-1 rounded-md whitespace-nowrap shadow-lg opacity-90 hover:opacity-100 transition-opacity"
              style={{ 
                backgroundColor: cursor.color,
                fontSize: '11px',
                maxWidth: '120px',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
              title={`${cursor.user.name} (Line ${cursor.line}, Column ${cursor.column})`}
            >
              {cursor.user.name}
            </div>
            
            {/* Cursor flag */}
            <div
              className="absolute -top-1 -left-1 w-3 h-3"
              style={{
                backgroundColor: cursor.color,
                clipPath: 'polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default CursorOverlay