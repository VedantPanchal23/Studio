import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import driveAPI from '../services/driveAPI';

const useDriveStore = create(
  devtools(
    (set, get) => ({
      // Connection state
      isConnected: false,
      hasAccess: false,
      isLoading: false,
      error: null,

      // Files and folders
      files: [],
      currentFolder: null,
      selectedFiles: [],
      searchResults: [],
      
      // Sync state
      syncStatus: {
        enabled: false,
        folderId: null,
        lastSync: null,
        inProgress: false
      },
      
      // Storage info
      storageInfo: null,

      // Actions
      checkStatus: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await driveAPI.getStatus();
          set({
            isConnected: response.data.connected,
            hasAccess: response.data.hasAccess,
            isLoading: false
          });
          return response.data;
        } catch (error) {
          set({ 
            error: error.response?.data?.message || 'Failed to check Drive status',
            isLoading: false 
          });
          throw error;
        }
      },

      connect: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await driveAPI.getAuthUrl();
          // Open authorization URL in new window
          const authWindow = window.open(
            response.data.authUrl,
            'google-drive-auth',
            'width=500,height=600,scrollbars=yes,resizable=yes'
          );

          // Listen for authorization completion
          return new Promise((resolve, reject) => {
            const checkClosed = setInterval(() => {
              if (authWindow.closed) {
                clearInterval(checkClosed);
                // Check status after window closes
                get().checkStatus()
                  .then(resolve)
                  .catch(reject);
              }
            }, 1000);

            // Timeout after 5 minutes
            setTimeout(() => {
              clearInterval(checkClosed);
              if (!authWindow.closed) {
                authWindow.close();
              }
              reject(new Error('Authorization timeout'));
            }, 300000);
          });
        } catch (error) {
          set({ 
            error: error.response?.data?.message || 'Failed to connect to Drive',
            isLoading: false 
          });
          throw error;
        }
      },

      disconnect: async () => {
        set({ isLoading: true, error: null });
        try {
          await driveAPI.disconnect();
          set({
            isConnected: false,
            hasAccess: false,
            files: [],
            currentFolder: null,
            selectedFiles: [],
            searchResults: [],
            syncStatus: {
              enabled: false,
              folderId: null,
              lastSync: null,
              inProgress: false
            },
            storageInfo: null,
            isLoading: false
          });
        } catch (error) {
          set({ 
            error: error.response?.data?.message || 'Failed to disconnect Drive',
            isLoading: false 
          });
          throw error;
        }
      },

      loadFiles: async (folderId = null, options = {}) => {
        set({ isLoading: true, error: null });
        try {
          const response = await driveAPI.listFiles({ 
            folderId, 
            pageSize: 100,
            ...options 
          });
          set({
            files: response.data.files,
            currentFolder: folderId,
            isLoading: false
          });
          return response.data;
        } catch (error) {
          set({ 
            error: error.response?.data?.message || 'Failed to load files',
            isLoading: false 
          });
          throw error;
        }
      },

      searchFiles: async (query, options = {}) => {
        set({ isLoading: true, error: null });
        try {
          const response = await driveAPI.searchFiles(query, options);
          set({
            searchResults: response.data.files,
            isLoading: false
          });
          return response.data;
        } catch (error) {
          set({ 
            error: error.response?.data?.message || 'Failed to search files',
            isLoading: false 
          });
          throw error;
        }
      },

      downloadFile: async (fileId) => {
        set({ isLoading: true, error: null });
        try {
          const response = await driveAPI.downloadFile(fileId);
          set({ isLoading: false });
          return response.data;
        } catch (error) {
          set({ 
            error: error.response?.data?.message || 'Failed to download file',
            isLoading: false 
          });
          throw error;
        }
      },

      uploadFile: async (fileData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await driveAPI.uploadFile(fileData);
          // Refresh current folder
          if (get().currentFolder !== null) {
            await get().loadFiles(get().currentFolder);
          }
          set({ isLoading: false });
          return response.data;
        } catch (error) {
          set({ 
            error: error.response?.data?.message || 'Failed to upload file',
            isLoading: false 
          });
          throw error;
        }
      },

      createFolder: async (name, parentId = null) => {
        set({ isLoading: true, error: null });
        try {
          const response = await driveAPI.createFolder({ name, parentId });
          // Refresh current folder
          if (get().currentFolder === parentId) {
            await get().loadFiles(get().currentFolder);
          }
          set({ isLoading: false });
          return response.data;
        } catch (error) {
          set({ 
            error: error.response?.data?.message || 'Failed to create folder',
            isLoading: false 
          });
          throw error;
        }
      },

      deleteFile: async (fileId) => {
        set({ isLoading: true, error: null });
        try {
          await driveAPI.deleteFile(fileId);
          // Remove from current files list
          set(state => ({
            files: state.files.filter(file => file.id !== fileId),
            isLoading: false
          }));
        } catch (error) {
          set({ 
            error: error.response?.data?.message || 'Failed to delete file',
            isLoading: false 
          });
          throw error;
        }
      },

      syncWorkspace: async (workspaceId, options = {}) => {
        set(state => ({
          syncStatus: { ...state.syncStatus, inProgress: true },
          error: null
        }));
        try {
          const response = await driveAPI.syncWorkspace(workspaceId, options);
          set(state => ({
            syncStatus: { ...state.syncStatus, inProgress: false }
          }));
          return response.data;
        } catch (error) {
          set(state => ({
            syncStatus: { ...state.syncStatus, inProgress: false },
            error: error.response?.data?.message || 'Failed to sync workspace'
          }));
          throw error;
        }
      },

      importFromDrive: async (workspaceId, folderId) => {
        set(state => ({
          syncStatus: { ...state.syncStatus, inProgress: true },
          error: null
        }));
        try {
          const response = await driveAPI.importFromDrive(workspaceId, folderId);
          set(state => ({
            syncStatus: { ...state.syncStatus, inProgress: false }
          }));
          return response.data;
        } catch (error) {
          set(state => ({
            syncStatus: { ...state.syncStatus, inProgress: false },
            error: error.response?.data?.message || 'Failed to import from Drive'
          }));
          throw error;
        }
      },

      getSyncStatus: async (workspaceId) => {
        try {
          const response = await driveAPI.getSyncStatus(workspaceId);
          set({
            syncStatus: response.data
          });
          return response.data;
        } catch (error) {
          set({ 
            error: error.response?.data?.message || 'Failed to get sync status'
          });
          throw error;
        }
      },

      getStorageInfo: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await driveAPI.getStorageInfo();
          set({
            storageInfo: response.data,
            isLoading: false
          });
          return response.data;
        } catch (error) {
          set({ 
            error: error.response?.data?.message || 'Failed to get storage info',
            isLoading: false 
          });
          throw error;
        }
      },

      setSelectedFiles: (files) => {
        set({ selectedFiles: files });
      },

      clearError: () => {
        set({ error: null });
      },

      reset: () => {
        set({
          isConnected: false,
          hasAccess: false,
          isLoading: false,
          error: null,
          files: [],
          currentFolder: null,
          selectedFiles: [],
          searchResults: [],
          syncStatus: {
            enabled: false,
            folderId: null,
            lastSync: null,
            inProgress: false
          },
          storageInfo: null
        });
      }
    }),
    {
      name: 'drive-store'
    }
  )
);

export default useDriveStore;