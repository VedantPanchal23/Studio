import { useState, useRef } from 'react'
import { Terminal as TerminalIcon, X, Plus, Maximize2, Settings } from 'lucide-react'
import { XTermTerminal } from './XTermTerminal'
import { TerminalTest } from './TerminalTest'

export function Terminal() {
  const [terminalTabs, setTerminalTabs] = useState([
    { id: 1, name: 'Terminal 1', active: true }
  ])
  const [showSettings, setShowSettings] = useState(false)
  const [terminalSettings, setTerminalSettings] = useState({
    fontSize: 14,
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
    theme: 'dark',
    cursorBlink: true,
    scrollback: 1000
  })

  const addTerminal = () => {
    const newId = Math.max(...terminalTabs.map(t => t.id)) + 1
    setTerminalTabs([
      ...terminalTabs.map(t => ({ ...t, active: false })),
      { id: newId, name: `Terminal ${newId}`, active: true }
    ])
  }

  const closeTerminal = (tabId) => {
    const newTabs = terminalTabs.filter(tab => tab.id !== tabId)
    if (newTabs.length > 0 && terminalTabs.find(t => t.id === tabId)?.active) {
      newTabs[0].active = true
    }
    setTerminalTabs(newTabs)
  }

  const setActiveTerminal = (tabId) => {
    setTerminalTabs(terminalTabs.map(tab => ({ ...tab, active: tab.id === tabId })))
  }

  const updateSettings = (newSettings) => {
    setTerminalSettings(prev => ({ ...prev, ...newSettings }))
  }

  const activeTerminal = terminalTabs.find(tab => tab.active)

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Terminal Tab Bar */}
      <div className="flex items-center justify-between bg-slate-800 border-b border-slate-700 min-h-[32px] px-2">
        <div className="flex items-center">
          {terminalTabs.map(tab => (
            <div
              key={tab.id}
              className={`flex items-center space-x-2 px-2 py-1 text-xs cursor-pointer ${
                tab.active ? 'bg-slate-900 text-slate-100' : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => setActiveTerminal(tab.id)}
            >
              <TerminalIcon className="w-3 h-3" />
              <span>{tab.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  closeTerminal(tab.id)
                }}
                className="hover:bg-slate-600 rounded p-0.5"
              >
                <X className="w-2 h-2" />
              </button>
            </div>
          ))}
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={addTerminal}
            className="p-1 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded"
            title="New Terminal"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded"
            title="Terminal Settings"
          >
            <Settings className="w-3 h-3" />
          </button>
          <button
            className="p-1 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded"
            title="Maximize Terminal"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-slate-800 border-b border-slate-700 p-3">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 mb-1">Font Size</label>
              <input
                type="number"
                min="8"
                max="24"
                value={terminalSettings.fontSize}
                onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) })}
                className="w-full bg-slate-700 text-slate-100 px-2 py-1 rounded"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1">Theme</label>
              <select
                value={terminalSettings.theme}
                onChange={(e) => updateSettings({ theme: e.target.value })}
                className="w-full bg-slate-700 text-slate-100 px-2 py-1 rounded"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="high-contrast">High Contrast</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 mb-1">Font Family</label>
              <select
                value={terminalSettings.fontFamily}
                onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                className="w-full bg-slate-700 text-slate-100 px-2 py-1 rounded"
              >
                <option value="Monaco, Menlo, 'Ubuntu Mono', monospace">Monaco</option>
                <option value="'Courier New', monospace">Courier New</option>
                <option value="'Fira Code', monospace">Fira Code</option>
              </select>
            </div>
            <div>
              <label className="flex items-center text-slate-300">
                <input
                  type="checkbox"
                  checked={terminalSettings.cursorBlink}
                  onChange={(e) => updateSettings({ cursorBlink: e.target.checked })}
                  className="mr-2"
                />
                Cursor Blink
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Terminal Content */}
      <div className="flex-1 bg-black">
        {activeTerminal ? (
          <XTermTerminal
            key={activeTerminal.id}
            terminalId={activeTerminal.id}
            settings={terminalSettings}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-500">
              <TerminalIcon className="w-8 h-8 mx-auto mb-2" />
              <p>No terminal sessions</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}