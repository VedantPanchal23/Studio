import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { FileAPI } from '../services/fileAPI'
import { useWorkspaceStore } from './workspaceStore'

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
      
      set({
        tabs: newTabs,
        activeTabId: newActiveTabId
      })
      
      // Clear unsaved changes
      const newUnsavedChanges = new Set(unsavedChanges)
      newUnsavedChanges.delete(tabId)
      set({ unsavedChanges: newUnsavedChanges })
      
      return true
    },

    openFile: async (filePath, fileName) => {
      const { tabs, setActiveTab } = get()
      
      // Check if file is already open
      const existingTab = tabs.find(tab => tab.filePath === filePath)
      if (existingTab) {
        setActiveTab(existingTab.id)
        return
      }

      try {
        set({ loading: true, error: null })
        
        // Get current workspace
        const { currentWorkspaceId } = useWorkspaceStore.getState()
        if (!currentWorkspaceId) {
          throw new Error('No workspace selected')
        }

        // Load file content
        const response = await FileAPI.getFileContent(currentWorkspaceId, filePath)
        const content = response.data.content

        // Create new tab
        const tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const newTab = {
          id: tabId,
          name: fileName,
          filePath: filePath,
          content: content,
          originalContent: content,
          modified: false,
          language: getLanguageFromFileName(fileName),
          readOnly: false
        }

        set({
          tabs: [...tabs, newTab],
          activeTabId: tabId,
          loading: false
        })

      } catch (error) {
        console.error('Failed to open file:', error)
        set({
          error: error.message || 'Failed to open file',
          loading: false
        })
      }
    },

    setActiveTab: (tabId) => {
      set({ activeTabId: tabId })
    },

    updateTabContent: (tabId, content) => {
      const { tabs, unsavedChanges } = get()
      const updatedTabs = tabs.map(tab => {
        if (tab.id === tabId) {
          const modified = content !== tab.originalContent
          return { ...tab, content, modified }
        }
        return tab
      })
      
      // Update unsaved changes tracking
      const newUnsavedChanges = new Set(unsavedChanges)
      const tab = tabs.find(t => t.id === tabId)
      if (tab && content !== tab.originalContent) {
        newUnsavedChanges.add(tabId)
      } else {
        newUnsavedChanges.delete(tabId)
      }
      
      set({
        tabs: updatedTabs,
        unsavedChanges: newUnsavedChanges
      })
    },

    saveTab: async (tabId) => {
      const { tabs } = get()
      const tab = tabs.find(t => t.id === tabId)
      
      if (!tab) {
        console.error('Tab not found:', tabId)
        return false
      }

      try {
        set({ loading: true, error: null })
        
        // Get current workspace
        const { currentWorkspaceId } = useWorkspaceStore.getState()
        if (!currentWorkspaceId) {
          throw new Error('No workspace selected')
        }

        // Save file content
        await FileAPI.saveFile(currentWorkspaceId, tab.filePath, tab.content)

        // Update tab to mark as saved
        const updatedTabs = tabs.map(t => {
          if (t.id === tabId) {
            return { ...t, originalContent: t.content, modified: false }
          }
          return t
        })

        // Remove from unsaved changes
        const { unsavedChanges } = get()
        const newUnsavedChanges = new Set(unsavedChanges)
        newUnsavedChanges.delete(tabId)

        set({
          tabs: updatedTabs,
          unsavedChanges: newUnsavedChanges,
          loading: false
        })

        return true

      } catch (error) {
        console.error('Failed to save file:', error)
        set({
          error: error.message || 'Failed to save file',
          loading: false
        })
        return false
      }
    },

    saveAllTabs: async () => {
      const { tabs } = get()
      const modifiedTabs = tabs.filter(tab => tab.modified)
      
      let allSaved = true
      for (const tab of modifiedTabs) {
        const saved = await get().saveTab(tab.id)
        if (!saved) {
          allSaved = false
        }
      }
      
      return allSaved
    },

    revertTab: (tabId) => {
      const { tabs, unsavedChanges } = get()
      const updatedTabs = tabs.map(tab => {
        if (tab.id === tabId) {
          return { ...tab, content: tab.originalContent, modified: false }
        }
        return tab
      })
      
      // Remove from unsaved changes
      const newUnsavedChanges = new Set(unsavedChanges)
      newUnsavedChanges.delete(tabId)
      
      set({
        tabs: updatedTabs,
        unsavedChanges: newUnsavedChanges
      })
    },

    closeAllTabs: async () => {
      const { tabs } = get()
      
      // Check for unsaved changes
      const modifiedTabs = tabs.filter(tab => tab.modified)
      if (modifiedTabs.length > 0) {
        const result = await get().showUnsavedChangesDialog(
          `${modifiedTabs.length} file(s)`, 
          'closeAll'
        )
        
        if (result === 'cancel') {
          return false
        } else if (result === 'save') {
          const allSaved = await get().saveAllTabs()
          if (!allSaved) {
            return false
          }
        }
      }
      
      set({
        tabs: [],
        activeTabId: null,
        unsavedChanges: new Set()
      })
      
      return true
    },

    showUnsavedChangesDialog: (fileName, action) => {
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

    hideUnsavedChangesDialog: () => {
      set({
        unsavedChangesDialog: {
          isOpen: false,
          fileName: '',
          action: 'close',
          resolve: null
        }
      })
    },

    resolveUnsavedChangesDialog: (result) => {
      const { unsavedChangesDialog } = get()
      if (unsavedChangesDialog.resolve) {
        unsavedChangesDialog.resolve(result)
      }
      get().hideUnsavedChangesDialog()
    },

    // Getters
    getActiveTab: () => {
      const { tabs, activeTabId } = get()
      return tabs.find(tab => tab.id === activeTabId) || null
    },

    getTab: (tabId) => {
      const { tabs } = get()
      return tabs.find(tab => tab.id === tabId) || null
    },

    hasUnsavedChanges: () => {
      const { unsavedChanges } = get()
      return unsavedChanges.size > 0
    },

    // Clear all state
    clearAll: () => {
      set({
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
        }
      })
    }
  }))
)

// Helper function to determine language from file extension
function getLanguageFromFileName(fileName) {
  const extension = fileName.split('.').pop()?.toLowerCase()
  
  const languageMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'cc': 'cpp',
    'cxx': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    'ini': 'ini',
    'cfg': 'ini',
    'conf': 'ini',
    'md': 'markdown',
    'markdown': 'markdown',
    'txt': 'plaintext',
    'log': 'plaintext',
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'fish': 'shell',
    'ps1': 'powershell',
    'psm1': 'powershell',
    'psd1': 'powershell',
    'bat': 'batch',
    'cmd': 'batch',
    'dockerfile': 'dockerfile',
    'sql': 'sql',
    'r': 'r',
    'R': 'r',
    'lua': 'lua',
    'perl': 'perl',
    'pl': 'perl',
    'vim': 'vim',
    'tex': 'latex',
    'ltx': 'latex'
  }
  
  return languageMap[extension] || 'plaintext'
}

export default useEditorStore