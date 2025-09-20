import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'

export function TerminalTest() {
  const terminalRef = useRef(null)

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

    terminal.write('Hello from xterm.js!\r\n')
    terminal.write('Terminal integration test successful.\r\n')
    terminal.write('$ ')

    return () => {
      terminal.dispose()
    }
  }, [])

  return (
    <div className="h-full bg-black">
      <div ref={terminalRef} className="h-full" />
    </div>
  )
}