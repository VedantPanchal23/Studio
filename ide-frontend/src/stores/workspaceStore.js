import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import workspaceAPI from '../services/workspaceAPI';

/**
 * Workspace store for managing workspaces and current workspace
 */
export const useWorkspaceStore = create(
  persist(
    (set, get) => ({
      // State
      currentWorkspaceId: null,
      currentWorkspace: null,
      workspaces: [],
      publicWorkspaces: [],
      stats: null,
      loading: false,
      error: null,
      
      // Pagination
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
      },
      
      // Filters
      filters: {
        search: '',
        sortBy: 'lastActivity',
        sortOrder: 'desc',
        includeArchived: false
      },
      
      // Actions
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      
      setCurrentWorkspace: (workspaceId) => {
        set({ currentWorkspaceId: workspaceId });
        if (workspaceId) {
          get().fetchWorkspace(workspaceId);
        } else {
          set({ currentWorkspace: null });
        }
      },
      
      setFilters: (filters) => {
        set((state) => ({
          filters: { ...state.filters, ...filters }
        }));
      },
      
      // API Actions
      fetchWorkspaces: async (params = {}) => {
        set({ loading: true, error: null });
        try {
          const response = await workspaceAPI.getWorkspaces({
            ...get().filters,
            ...params
          });
          
          set({
            workspaces: response.data.workspaces,
            pagination: response.data.pagination,
            loading: false
          });
          
          return response;
        } catch (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },
      
      fetchWorkspace: async (workspaceId) => {
        set({ loading: true, error: null });
        try {
          const response = await workspaceAPI.getWorkspace(workspaceId);
          set({
            currentWorkspace: response.data.workspace,
            loading: false
          });
          return response;
        } catch (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },
      
      createWorkspace: async (workspaceData) => {
        console.log('WorkspaceStore: Starting createWorkspace with data:', workspaceData);
        set({ loading: true, error: null });
        try {
          console.log('WorkspaceStore: Calling workspaceAPI.createWorkspace...');
          const response = await workspaceAPI.createWorkspace(workspaceData);
          console.log('WorkspaceStore: Workspace created successfully:', response);
          const newWorkspace = response.data.workspace;
          
          set((state) => ({
            workspaces: [newWorkspace, ...state.workspaces],
            loading: false
          }));
          
          console.log('WorkspaceStore: Store updated with new workspace');
          return response;
        } catch (error) {
          console.error('WorkspaceStore: Error creating workspace:', error);
          console.log('WorkspaceStore: Error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
          });
          set({ error: error.message, loading: false });
          throw error;
        }
      },
      
      updateWorkspace: async (workspaceId, updates) => {
        set({ loading: true, error: null });
        try {
          const response = await workspaceAPI.updateWorkspace(workspaceId, updates);
          const updatedWorkspace = response.data.workspace;
          
          set((state) => ({
            workspaces: state.workspaces.map(w => 
              w._id === workspaceId ? updatedWorkspace : w
            ),
            currentWorkspace: state.currentWorkspace?._id === workspaceId 
              ? updatedWorkspace 
              : state.currentWorkspace,
            loading: false
          }));
          
          return response;
        } catch (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },
      
      deleteWorkspace: async (workspaceId, permanent = false) => {
        set({ loading: true, error: null });
        try {
          const response = await workspaceAPI.deleteWorkspace(workspaceId, permanent);
          
          if (permanent) {
            // Remove from list if permanently deleted
            set((state) => ({
              workspaces: state.workspaces.filter(w => w._id !== workspaceId),
              currentWorkspaceId: state.currentWorkspaceId === workspaceId ? null : state.currentWorkspaceId,
              currentWorkspace: state.currentWorkspace?._id === workspaceId ? null : state.currentWorkspace,
              loading: false
            }));
          } else {
            // Mark as archived
            set((state) => ({
              workspaces: state.workspaces.map(w => 
                w._id === workspaceId ? { ...w, isArchived: true } : w
              ),
              loading: false
            }));
          }
          
          return response;
        } catch (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },
      
      duplicateWorkspace: async (workspaceId, name) => {
        set({ loading: true, error: null });
        try {
          const response = await workspaceAPI.duplicateWorkspace(workspaceId, name);
          const newWorkspace = response.data.workspace;
          
          set((state) => ({
            workspaces: [newWorkspace, ...state.workspaces],
            loading: false
          }));
          
          return response;
        } catch (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },
      
      restoreWorkspace: async (workspaceId) => {
        set({ loading: true, error: null });
        try {
          const response = await workspaceAPI.restoreWorkspace(workspaceId);
          const restoredWorkspace = response.data.workspace;
          
          set((state) => ({
            workspaces: state.workspaces.map(w => 
              w._id === workspaceId ? restoredWorkspace : w
            ),
            loading: false
          }));
          
          return response;
        } catch (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },
      
      addCollaborator: async (workspaceId, email, role) => {
        set({ loading: true, error: null });
        try {
          const response = await workspaceAPI.addCollaborator(workspaceId, email, role);
          
          // Refresh workspace data to get updated collaborators
          await get().fetchWorkspace(workspaceId);
          
          set({ loading: false });
          return response;
        } catch (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },
      
      updateCollaboratorRole: async (workspaceId, userId, role) => {
        set({ loading: true, error: null });
        try {
          const response = await workspaceAPI.updateCollaboratorRole(workspaceId, userId, role);
          
          // Refresh workspace data to get updated collaborators
          await get().fetchWorkspace(workspaceId);
          
          set({ loading: false });
          return response;
        } catch (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },
      
      removeCollaborator: async (workspaceId, userId) => {
        set({ loading: true, error: null });
        try {
          const response = await workspaceAPI.removeCollaborator(workspaceId, userId);
          
          // Refresh workspace data to get updated collaborators
          await get().fetchWorkspace(workspaceId);
          
          set({ loading: false });
          return response;
        } catch (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },
      
      fetchPublicWorkspaces: async (params = {}) => {
        set({ loading: true, error: null });
        try {
          const response = await workspaceAPI.getPublicWorkspaces(params);
          set({
            publicWorkspaces: response.data.workspaces,
            loading: false
          });
          return response;
        } catch (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },
      
      fetchStats: async () => {
        set({ loading: true, error: null });
        try {
          const response = await workspaceAPI.getWorkspaceStats();
          set({
            stats: response.data,
            loading: false
          });
          return response;
        } catch (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },
      
      // Utility functions
      getWorkspaceById: (workspaceId) => {
        return get().workspaces.find(w => w._id === workspaceId);
      },
      
      getCurrentWorkspace: () => {
        return get().currentWorkspace;
      },
      
      isWorkspaceOwner: (workspaceId, userId) => {
        const workspace = get().getWorkspaceById(workspaceId);
        return workspace?.owner?._id === userId;
      },
      
      getUserRole: (workspaceId, userId) => {
        const workspace = get().getWorkspaceById(workspaceId);
        if (!workspace) return null;
        
        if (workspace.owner?._id === userId) return 'owner';
        
        const collaborator = workspace.collaborators?.find(c => c.userId._id === userId);
        return collaborator?.role || null;
      },
      
      clearError: () => set({ error: null })
    }),
    {
      name: 'workspace-store',
      partialize: (state) => ({
        currentWorkspaceId: state.currentWorkspaceId,
        filters: state.filters
      })
    }
  )
);

export default useWorkspaceStore;