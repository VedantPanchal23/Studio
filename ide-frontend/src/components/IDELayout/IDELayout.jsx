import { useState, useEffect } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import ActivityBar from '../ActivityBar/ActivityBar'
import Sidebar from '../Sidebar/Sidebar'
import EditorArea from '../EditorArea/EditorArea'
import { Terminal } from '../Terminal/Terminal'
import StatusBar from '../StatusBar/StatusBar'
import CodeExecution from '../CodeExecution'
import useEditorStore from '../../stores/editorStore'
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

  // Handle workspace initialization
  useEffect(() => {
    // Check if workspace ID is provided in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const workspaceIdFromUrl = urlParams.get('workspace');
    
    if (workspaceIdFromUrl && workspaceIdFromUrl !== currentWorkspaceId) {
      // Set workspace from URL parameter
      console.log('Setting workspace from URL:', workspaceIdFromUrl);
      useWorkspaceStore.getState().setCurrentWorkspace(workspaceIdFromUrl);
    } else if (!currentWorkspaceId && !workspaceIdFromUrl) {
      // No workspace set and no URL parameter, redirect to workspace manager
      console.log('No workspace set: redirecting to workspace manager');
      window.location.href = '/workspaces';
      return;
    }
  }, [currentWorkspaceId])

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