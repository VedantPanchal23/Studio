import { useState, useEffect } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { FileExplorer } from '../FileExplorer/FileExplorer'
import { EditorPanel } from '../EditorPanel/EditorPanel'
import { Terminal } from '../Terminal/Terminal'
import CodeExecution from '../CodeExecution'
import { Header } from '../Header/Header'
import useEditorStore from '../../store/editorStore'
import { useWorkspaceStore } from '../../stores/workspaceStore'

export function IDELayout() {
  const [isMobile, setIsMobile] = useState(false)
  const [activeBottomTab, setActiveBottomTab] = useState('terminal')
  const { openFile } = useEditorStore()
  const { currentWorkspaceId } = useWorkspaceStore()

  // For demo purposes, set a default workspace ID if none exists
  useEffect(() => {
    if (!currentWorkspaceId) {
      // This would normally come from authentication/workspace selection
      useWorkspaceStore.getState().setCurrentWorkspace('demo-workspace-id');
    }
  }, [currentWorkspaceId]);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const handleFileOpen = (filePath, fileName) => {
    openFile(filePath, fileName)
  }

  if (isMobile) {
    // Mobile layout - stacked vertically
    return (
      <div className="h-screen flex flex-col bg-slate-900 text-slate-100">
        <Header />
        <div className="flex-1 overflow-hidden">
          <PanelGroup direction="vertical">
            <Panel defaultSize={25} minSize={20} maxSize={40}>
              <div className="h-full border-b border-slate-700">
                <FileExplorer onFileOpen={handleFileOpen} workspaceId={currentWorkspaceId} />
              </div>
            </Panel>
            
            <PanelResizeHandle className="h-1 bg-slate-700 hover:bg-slate-600 transition-colors" />
            
            <Panel defaultSize={50} minSize={30}>
              <div className="h-full">
                <EditorPanel />
              </div>
            </Panel>
            
            <PanelResizeHandle className="h-1 bg-slate-700 hover:bg-slate-600 transition-colors" />
            
            <Panel defaultSize={25} minSize={20} maxSize={40}>
              <div className="h-full border-t border-slate-700">
                {/* Bottom Panel Tabs */}
                <div className="flex border-b border-slate-700 bg-slate-800">
                  <button
                    className={`px-4 py-2 text-sm font-medium ${
                      activeBottomTab === 'terminal'
                        ? 'bg-slate-900 text-slate-100 border-b-2 border-blue-500'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    onClick={() => setActiveBottomTab('terminal')}
                  >
                    Terminal
                  </button>
                  <button
                    className={`px-4 py-2 text-sm font-medium ${
                      activeBottomTab === 'execution'
                        ? 'bg-slate-900 text-slate-100 border-b-2 border-blue-500'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    onClick={() => setActiveBottomTab('execution')}
                  >
                    Output
                  </button>
                </div>
                
                {/* Bottom Panel Content */}
                <div className="h-full">
                  {activeBottomTab === 'terminal' ? <Terminal /> : <CodeExecution />}
                </div>
              </div>
            </Panel>
          </PanelGroup>
        </div>
      </div>
    )
  }

  // Desktop layout - horizontal with nested vertical
  return (
    <div className="h-screen flex flex-col bg-slate-900 text-slate-100">
      {/* Header */}
      <Header />
      
      {/* Main IDE Content */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          {/* Sidebar - File Explorer */}
          <Panel defaultSize={20} minSize={15} maxSize={40}>
            <div className="h-full border-r border-slate-700">
              <FileExplorer onFileOpen={handleFileOpen} workspaceId={currentWorkspaceId} />
            </div>
          </Panel>
          
          <PanelResizeHandle className="w-1 bg-slate-700 hover:bg-slate-600 transition-colors" />
          
          {/* Main Content Area */}
          <Panel defaultSize={80} minSize={50}>
            <PanelGroup direction="vertical">
              {/* Editor Area */}
              <Panel defaultSize={70} minSize={30}>
                <div className="h-full">
                  <EditorPanel />
                </div>
              </Panel>
              
              <PanelResizeHandle className="h-1 bg-slate-700 hover:bg-slate-600 transition-colors" />
              
              {/* Bottom Panel Area */}
              <Panel defaultSize={30} minSize={20} maxSize={50}>
                <div className="h-full border-t border-slate-700">
                  {/* Bottom Panel Tabs */}
                  <div className="flex border-b border-slate-700 bg-slate-800">
                    <button
                      className={`px-4 py-2 text-sm font-medium ${
                        activeBottomTab === 'terminal'
                          ? 'bg-slate-900 text-slate-100 border-b-2 border-blue-500'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      onClick={() => setActiveBottomTab('terminal')}
                    >
                      Terminal
                    </button>
                    <button
                      className={`px-4 py-2 text-sm font-medium ${
                        activeBottomTab === 'execution'
                          ? 'bg-slate-900 text-slate-100 border-b-2 border-blue-500'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      onClick={() => setActiveBottomTab('execution')}
                    >
                      Output
                    </button>
                  </div>
                  
                  {/* Bottom Panel Content */}
                  <div className="h-full">
                    {activeBottomTab === 'terminal' ? <Terminal /> : <CodeExecution />}
                  </div>
                </div>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  )
}