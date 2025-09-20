import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { FileAPI } from '../services/fileAPI';

/**
 * File store for managing workspace files and directories
 */
export const useFileStore = create(
  subscribeWithSelector((set, get) => ({
    // State
    currentWorkspaceId: null,
    files: [],
    expandedFolders: new Set(),
    selectedFile: null,
    loading: false,
    error: null,
    searchQuery: '',
    sortBy: 'name',
    sortOrder: 'asc',
    showHiddenFiles: false,
    
    // File tree cache for performance
    fileTreeCache: new Map(),
    
    // Actions
    setCurrentWorkspace: (workspaceId) => {
      set({ 
        currentWorkspaceId: workspaceId,
        files: [],
        selectedFile: null,
        error: null
      });
    },

    loadFiles: async (path = '') => {
      const { currentWorkspaceId } = get();
      if (!currentWorkspaceId) return;

      set({ loading: true, error: null });
      
      try {
        const result = await FileAPI.listFiles(currentWorkspaceId, path);
        const sortedFiles = FileAPI.sortFiles(result.files, get().sortBy, get().sortOrder);
        
        set({ 
          files: sortedFiles,
          loading: false 
        });
        
        // Cache the result
        get().fileTreeCache.set(path, sortedFiles);
        
      } catch (error) {
        set({ 
          error: error.message,
          loading: false 
        });
      }
    },

    refreshFiles: async () => {
      const { currentWorkspaceId } = get();
      if (!currentWorkspaceId) return;
      
      // Clear cache and reload
      get().fileTreeCache.clear();
      await get().loadFiles();
    },

    createFile: async (path, content = '') => {
      const { currentWorkspaceId } = get();
      if (!currentWorkspaceId) return;

      set({ loading: true, error: null });
      
      try {
        await FileAPI.createItem(currentWorkspaceId, path, 'file', content);
        await get().refreshFiles();
        set({ loading: false });
        return true;
      } catch (error) {
        set({ 
          error: error.message,
          loading: false 
        });
        return false;
      }
    },

    createDirectory: async (path) => {
      const { currentWorkspaceId } = get();
      if (!currentWorkspaceId) return;

      set({ loading: true, error: null });
      
      try {
        await FileAPI.createItem(currentWorkspaceId, path, 'directory');
        await get().refreshFiles();
        set({ loading: false });
        return true;
      } catch (error) {
        set({ 
          error: error.message,
          loading: false 
        });
        return false;
      }
    },

    deleteItem: async (path) => {
      const { currentWorkspaceId } = get();
      if (!currentWorkspaceId) return;

      set({ loading: true, error: null });
      
      try {
        await FileAPI.deleteItem(currentWorkspaceId, path);
        
        // If deleted item was selected, clear selection
        if (get().selectedFile === path) {
          set({ selectedFile: null });
        }
        
        await get().refreshFiles();
        set({ loading: false });
        return true;
      } catch (error) {
        set({ 
          error: error.message,
          loading: false 
        });
        return false;
      }
    },

    renameItem: async (oldPath, newPath) => {
      const { currentWorkspaceId } = get();
      if (!currentWorkspaceId) return;

      set({ loading: true, error: null });
      
      try {
        await FileAPI.moveItem(currentWorkspaceId, oldPath, newPath);
        
        // Update selected file if it was renamed
        if (get().selectedFile === oldPath) {
          set({ selectedFile: newPath });
        }
        
        await get().refreshFiles();
        set({ loading: false });
        return true;
      } catch (error) {
        set({ 
          error: error.message,
          loading: false 
        });
        return false;
      }
    },

    copyItem: async (sourcePath, destPath) => {
      const { currentWorkspaceId } = get();
      if (!currentWorkspaceId) return;

      set({ loading: true, error: null });
      
      try {
        await FileAPI.copyItem(currentWorkspaceId, sourcePath, destPath);
        await get().refreshFiles();
        set({ loading: false });
        return true;
      } catch (error) {
        set({ 
          error: error.message,
          loading: false 
        });
        return false;
      }
    },

    uploadFiles: async (files, path = '') => {
      const { currentWorkspaceId } = get();
      if (!currentWorkspaceId) return;

      set({ loading: true, error: null });
      
      try {
        const result = await FileAPI.uploadFiles(currentWorkspaceId, files, path);
        await get().refreshFiles();
        set({ loading: false });
        return result;
      } catch (error) {
        set({ 
          error: error.message,
          loading: false 
        });
        return null;
      }
    },

    toggleFolder: (folderPath) => {
      const { expandedFolders } = get();
      const newExpanded = new Set(expandedFolders);
      
      if (newExpanded.has(folderPath)) {
        newExpanded.delete(folderPath);
      } else {
        newExpanded.add(folderPath);
      }
      
      set({ expandedFolders: newExpanded });
    },

    selectFile: (filePath) => {
      set({ selectedFile: filePath });
    },

    setSearchQuery: (query) => {
      set({ searchQuery: query });
    },

    setSortBy: (sortBy) => {
      const { files, sortOrder } = get();
      const sortedFiles = FileAPI.sortFiles(files, sortBy, sortOrder);
      set({ 
        sortBy,
        files: sortedFiles 
      });
    },

    setSortOrder: (order) => {
      const { files, sortBy } = get();
      const sortedFiles = FileAPI.sortFiles(files, sortBy, order);
      set({ 
        sortOrder: order,
        files: sortedFiles 
      });
    },

    toggleHiddenFiles: () => {
      set({ showHiddenFiles: !get().showHiddenFiles });
    },

    clearError: () => {
      set({ error: null });
    },

    // Computed getters
    getFilteredFiles: () => {
      const { files, searchQuery, showHiddenFiles } = get();
      
      let filtered = files;
      
      // Filter hidden files
      if (!showHiddenFiles) {
        filtered = filtered.filter(file => !file.name.startsWith('.'));
      }
      
      // Apply search filter
      if (searchQuery) {
        filtered = FileAPI.filterFiles(filtered, searchQuery);
      }
      
      return filtered;
    },

    getFileByPath: (path) => {
      const { files } = get();
      return files.find(file => file.path === path);
    },

    isExpanded: (folderPath) => {
      return get().expandedFolders.has(folderPath);
    },

    isSelected: (filePath) => {
      return get().selectedFile === filePath;
    },

    // File tree helpers
    buildFileTree: (files) => {
      const tree = {};
      
      files.forEach(file => {
        const parts = file.path.split('/');
        let current = tree;
        
        parts.forEach((part, index) => {
          if (!current[part]) {
            current[part] = {
              name: part,
              path: parts.slice(0, index + 1).join('/'),
              type: index === parts.length - 1 ? file.type : 'directory',
              children: {},
              ...file
            };
          }
          current = current[part].children;
        });
      });
      
      return tree;
    },

    // Validation helpers
    validateFileName: (fileName) => {
      return FileAPI.validateFileName(fileName);
    },

    // Utility functions
    getFileIcon: (fileName, type) => {
      return FileAPI.getFileIcon(fileName, type);
    },

    formatFileSize: (bytes) => {
      return FileAPI.formatFileSize(bytes);
    }
  }))
);

// Subscribe to workspace changes to auto-load files
useFileStore.subscribe(
  (state) => state.currentWorkspaceId,
  (workspaceId) => {
    if (workspaceId) {
      useFileStore.getState().loadFiles();
    }
  }
);

export default useFileStore;