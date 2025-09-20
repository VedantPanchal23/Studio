import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { SearchAddon } from '@xterm/addon-search'
import { websocketService } from '../../services/websocket'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import '@xterm/xterm/css/xterm.css'

export function XTermTerminal({ terminalId, settings }) {
  const terminalRef = useRef(null)
  const terminalInstance = useRef(null)
  const fitAddon = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const { currentWorkspaceId } = useWorkspaceStore()

  // Terminal themes
  const themes = {
    dark: {
      background: '#000000',
      foreground: '#ffffff',
      cursor: '#ffffff',
      cursorAccent: '#000000',
      selection: '#ffffff40',
      black: '#000000',
      red: '#cd3131',
      green: '#0dbc79',
      yellow: '#e5e510',
      blue: '#2472c8',
      magenta: '#bc3fbc',
      cyan: '#11a8cd',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#e5e5e5'
    },
    light: {
      background: '#ffffff',
      foreground: '#000000',
      cursor: '#000000',
      cursorAccent: '#ffffff',
      selection: '#00000040',
      black: '#000000',
      red: '#cd3131',
      green: '#00bc00',
      yellow: '#949800',
      blue: '#0451a5',
      magenta: '#bc05bc',
      cyan: '#0598bc',
      white: '#555555',
      brightBlack: '#666666',
      brightRed: '#cd3131',
      brightGreen: '#14ce14',
      brightYellow: '#b5ba00',
      brightBlue: '#0451a5',
      brightMagenta: '#bc05bc',
      brightCyan: '#0598bc',
      brightWhite: '#a5a5a5'
    },
    'high-contrast': {
      background: '#000000',
      foreground: '#ffffff',
      cursor: '#ffffff',
      cursorAccent: '#000000',
      selection: '#ffffff80',
      black: '#000000',
      red: '#ff0000',
      green: '#00ff00',
      yellow: '#ffff00',
      blue: '#0000ff',
      magenta: '#ff00ff',
      cyan: '#00ffff',
      white: '#ffffff',
      brightBlack: '#808080',
      brightRed: '#ff0000',
      brightGreen: '#00ff00',
      brightYellow: '#ffff00',
      brightBlue: '#0000ff',
      brightMagenta: '#ff00ff',
      brightCyan: '#00ffff',
      brightWhite: '#ffffff'
    }
  }

  useEffect(() => {
    if (!terminalRef.current) return

    // Initialize terminal
    const terminal = new Terminal({
      fontSize: settings.fontSize,
      fontFamily: settings.fontFamily,
      theme: themes[settings.theme] || themes.dark,
      cursorBlink: settings.cursorBlink,
      scrollback: settings.scrollback,
      allowTransparency: true,
      convertEol: true,
      disableStdin: false,
      rows: 24,
      cols: 80
    })

    // Initialize addons
    const fit = new FitAddon()
    const webLinks = new WebLinksAddon()
    const search = new SearchAddon()

    terminal.loadAddon(fit)
    terminal.loadAddon(webLinks)
    terminal.loadAddon(search)

    // Open terminal in DOM
    terminal.open(terminalRef.current)
    fit.fit()

    // Store references
    terminalInstance.current = terminal
    fitAddon.current = fit

    // Connect to WebSocket
    connectToWebSocket(terminal)

    // Handle terminal input
    terminal.onData((data) => {
      if (isConnected) {
        websocketService.emit('terminal:input', {
          terminalId,
          input: data
        })
      }
    })

    // Handle terminal resize
    terminal.onResize(({ cols, rows }) => {
      if (isConnected) {
        websocketService.emit('terminal:resize', {
          terminalId,
          cols,
          rows
        })
      }
    })

    // Handle window resize
    const handleResize = () => {
      if (fit) {
        fit.fit()
      }
    }

    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      if (terminal) {
        terminal.dispose()
      }
      disconnectFromWebSocket()
    }
  }, [terminalId])

  // Update terminal settings when they change
  useEffect(() => {
    if (terminalInstance.current) {
      terminalInstance.current.options.fontSize = settings.fontSize
      terminalInstance.current.options.fontFamily = settings.fontFamily
      terminalInstance.current.options.theme = themes[settings.theme] || themes.dark
      terminalInstance.current.options.cursorBlink = settings.cursorBlink
      
      // Fit terminal after settings change
      if (fitAddon.current) {
        setTimeout(() => fitAddon.current.fit(), 0)
      }
    }
  }, [settings])

  const connectToWebSocket = (terminal) => {
    try {
      setConnectionStatus('connecting')
      
      // Connect to WebSocket service
      websocketService.connect()

      // Listen for terminal output
      websocketService.on('terminal:output', (data) => {
        if (data.terminalId === terminalId && terminal) {
          terminal.write(data.data)
        }
      })

      // Listen for terminal creation confirmation
      websocketService.on('terminal:created', (data) => {
        if (data.terminalId === terminalId) {
          terminal.write(`\x1b[32mTerminal session created (PID: ${data.pid})\x1b[0m\r\n`)
        }
      })

      // Listen for terminal errors
      websocketService.on('terminal:error', (data) => {
        if (data.terminalId === terminalId && terminal) {
          terminal.write(`\r\n\x1b[31mError: ${data.message}\x1b[0m\r\n`)
        }
      })

      // Listen for connection status
      websocketService.on('connect', () => {
        setIsConnected(true)
        setConnectionStatus('connected')
        
        // Initialize terminal session with workspace ID
        websocketService.emit('terminal:create', {
          terminalId,
          workspaceId: currentWorkspaceId || 'demo-workspace-id',
          cols: terminal.cols,
          rows: terminal.rows,
          shell: navigator.platform.includes('Win') ? 'cmd.exe' : '/bin/bash'
        })
        
        terminal.write('\x1b[32mConnecting to terminal...\x1b[0m\r\n')
      })

      websocketService.on('disconnect', () => {
        setIsConnected(false)
        setConnectionStatus('disconnected')
        terminal.write('\r\n\x1b[31mTerminal disconnected\x1b[0m\r\n')
      })

      websocketService.on('reconnect', () => {
        setIsConnected(true)
        setConnectionStatus('connected')
        terminal.write('\r\n\x1b[32mTerminal reconnected\x1b[0m\r\n')
      })

    } catch (error) {
      console.error('Failed to connect to WebSocket:', error)
      setConnectionStatus('error')
      terminal.write(`\r\n\x1b[31mConnection failed: ${error.message}\x1b[0m\r\n`)
    }
  }

  const disconnectFromWebSocket = () => {
    if (isConnected) {
      websocketService.emit('terminal:destroy', { terminalId })
    }
    websocketService.disconnect()
  }

  // Connection status indicator
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500'
      case 'connecting': return 'bg-yellow-500'
      case 'disconnected': return 'bg-red-500'
      case 'error': return 'bg-red-600'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Connection Status */}
      <div className="flex items-center justify-between bg-slate-800 px-2 py-1 text-xs">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
          <span className="text-slate-300 capitalize">{connectionStatus}</span>
        </div>
        <div className="text-slate-400">
          Terminal {terminalId}
        </div>
      </div>
      
      {/* Terminal Container */}
      <div 
        ref={terminalRef} 
        className="flex-1 p-2"
        style={{ 
          backgroundColor: themes[settings.theme]?.background || '#000000'
        }}
      />
    </div>
  )
}