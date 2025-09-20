import { useState, useEffect } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import ActivityBar from '../ActivityBar/ActivityBar'
import Sidebar from '../Sidebar/Sidebar'
import EditorArea from '../EditorArea/EditorArea'
import { Terminal } from '../Terminal/Terminal'
import StatusBar from '../StatusBar/StatusBar'
import CodeExecution from '../CodeExecution'
import useEditorStore from '../../store/editorStore'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import './IDELayout.css'

export function IDELayout() {
  const [activeView, setActiveView] = useState('explorer')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isPanelVisible, setIsPanelVisible] = useState(true)
  const [activeBottomTab, setActiveBottomTab] = useState('terminal')
  const { openFile } = useEditorStore()
  const { currentWorkspaceId } = useWorkspaceStore()

  // Set dark theme by default
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
  }, [])

  // For development mode, use a simple workspace initialization
  useEffect(() => {
    // In development mode with auth disabled, always use an existing test workspace
    if (import.meta.env.VITE_DISABLE_AUTH === 'true') {
      // Clear any cached workspace data that might have the old demo workspace ID
      try {
        localStorage.removeItem('workspace-store'); // Clear the entire cache for clean start
        localStorage.removeItem('file-store'); // Also clear file store cache if it exists
      } catch (e) {
        console.warn('Could not clear workspace cache:', e);
      }
      
      // Set the test workspace
      useWorkspaceStore.getState().setCurrentWorkspace('test-workspace-123');
    } else if (!currentWorkspaceId) {
      // Only set default in non-dev mode if no workspace is set
      useWorkspaceStore.getState().setCurrentWorkspace('test-workspace-123');
    }
  }, []) // Remove currentWorkspaceId dependency to run only once

  const handleFileOpen = (filePath, fileName) => {
    openFile(filePath, fileName)
  }

  const handleViewChange = (view) => {
    if (view === activeView && !isSidebarCollapsed) {
      setIsSidebarCollapsed(true)
    } else {
      setActiveView(view)
      setIsSidebarCollapsed(false)
    }
  }

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
  }

  const togglePanel = () => {
    setIsPanelVisible(!isPanelVisible)
  }

  return (
    <div className="vscode-layout">
      {/* Activity Bar */}
      <ActivityBar
        activeView={activeView}
        onViewChange={handleViewChange}
      />

      {/* Main Content Area */}
      <div className="vscode-main">
        <PanelGroup direction="horizontal">
          {/* Sidebar */}
          {!isSidebarCollapsed && (
            <>
              <Panel
                defaultSize={25}
                minSize={15}
                maxSize={50}
                className="sidebar-panel"
              >
                <Sidebar
                  activeView={activeView}
                  workspaceId={currentWorkspaceId}
                  onFileOpen={handleFileOpen}
                  isCollapsed={isSidebarCollapsed}
                  onToggleCollapse={toggleSidebar}
                />
              </Panel>
              <PanelResizeHandle className="panel-resize-handle" />
            </>
          )}

          {/* Editor and Bottom Panel Area */}
          <Panel defaultSize={isSidebarCollapsed ? 100 : 75} minSize={30}>
            <PanelGroup direction="vertical">
              {/* Editor Area */}
              <Panel
                defaultSize={isPanelVisible ? 70 : 100}
                minSize={30}
                className="editor-panel"
              >
                <EditorArea />
              </Panel>

              {/* Bottom Panel */}
              {isPanelVisible && (
                <>
                  <PanelResizeHandle className="panel-resize-handle horizontal" />
                  <Panel
                    defaultSize={30}
                    minSize={20}
                    maxSize={70}
                    className="bottom-panel"
                  >
                    <div className="panel-container">
                      {/* Panel Tabs */}
                      <div className="panel-tabs">
                        <button
                          className={`panel-tab ${activeBottomTab === 'terminal' ? 'panel-tab--active' : ''
                            }`}
                          onClick={() => setActiveBottomTab('terminal')}
                        >
                          Terminal
                        </button>
                        <button
                          className={`panel-tab ${activeBottomTab === 'output' ? 'panel-tab--active' : ''
                            }`}
                          onClick={() => setActiveBottomTab('output')}
                        >
                          Output
                        </button>
                        <button
                          className={`panel-tab ${activeBottomTab === 'problems' ? 'panel-tab--active' : ''
                            }`}
                          onClick={() => setActiveBottomTab('problems')}
                        >
                          Problems
                        </button>

                        {/* Panel Controls */}
                        <div className="panel-controls">
                          <button
                            className="panel-control-btn"
                            onClick={togglePanel}
                            title="Close Panel"
                          >
                            ×
                          </button>
                        </div>
                      </div>

                      {/* Panel Content */}
                      <div className="panel-content">
                        {activeBottomTab === 'terminal' && <Terminal />}
                        {activeBottomTab === 'output' && <CodeExecution />}
                        {activeBottomTab === 'problems' && (
                          <div style={{ padding: '16px', color: 'var(--vscode-foreground)' }}>
                            <p>No problems detected in the workspace.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Panel>
                </>
              )}
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>

      {/* Status Bar */}
      <StatusBar />
    </div>
  )
}