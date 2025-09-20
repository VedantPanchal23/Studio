import { useState, useRef } from 'react'
import { Terminal as TerminalIcon, X, Plus, Maximize2, Settings } from 'lucide-react'
import { XTermTerminal } from './XTermTerminal'
import { TerminalTest } from './TerminalTest'
import styles from './Terminal.module.css'

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
    <div className={styles.terminal}>
      {/* Terminal Tab Bar */}
      <div className={styles.tabBar}>
        <div className={styles.tabList}>
          {terminalTabs.map(tab => (
            <div
              key={tab.id}
              className={`${styles.tab} ${tab.active ? styles.tabActive : ''}`}
              onClick={() => setActiveTerminal(tab.id)}
            >
              <TerminalIcon className={styles.tabIcon} />
              <span>{tab.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  closeTerminal(tab.id)
                }}
                className={styles.closeButton}
              >
                <X className={styles.closeIcon} />
              </button>
            </div>
          ))}
        </div>
        
        <div className={styles.actions}>
          <button
            onClick={addTerminal}
            className={styles.actionButton}
            title="New Terminal"
          >
            <Plus className={styles.actionIcon} />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={styles.actionButton}
            title="Terminal Settings"
          >
            <Settings className={styles.actionIcon} />
          </button>
          <button
            className={styles.actionButton}
            title="Maximize Terminal"
          >
            <Maximize2 className={styles.actionIcon} />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className={styles.settings}>
          <div className={styles.settingsGrid}>
            <div className={styles.settingsGroup}>
              <label className={styles.settingsLabel}>Font Size</label>
              <input
                type="number"
                min="8"
                max="24"
                value={terminalSettings.fontSize}
                onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) })}
                className={styles.settingsInput}
              />
            </div>
            <div className={styles.settingsGroup}>
              <label className={styles.settingsLabel}>Theme</label>
              <select
                value={terminalSettings.theme}
                onChange={(e) => updateSettings({ theme: e.target.value })}
                className={styles.settingsSelect}
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="high-contrast">High Contrast</option>
              </select>
            </div>
            <div className={styles.settingsGroup}>
              <label className={styles.settingsLabel}>Font Family</label>
              <select
                value={terminalSettings.fontFamily}
                onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                className={styles.settingsSelect}
              >
                <option value="Monaco, Menlo, 'Ubuntu Mono', monospace">Monaco</option>
                <option value="'Courier New', monospace">Courier New</option>
                <option value="'Fira Code', monospace">Fira Code</option>
              </select>
            </div>
            <div className={styles.settingsGroup}>
              <label className={styles.settingsLabel}>
                <input
                  type="checkbox"
                  checked={terminalSettings.cursorBlink}
                  onChange={(e) => updateSettings({ cursorBlink: e.target.checked })}
                  style={{ marginRight: '0.5rem' }}
                />
                Cursor Blink
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Terminal Content */}
      <div className={styles.content}>
        {activeTerminal ? (
          <XTermTerminal
            key={activeTerminal.id}
            terminalId={activeTerminal.id}
            settings={terminalSettings}
          />
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyMessage}>
              <TerminalIcon className={styles.emptyIcon} />
              <p>No terminal sessions</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}