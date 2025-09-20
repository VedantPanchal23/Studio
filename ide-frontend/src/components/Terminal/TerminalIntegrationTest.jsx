import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { websocketService } from '../../services/websocket'

export function TerminalIntegrationTest() {
  const terminalRef = useRef(null)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [terminalId] = useState('test-terminal-' + Date.now())

  useEffect(() => {
    if (!terminalRef.current) return

    const terminal = new Terminal({
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      theme: {
        background: '#000000',
        foreground: '#ffffff'
      },
      cursorBlink: true
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)

    terminal.open(terminalRef.current)
    fitAddon.fit()

    terminal.write('Terminal Integration Test\r\n')
    terminal.write('Connecting to WebSocket...\r\n')

    // Test WebSocket connection
    try {
      websocketService.connect()
      
      websocketService.on('connect', () => {
        setConnectionStatus('connected')
        terminal.write('\x1b[32mWebSocket connected successfully!\x1b[0m\r\n')
        terminal.write('Testing terminal creation...\r\n')
        
        // Test terminal creation
        websocketService.emit('terminal:create', {
          terminalId,
          workspaceId: 'test-workspace',
          cols: terminal.cols,
          rows: terminal.rows
        })
      })

      websocketService.on('terminal:created', (data) => {
        if (data.terminalId === terminalId) {
          terminal.write(`\x1b[32mTerminal created! PID: ${data.pid}\x1b[0m\r\n`)
          terminal.write('You can now type commands:\r\n')
          terminal.write('$ ')
        }
      })

      websocketService.on('terminal:output', (data) => {
        if (data.terminalId === terminalId) {
          terminal.write(data.data)
        }
      })

      websocketService.on('terminal:error', (data) => {
        if (data.terminalId === terminalId) {
          terminal.write(`\x1b[31mError: ${data.message}\x1b[0m\r\n`)
        }
      })

      websocketService.on('disconnect', () => {
        setConnectionStatus('disconnected')
        terminal.write('\r\n\x1b[31mWebSocket disconnected\x1b[0m\r\n')
      })

      // Handle terminal input
      terminal.onData((data) => {
        if (connectionStatus === 'connected') {
          websocketService.emit('terminal:input', {
            terminalId,
            input: data
          })
        }
      })

    } catch (error) {
      terminal.write(`\x1b[31mConnection failed: ${error.message}\x1b[0m\r\n`)
    }

    return () => {
      if (terminal) {
        terminal.dispose()
      }
      websocketService.emit('terminal:destroy', { terminalId })
    }
  }, [terminalId, connectionStatus])

  return (
    <div className="h-full flex flex-col bg-black">
      <div className="bg-slate-800 px-2 py-1 text-xs text-slate-300">
        Terminal Integration Test - Status: {connectionStatus}
      </div>
      <div ref={terminalRef} className="flex-1" />
    </div>
  )
}