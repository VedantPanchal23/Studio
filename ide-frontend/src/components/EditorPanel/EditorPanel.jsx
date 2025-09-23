import { useRef, useCallback, useEffect } from 'react'
import { X, Plus, Save, RefreshCw, AlertCircle, FileText } from 'lucide-react'
import Editor from '@monaco-editor/react'
import useEditorStore from '../../stores/editorStore'
import { UnsavedChangesDialog } from '../ui/UnsavedChangesDialog'
import RunButton from './RunButton'
import { monacoLSPIntegration } from './MonacoLSPIntegration'

export function EditorPanel() {
  const { 
    tabs, 
    activeTabId,
    unsavedChangesDialog,
    closeTab, 
    setActiveTab, 
    updateTabContent, 
    saveTab,
    saveAllTabs,
    reloadTab,
    getActiveTab,
    hasUnsavedChanges,
    getUnsavedTabsCount,
    handleDialogSave,
    handleDialogDiscard,
    handleDialogCancel,
    createNewFile
  } = useEditorStore()
  
  const editorRef = useRef(null)
  const activeTab = getActiveTab()

  // Auto-save functionality
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges()) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // LSP document synchronization
  useEffect(() => {
    if (!monacoLSPIntegration.isInitialized || !activeTab) return

    // Open document in LSP when tab becomes active
    if (activeTab.path && activeTab.content !== undefined) {
      monacoLSPIntegration.openDocument(
        activeTab.path, 
        activeTab.content, 
        activeTab.language
      )
    }

    // Cleanup function to close document when tab changes
    return () => {
      if (activeTab.path) {
        monacoLSPIntegration.closeDocument(activeTab.path)
      }
    }
  }, [activeTab?.id, activeTab?.path, activeTab?.language, activeTab])

  // Cleanup LSP integration on unmount
  useEffect(() => {
    return () => {
      if (monacoLSPIntegration.isInitialized) {
        monacoLSPIntegration.dispose()
      }
    }
  }, [])

  const saveFile = useCallback(async () => {
    if (activeTab && activeTab.modified) {
      const success = await saveTab(activeTab.id)
      if (success) {
        console.log(`Saved ${activeTab.name}`)
      }
    }
  }, [activeTab, saveTab])

  const saveAllFiles = useCallback(async () => {
    const savedCount = await saveAllTabs()
    console.log(`Saved ${savedCount} files`)
  }, [saveAllTabs])

  const handleEditorChange = useCallback((value) => {
    if (activeTab && value !== undefined) {
      updateTabContent(activeTab.id, value)
      
      // Update LSP document if integration is initialized
      if (monacoLSPIntegration.isInitialized && activeTab.path) {
        monacoLSPIntegration.updateDocument(activeTab.path, value, activeTab.content)
      }
    }
  }, [activeTab, updateTabContent])

  const handleReloadFile = useCallback(async () => {
    if (activeTab) {
      await reloadTab(activeTab.id)
    }
  }, [activeTab, reloadTab])

  const handleEditorDidMount = useCallback((editor, monaco) => {
    editorRef.current = editor
    
    // Configure Monaco Editor
    monaco.editor.defineTheme('ide-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955' },
        { token: 'keyword', foreground: '569CD6' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'operator', foreground: 'D4D4D4' },
        { token: 'delimiter', foreground: 'D4D4D4' },
        { token: 'type', foreground: '4EC9B0' },
        { token: 'function', foreground: 'DCDCAA' },
        { token: 'variable', foreground: '9CDCFE' },
      ],
      colors: {
        'editor.background': '#0f172a',
        'editor.foreground': '#e2e8f0',
        'editorLineNumber.foreground': '#64748b',
        'editorLineNumber.activeForeground': '#94a3b8',
        'editor.selectionBackground': '#334155',
        'editor.inactiveSelectionBackground': '#1e293b',
        'editor.lineHighlightBackground': '#1e293b',
        'editorCursor.foreground': '#e2e8f0',
        'editorWhitespace.foreground': '#475569',
        'editorIndentGuide.background': '#334155',
        'editorIndentGuide.activeBackground': '#475569',
      }
    })
    
    monaco.editor.setTheme('ide-dark')

    // Initialize LSP integration
    monacoLSPIntegration.initialize(editor, monaco)

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, saveFile)
    
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS, saveAllFiles)
    
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW, () => {
      if (activeTab) {
        closeTab(activeTab.id)
      }
    })

    editor.addCommand(monaco.KeyCode.F5, handleReloadFile)

    // Configure TypeScript/JavaScript language services
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types'],
      strict: false,
      noImplicitAny: false,
      strictNullChecks: false,
      strictFunctionTypes: false,
      noImplicitReturns: false,
      noImplicitThis: false
    })

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types'],
      strict: true,
      noImplicitAny: true,
      strictNullChecks: true,
      strictFunctionTypes: true
    })

    // Disable built-in TypeScript diagnostics to use LSP instead
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: true
    })

    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: true
    })

    // Add keyboard shortcuts for LSP features
    editor.addCommand(monaco.KeyCode.F12, () => {
      editor.getAction('editor.action.revealDefinition')?.run()
    })

    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.F12, () => {
      editor.getAction('editor.action.goToReferences')?.run()
    })

    editor.addCommand(monaco.KeyCode.F2, () => {
      editor.getAction('editor.action.rename')?.run()
    })

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
      editor.getAction('editor.action.triggerSuggest')?.run()
    })

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Space, () => {
      editor.getAction('editor.action.triggerParameterHints')?.run()
    })

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Period, () => {
      editor.getAction('editor.action.quickFix')?.run()
    })

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyO, () => {
      editor.getAction('editor.action.quickOutline')?.run()
    })
  }, [saveFile, saveAllFiles, activeTab, closeTab, handleReloadFile])

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Tab Bar */}
      <div className="flex items-center justify-between bg-slate-800 border-b border-slate-700 min-h-[40px]">
        <div className="flex items-center overflow-x-auto">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`flex items-center space-x-2 px-3 py-2 border-r border-slate-700 cursor-pointer whitespace-nowrap ${
                tab.id === activeTabId ? 'bg-slate-900 text-slate-100' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              onClick={async () => {
                const success = await setActiveTab(tab.id)
                if (!success) {
                  // Tab switch was cancelled due to unsaved changes
                  console.log('Tab switch cancelled')
                }
              }}
            >
              <span className="text-sm">{tab.name}</span>
              {tab.modified && (
                <div 
                  className="w-2 h-2 bg-orange-400 rounded-full" 
                  title="Unsaved changes"
                />
              )}
              <button
                onClick={async (e) => {
                  e.stopPropagation()
                  const success = await closeTab(tab.id)
                  if (!success) {
                    console.log('Tab close cancelled')
                  }
                }}
                className="hover:bg-slate-600 rounded p-0.5"
                title={tab.modified ? 'Close (unsaved changes)' : 'Close'}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button 
            className="p-2 hover:bg-slate-700 text-slate-400 hover:text-slate-200"
            title="New File"
            onClick={() => createNewFile()}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar Buttons */}
        <div className="flex items-center space-x-2 mr-2">
          {/* Run Button */}
          <RunButton />
          
          {/* Save Buttons */}
          {activeTab?.modified && (
            <button
              onClick={saveFile}
              className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
              title="Save File (Ctrl+S)"
            >
              <Save className="w-3 h-3" />
              <span>Save</span>
            </button>
          )}
          {getUnsavedTabsCount() > 1 && (
            <button
              onClick={saveAllFiles}
              className="flex items-center space-x-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
              title="Save All Files (Ctrl+Shift+S)"
            >
              <Save className="w-3 h-3" />
              <span>Save All ({getUnsavedTabsCount()})</span>
            </button>
          )}
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 relative">
        {activeTab ? (
          <Editor
            height="100%"
            language={activeTab.language}
            value={activeTab.content}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              insertSpaces: true,
              wordWrap: 'on',
              contextmenu: true,
              selectOnLineNumbers: true,
              glyphMargin: true,
              folding: true,
              foldingStrategy: 'indentation',
              showFoldingControls: 'always',
              unfoldOnClickAfterEndOfLine: false,
              bracketPairColorization: {
                enabled: true
              },
              // Enhanced LSP-powered IntelliSense
              suggest: {
                enabled: true,
                showKeywords: true,
                showSnippets: true,
                showFunctions: true,
                showConstructors: true,
                showFields: true,
                showVariables: true,
                showClasses: true,
                showStructs: true,
                showInterfaces: true,
                showModules: true,
                showProperties: true,
                showEvents: true,
                showOperators: true,
                showUnits: true,
                showValues: true,
                showConstants: true,
                showEnums: true,
                showEnumMembers: true,
                showColors: true,
                showFiles: true,
                showReferences: true,
                showFolders: true,
                showTypeParameters: true,
                showUsers: true,
                showIssues: true,
                insertMode: 'replace',
                filterGraceful: true,
                snippetsPreventQuickSuggestions: false,
                localityBonus: true,
                shareSuggestSelections: true,
                showStatusBar: true,
                preview: true,
                previewMode: 'prefix'
              },
              quickSuggestions: {
                other: 'on',
                comments: 'off',
                strings: 'on'
              },
              quickSuggestionsDelay: 100,
              suggestOnTriggerCharacters: true,
              acceptSuggestionOnEnter: 'on',
              acceptSuggestionOnCommitCharacter: true,
              // Enhanced parameter hints
              parameterHints: {
                enabled: true,
                cycle: true
              },
              // Enhanced hover
              hover: {
                enabled: true,
                delay: 300,
                sticky: true
              },
              // Enhanced error checking
              lightbulb: {
                enabled: true
              },
              codeActionsOnSave: {
                'source.organizeImports': true
              },
              // Enhanced formatting
              formatOnType: true,
              formatOnPaste: true,
              // Enhanced navigation
              gotoLocation: {
                multipleReferences: 'peek',
                multipleDefinitions: 'peek',
                multipleDeclarations: 'peek',
                multipleImplementations: 'peek',
                multipleTypeDefinitions: 'peek'
              },
              // Enhanced find/replace
              find: {
                seedSearchStringFromSelection: 'always',
                autoFindInSelection: 'multiline',
                globalFindClipboard: true
              },
              // Enhanced diagnostics display
              'semanticHighlighting.enabled': true,
              occurrencesHighlight: true,
              selectionHighlight: true,
              codeLens: true,
              colorDecorators: true,
              // Enhanced scrolling
              smoothScrolling: true,
              cursorSmoothCaretAnimation: true,
              // Enhanced accessibility
              accessibilitySupport: 'auto',
              screenReaderAnnounceInlineSuggestion: true
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-slate-900">
            <div className="text-center">
              <div className="text-4xl mb-4">📁</div>
              <h3 className="text-lg font-medium text-slate-200 mb-2">No File Open</h3>
              <p className="text-slate-400 text-sm mb-4">
                Select a file from the explorer to start editing
              </p>
              <button
                onClick={() => createNewFile()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center space-x-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                <span>New File</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        isOpen={unsavedChangesDialog.isOpen}
        fileName={unsavedChangesDialog.fileName}
        action={unsavedChangesDialog.action}
        onSave={handleDialogSave}
        onDiscard={handleDialogDiscard}
        onCancel={handleDialogCancel}
      />
    </div>
  )
}