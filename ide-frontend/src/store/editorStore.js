import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { FileAPI } from '../services/fileAPI'
import { useWorkspaceStore } from '../stores/workspaceStore'

const useEditorStore = create(
  subscribeWithSelector((set, get) => ({
    tabs: [],
    activeTabId: null,
    loading: false,
    error: null,
    unsavedChanges: new Set(),
    unsavedChangesDialog: {
      isOpen: false,
      fileName: '',
      action: 'close',
      resolve: null
    },

    // Actions

    closeTab: async (tabId) => {
      const { tabs, activeTabId, unsavedChanges } = get()
      const tab = tabs.find(t => t.id === tabId)
      
      // Check for unsaved changes
      if (tab && tab.modified) {
        const result = await get().showUnsavedChangesDialog(tab.name, 'close')
        if (result === 'cancel') {
          return false // Don't close if user cancels
        } else if (result === 'save') {
          const saved = await get().saveTab(tabId)
          if (!saved) {
            return false // Don't close if save failed
          }
        }
        // If result is 'discard', continue with closing
      }
      
      const newTabs = tabs.filter(tab => tab.id !== tabId)
      
      let newActiveTabId = activeTabId
      if (activeTabId === tabId && newTabs.length > 0) {
        // Find the next tab to activate
        const currentIndex = tabs.findIndex(t => t.id === tabId)
        if (currentIndex > 0) {
          newActiveTabId = newTabs[currentIndex - 1].id
        } else {
          newActiveTabId = newTabs[0].id
        }
      } else if (newTabs.length === 0) {
        newActiveTabId = null
      }

      // Remove from unsaved changes
      const newUnsavedChanges = new Set(unsavedChanges)
      newUnsavedChanges.delete(tabId)

      set({ 
        tabs: newTabs,
        activeTabId: newActiveTabId,
        unsavedChanges: newUnsavedChanges
      })
      
      return true
    },

    closeAllTabs: async () => {
      const { tabs } = get()
      const unsavedTabs = tabs.filter(tab => tab.modified)
      
      if (unsavedTabs.length > 0) {
        const shouldSave = window.confirm(`${unsavedTabs.length} files have unsaved changes. Do you want to save all before closing?`)
        if (shouldSave) {
          for (const tab of unsavedTabs) {
            await get().saveTab(tab.id)
          }
        }
      }
      
      set({ 
        tabs: [],
        activeTabId: null,
        unsavedChanges: new Set()
      })
    },



    saveTab: async (tabId) => {
      const { tabs } = get()
      const tab = tabs.find(t => t.id === tabId)
      if (!tab) return false

      const workspaceId = useWorkspaceStore.getState().currentWorkspaceId
      if (!workspaceId) {
        set({ error: 'No workspace selected' })
        return false
      }

      set({ loading: true, error: null })

      try {
        await FileAPI.saveFile(workspaceId, tab.path, tab.content, tab.language)
        
        set(state => {
          const newUnsavedChanges = new Set(state.unsavedChanges)
          newUnsavedChanges.delete(tabId)
          
          return {
            tabs: state.tabs.map(t => 
              t.id === tabId 
                ? { 
                    ...t, 
                    modified: false, 
                    isNew: false, 
                    lastModified: new Date().toISOString(),
                    originalContent: t.content // Update original content after save
                  }
                : t
            ),
            unsavedChanges: newUnsavedChanges,
            loading: false
          }
        })
        
        return true
      } catch (error) {
        console.error('Failed to save file:', error)
        set({ 
          error: `Failed to save ${tab.name}: ${error.message}`,
          loading: false 
        })
        return false
      }
    },

    saveAllTabs: async () => {
      const { tabs } = get()
      const modifiedTabs = tabs.filter(tab => tab.modified)
      
      let savedCount = 0
      for (const tab of modifiedTabs) {
        const success = await get().saveTab(tab.id)
        if (success) savedCount++
      }
      
      return savedCount
    },

    reloadTab: async (tabId) => {
      const { tabs } = get()
      const tab = tabs.find(t => t.id === tabId)
      if (!tab) return

      if (tab.modified) {
        const shouldReload = window.confirm(`${tab.name} has unsaved changes. Do you want to discard them and reload?`)
        if (!shouldReload) return
      }

      const workspaceId = useWorkspaceStore.getState().currentWorkspaceId
      if (!workspaceId) return

      set({ loading: true, error: null })

      try {
        const fileData = await FileAPI.getFile(workspaceId, tab.path)
        
        set(state => {
          const newUnsavedChanges = new Set(state.unsavedChanges)
          newUnsavedChanges.delete(tabId)
          
          return {
            tabs: state.tabs.map(t => 
              t.id === tabId 
                ? { 
                    ...t, 
                    content: fileData.content,
                    modified: false,
                    lastModified: fileData.lastModified
                  }
                : t
            ),
            unsavedChanges: newUnsavedChanges,
            loading: false
          }
        })
      } catch (error) {
        console.error('Failed to reload file:', error)
        set({ 
          error: `Failed to reload ${tab.name}: ${error.message}`,
          loading: false 
        })
      }
    },

    clearError: () => {
      set({ error: null })
    },

    // Utility functions
    getLanguageFromFileName: (fileName) => {
      const extension = fileName.split('.').pop()?.toLowerCase()
      const languageMap = {
        'js': 'javascript',
        'jsx': 'javascript',
        'ts': 'typescript',
        'tsx': 'typescript',
        'css': 'css',
        'scss': 'scss',
        'sass': 'scss',
        'less': 'less',
        'html': 'html',
        'htm': 'html',
        'json': 'json',
        'md': 'markdown',
        'markdown': 'markdown',
        'py': 'python',
        'java': 'java',
        'cpp': 'cpp',
        'cxx': 'cpp',
        'cc': 'cpp',
        'c': 'c',
        'h': 'c',
        'hpp': 'cpp',
        'go': 'go',
        'rs': 'rust',
        'php': 'php',
        'rb': 'ruby',
        'swift': 'swift',
        'kt': 'kotlin',
        'scala': 'scala',
        'sh': 'shell',
        'bash': 'shell',
        'zsh': 'shell',
        'fish': 'shell',
        'bat': 'bat',
        'cmd': 'bat',
        'ps1': 'powershell',
        'yml': 'yaml',
        'yaml': 'yaml',
        'xml': 'xml',
        'sql': 'sql',
        'dockerfile': 'dockerfile'
      }
      return languageMap[extension] || 'plaintext'
    },

    getDefaultContent: (fileName) => {
      const extension = fileName.split('.').pop()?.toLowerCase()
      
      if (fileName === 'package.json') {
        return `{
  "name": "new-project",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {}
}`
      }
      
      if (fileName === 'README.md') {
        return `# ${fileName.replace('.md', '')}

Description of your project.

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`bash
npm start
\`\`\`
`
      }

      if (extension === 'js' || extension === 'jsx') {
        return `// ${fileName}

console.log('Hello from ${fileName}');
`
      }

      if (extension === 'ts' || extension === 'tsx') {
        return `// ${fileName}

console.log('Hello from ${fileName}');
`
      }

      if (extension === 'py') {
        return `# ${fileName}

print("Hello from ${fileName}")
`
      }

      if (extension === 'java') {
        const className = fileName.replace('.java', '')
        return `public class ${className} {
    public static void main(String[] args) {
        System.out.println("Hello from ${fileName}");
    }
}
`
      }

      if (extension === 'html') {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${fileName.replace('.html', '')}</title>
</head>
<body>
    <h1>Hello from ${fileName}</h1>
</body>
</html>
`
      }

      if (extension === 'css') {
        return `/* ${fileName} */

body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
}
`
      }

      return `// ${fileName}
`
    },

    // Getters
    getActiveTab: () => {
      const { tabs, activeTabId } = get()
      return tabs.find(tab => tab.id === activeTabId)
    },

    getTabById: (tabId) => {
      const { tabs } = get()
      return tabs.find(tab => tab.id === tabId)
    },

    hasUnsavedChanges: () => {
      const { unsavedChanges } = get()
      return unsavedChanges.size > 0
    },

    getUnsavedTabsCount: () => {
      const { tabs } = get()
      return tabs.filter(tab => tab.modified).length
    },

    // Enhanced unsaved changes dialog
    showUnsavedChangesDialog: (fileName, action = 'close') => {
      return new Promise((resolve) => {
        set({
          unsavedChangesDialog: {
            isOpen: true,
            fileName,
            action,
            resolve
          }
        })
      })
    },

    // Dialog actions
    handleDialogSave: () => {
      const { unsavedChangesDialog } = get()
      if (unsavedChangesDialog.resolve) {
        unsavedChangesDialog.resolve('save')
      }
      set({
        unsavedChangesDialog: {
          isOpen: false,
          fileName: '',
          action: 'close',
          resolve: null
        }
      })
    },

    handleDialogDiscard: () => {
      const { unsavedChangesDialog } = get()
      if (unsavedChangesDialog.resolve) {
        unsavedChangesDialog.resolve('discard')
      }
      set({
        unsavedChangesDialog: {
          isOpen: false,
          fileName: '',
          action: 'close',
          resolve: null
        }
      })
    },

    handleDialogCancel: () => {
      const { unsavedChangesDialog } = get()
      if (unsavedChangesDialog.resolve) {
        unsavedChangesDialog.resolve('cancel')
      }
      set({
        unsavedChangesDialog: {
          isOpen: false,
          fileName: '',
          action: 'close',
          resolve: null
        }
      })
    },

    // Create new untitled file
    createNewFile: (fileName = null) => {
      const { tabs } = get()
      const timestamp = Date.now()
      const newFileName = fileName || `untitled-${timestamp}.txt`
      const newId = Math.max(...tabs.map(t => t.id), 0) + 1
      
      const newTab = {
        id: newId,
        name: newFileName,
        path: newFileName,
        modified: true,
        language: get().getLanguageFromFileName(newFileName),
        content: get().getDefaultContent(newFileName),
        size: 0,
        lastModified: new Date().toISOString(),
        isNew: true,
        originalContent: ''
      }
      
      set(state => ({
        tabs: [...state.tabs, newTab],
        activeTabId: newId
      }))
      
      return newTab
    },

    // Check if switching tabs with unsaved changes
    setActiveTab: async (tabId) => {
      const { activeTabId, tabs } = get()
      const currentTab = tabs.find(t => t.id === activeTabId)
      
      // If current tab has unsaved changes, warn user
      if (currentTab && currentTab.modified && activeTabId !== tabId) {
        const result = await get().showUnsavedChangesDialog(currentTab.name, 'switch')
        if (result === 'cancel') {
          return false // Don't switch tabs
        } else if (result === 'save') {
          const saved = await get().saveTab(activeTabId)
          if (!saved) {
            return false // Don't switch if save failed
          }
        }
      }
      
      set({ activeTabId: tabId })
      return true
    },

    // Enhanced file opening with conflict detection
    openFile: async (filePath, fileName) => {
      const { tabs, activeTabId } = get()
      
      // Check if file is already open
      const existingTab = tabs.find(tab => tab.path === filePath)
      if (existingTab) {
        await get().setActiveTab(existingTab.id)
        return
      }

      // Check if current tab has unsaved changes
      const currentTab = tabs.find(t => t.id === activeTabId)
      if (currentTab && currentTab.modified) {
        const result = await get().showUnsavedChangesDialog(currentTab.name, 'open')
        if (result === 'cancel') {
          return // Don't open new file
        } else if (result === 'save') {
          const saved = await get().saveTab(activeTabId)
          if (!saved) {
            return // Don't open new file if save failed
          }
        }
      }

      // Get current workspace
      const workspaceId = useWorkspaceStore.getState().currentWorkspaceId
      if (!workspaceId) {
        set({ error: 'No workspace selected' })
        return
      }

      set({ loading: true, error: null })

      try {
        // Load file content from API
        const fileData = await FileAPI.getFile(workspaceId, filePath)
        
        // Create new tab
        const newId = Math.max(...tabs.map(t => t.id), 0) + 1
        const newTab = {
          id: newId,
          name: fileName,
          path: filePath,
          modified: false,
          language: fileData.language || get().getLanguageFromFileName(fileName),
          content: fileData.content || '',
          size: fileData.size || 0,
          lastModified: fileData.lastModified,
          originalContent: fileData.content || '' // Store original content for change detection
        }

        set(state => ({
          tabs: [...state.tabs, newTab],
          activeTabId: newId,
          loading: false
        }))
      } catch (error) {
        console.error('Failed to load file:', error)
        
        // Create tab with empty content if file doesn't exist or failed to load
        const newId = Math.max(...tabs.map(t => t.id), 0) + 1
        const newTab = {
          id: newId,
          name: fileName,
          path: filePath,
          modified: false,
          language: get().getLanguageFromFileName(fileName),
          content: get().getDefaultContent(fileName),
          size: 0,
          lastModified: new Date().toISOString(),
          isNew: true, // Mark as new file
          originalContent: get().getDefaultContent(fileName)
        }

        set(state => ({
          tabs: [...state.tabs, newTab],
          activeTabId: newId,
          loading: false,
          error: `Failed to load file: ${error.message}`
        }))
      }
    },

    // Enhanced content update with better change detection
    updateTabContent: (tabId, content) => {
      set(state => {
        const tab = state.tabs.find(t => t.id === tabId)
        if (!tab) return state
        
        // Check if content actually changed from original
        const hasChanges = content !== (tab.originalContent || '')
        const newUnsavedChanges = new Set(state.unsavedChanges)
        
        if (hasChanges) {
          newUnsavedChanges.add(tabId)
        } else {
          newUnsavedChanges.delete(tabId)
        }
        
        return {
          tabs: state.tabs.map(t => 
            t.id === tabId 
              ? { ...t, content, modified: hasChanges }
              : t
          ),
          unsavedChanges: newUnsavedChanges
        }
      })
    }
  }))
)

export default useEditorStore