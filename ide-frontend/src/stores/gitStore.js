import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import gitAPI from '../services/gitAPI';

const useGitStore = create(
  devtools(
    (set, get) => ({
      // State
      isGitRepository: false,
      status: null,
      branches: [],
      currentBranch: null,
      remotes: {},
      commits: [],
      stagedFiles: [],
      modifiedFiles: [],
      untrackedFiles: [],
      isLoading: false,
      error: null,
      
      // GitHub integration
      githubUser: null,
      githubRepositories: [],
      
      // Actions
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      
      // Initialize Git status for workspace
      initializeGitStatus: async (workspaceId) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await gitAPI.getStatus(workspaceId);
          
          if (result.success) {
            const { isGitRepository, status, branches, remotes } = result.data;
            
            set({
              isGitRepository,
              status,
              branches: branches?.branches || [],
              currentBranch: branches?.currentBranch || null,
              remotes: remotes || {},
              stagedFiles: status?.files?.filter(f => f.staged) || [],
              modifiedFiles: status?.files?.filter(f => f.modified && !f.staged) || [],
              untrackedFiles: status?.files?.filter(f => f.status === 'untracked') || [],
              isLoading: false
            });
          } else {
            set({ 
              error: result.error,
              isLoading: false,
              isGitRepository: false
            });
          }
        } catch (error) {
          set({ 
            error: error.message,
            isLoading: false,
            isGitRepository: false
          });
        }
      },
      
      // Initialize Git repository
      initRepository: async (workspaceId, options = {}) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await gitAPI.initRepository(workspaceId, options);
          
          if (result.success) {
            // Refresh status after initialization
            await get().initializeGitStatus(workspaceId);
            return { success: true };
          } else {
            set({ error: result.error, isLoading: false });
            return { success: false, error: result.error };
          }
        } catch (error) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },
      
      // Clone repository
      cloneRepository: async (workspaceId, repoUrl, options = {}) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await gitAPI.cloneRepository(workspaceId, repoUrl, options);
          
          if (result.success) {
            // Refresh status after cloning
            await get().initializeGitStatus(workspaceId);
            return { success: true };
          } else {
            set({ error: result.error, isLoading: false });
            return { success: false, error: result.error };
          }
        } catch (error) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },
      
      // Stage files
      stageFiles: async (workspaceId, files = []) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await gitAPI.addFiles(workspaceId, files);
          
          if (result.success) {
            // Refresh status after staging
            await get().refreshStatus(workspaceId);
            return { success: true };
          } else {
            set({ error: result.error, isLoading: false });
            return { success: false, error: result.error };
          }
        } catch (error) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },
      
      // Unstage files
      unstageFiles: async (workspaceId, files = []) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await gitAPI.unstageFiles(workspaceId, files);
          
          if (result.success) {
            // Refresh status after unstaging
            await get().refreshStatus(workspaceId);
            return { success: true };
          } else {
            set({ error: result.error, isLoading: false });
            return { success: false, error: result.error };
          }
        } catch (error) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },
      
      // Commit changes
      commit: async (workspaceId, message, options = {}) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await gitAPI.commit(workspaceId, message, options);
          
          if (result.success) {
            // Refresh status and commits after committing
            await Promise.all([
              get().refreshStatus(workspaceId),
              get().loadCommitHistory(workspaceId)
            ]);
            return { success: true };
          } else {
            set({ error: result.error, isLoading: false });
            return { success: false, error: result.error };
          }
        } catch (error) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },
      
      // Load commit history
      loadCommitHistory: async (workspaceId, options = {}) => {
        try {
          const result = await gitAPI.getCommitHistory(workspaceId, options);
          
          if (result.success) {
            set({ commits: result.data.commits || [] });
          }
        } catch (error) {
          console.error('Failed to load commit history:', error);
        }
      },
      
      // Load branches
      loadBranches: async (workspaceId) => {
        try {
          const result = await gitAPI.getBranches(workspaceId);
          
          if (result.success) {
            set({
              branches: result.data.branches || [],
              currentBranch: result.data.currentBranch || null
            });
          }
        } catch (error) {
          console.error('Failed to load branches:', error);
        }
      },
      
      // Create branch
      createBranch: async (workspaceId, name, startPoint = null) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await gitAPI.createBranch(workspaceId, name, startPoint);
          
          if (result.success) {
            // Refresh branches after creating
            await get().loadBranches(workspaceId);
            set({ isLoading: false });
            return { success: true };
          } else {
            set({ error: result.error, isLoading: false });
            return { success: false, error: result.error };
          }
        } catch (error) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },
      
      // Switch branch
      switchBranch: async (workspaceId, name) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await gitAPI.switchBranch(workspaceId, name);
          
          if (result.success) {
            // Refresh status and branches after switching
            await Promise.all([
              get().refreshStatus(workspaceId),
              get().loadBranches(workspaceId)
            ]);
            return { success: true };
          } else {
            set({ error: result.error, isLoading: false });
            return { success: false, error: result.error };
          }
        } catch (error) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },
      
      // Delete branch
      deleteBranch: async (workspaceId, branchName, force = false) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await gitAPI.deleteBranch(workspaceId, branchName, force);
          
          if (result.success) {
            // Refresh branches after deleting
            await get().loadBranches(workspaceId);
            set({ isLoading: false });
            return { success: true };
          } else {
            set({ error: result.error, isLoading: false });
            return { success: false, error: result.error };
          }
        } catch (error) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },
      
      // Push changes
      push: async (workspaceId, options = {}) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await gitAPI.push(workspaceId, options);
          
          if (result.success) {
            set({ isLoading: false });
            return { success: true };
          } else {
            set({ error: result.error, isLoading: false });
            return { success: false, error: result.error };
          }
        } catch (error) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },
      
      // Pull changes
      pull: async (workspaceId, options = {}) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await gitAPI.pull(workspaceId, options);
          
          if (result.success) {
            // Refresh status after pulling
            await get().refreshStatus(workspaceId);
            return { success: true };
          } else {
            set({ error: result.error, isLoading: false });
            return { success: false, error: result.error };
          }
        } catch (error) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },
      
      // Fetch changes
      fetch: async (workspaceId, options = {}) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await gitAPI.fetch(workspaceId, options);
          
          if (result.success) {
            set({ isLoading: false });
            return { success: true };
          } else {
            set({ error: result.error, isLoading: false });
            return { success: false, error: result.error };
          }
        } catch (error) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },
      
      // Refresh status
      refreshStatus: async (workspaceId) => {
        try {
          const result = await gitAPI.getStatus(workspaceId);
          
          if (result.success && result.data.status) {
            const { status } = result.data;
            set({
              status,
              stagedFiles: status.files?.filter(f => f.staged) || [],
              modifiedFiles: status.files?.filter(f => f.modified && !f.staged) || [],
              untrackedFiles: status.files?.filter(f => f.status === 'untracked') || []
            });
          }
        } catch (error) {
          console.error('Failed to refresh status:', error);
        }
      },
      
      // GitHub methods
      loadGitHubUser: async () => {
        try {
          const result = await gitAPI.getGitHubUser();
          
          if (result.success) {
            set({ githubUser: result.data });
          } else {
            set({ githubUser: null });
          }
        } catch (error) {
          set({ githubUser: null });
        }
      },
      
      loadGitHubRepositories: async (options = {}) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await gitAPI.listGitHubRepositories(options);
          
          if (result.success) {
            set({ 
              githubRepositories: result.data.repositories || [],
              isLoading: false 
            });
          } else {
            set({ error: result.error, isLoading: false });
          }
        } catch (error) {
          set({ error: error.message, isLoading: false });
        }
      },
      
      createGitHubRepository: async (repoData) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await gitAPI.createGitHubRepository(repoData);
          
          if (result.success) {
            // Refresh repositories list
            await get().loadGitHubRepositories();
            return { success: true, data: result.data };
          } else {
            set({ error: result.error, isLoading: false });
            return { success: false, error: result.error };
          }
        } catch (error) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },
      
      // Reset store
      reset: () => set({
        isGitRepository: false,
        status: null,
        branches: [],
        currentBranch: null,
        remotes: {},
        commits: [],
        stagedFiles: [],
        modifiedFiles: [],
        untrackedFiles: [],
        isLoading: false,
        error: null,
        githubUser: null,
        githubRepositories: []
      })
    }),
    {
      name: 'git-store'
    }
  )
);

export default useGitStore;