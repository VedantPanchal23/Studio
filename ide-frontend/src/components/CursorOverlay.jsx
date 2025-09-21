import React, { useEffect, useState, useRef } from 'react'

/**
 * Cursor overlay component for displaying remote user cursors
 */
const CursorOverlay = ({ cursors, editorRef, monacoRef }) => {
  const [cursorElements, setCursorElements] = useState([])
  const overlayRef = useRef(null)

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !overlayRef.current) {
      return
    }

    const editor = editorRef.current

    // Calculate cursor positions
    const newCursorElements = cursors.map(cursor => {
      try {
        // Get pixel position for the cursor
        const position = editor.getScrolledVisiblePosition({
          lineNumber: cursor.line,
          column: cursor.column
        })

        if (!position) {
          return null
        }

        return {
          id: cursor.userId,
          user: cursor.user,
          color: cursor.color,
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
  }, [cursors, editorRef, monacoRef])

  // Update positions on scroll or resize
  useEffect(() => {
    if (!editorRef.current) return

    const editor = editorRef.current

    const updatePositions = () => {
      // Recalculate positions when editor scrolls or resizes
      const newCursorElements = cursors.map(cursor => {
        try {
          const position = editor.getScrolledVisiblePosition({
            lineNumber: cursor.line,
            column: cursor.column
          })

          if (!position) {
            return null
          }

          return {
            id: cursor.userId,
            user: cursor.user,
            color: cursor.color,
            x: position.left,
            y: position.top,
            line: cursor.line,
            column: cursor.column
          }
        } catch {
          return null
        }
      }).filter(Boolean)

      setCursorElements(newCursorElements)
    }

    const scrollDisposable = editor.onDidScrollChange(updatePositions)
    const layoutDisposable = editor.onDidLayoutChange(updatePositions)

    return () => {
      scrollDisposable.dispose()
      layoutDisposable.dispose()
    }
  }, [cursors, editorRef])

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ overflow: 'hidden' }}
    >
      {cursorElements.map(cursor => (
        <div
          key={cursor.id}
          className="absolute"
          style={{
            left: cursor.x,
            top: cursor.y,
            transform: 'translateX(-1px)'
          }}
        >
          {/* Cursor line */}
          <div
            className="w-0.5 h-5 relative"
            style={{ backgroundColor: cursor.color }}
          >
            {/* User label */}
            <div
              className="absolute -top-6 left-0 text-xs text-white px-2 py-1 rounded whitespace-nowrap"
              style={{ backgroundColor: cursor.color }}
            >
              {cursor.user.name}
            </div>
            
            {/* Cursor flag */}
            <div
              className="absolute -top-1 -left-1 w-3 h-3"
              style={{
                backgroundColor: cursor.color,
                clipPath: 'polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)'
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default CursorOverlay