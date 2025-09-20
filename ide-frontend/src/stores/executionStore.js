import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import executionAPI from '../services/executionAPI';
import websocketService from '../services/websocket';

/**
 * Execution store for managing code execution state
 */
const useExecutionStore = create(
  subscribeWithSelector((set, get) => ({
    // State
    containers: new Map(), // containerId -> container info
    executions: new Map(), // executionId -> execution info
    activeExecution: null,
    isExecuting: false,
    executionOutput: '',
    executionError: null,
    selectedLanguage: 'node',
    supportedLanguages: [
      { id: 'node', name: 'Node.js', extension: 'js' },
      { id: 'python', name: 'Python', extension: 'py' },
      { id: 'java', name: 'Java', extension: 'java' },
      { id: 'cpp', name: 'C++', extension: 'cpp' },
      { id: 'go', name: 'Go', extension: 'go' },
      { id: 'rust', name: 'Rust', extension: 'rs' }
    ],

    // Actions
    setSelectedLanguage: (language) => {
      set({ selectedLanguage: language });
    },

    /**
     * Create a new execution container
     */
    createContainer: async (language, workspaceId) => {
      try {
        set({ executionError: null });
        
        const response = await executionAPI.createContainer(language, workspaceId);
        const container = response.container;
        
        set((state) => ({
          containers: new Map(state.containers).set(container.containerId, container)
        }));
        
        return container;
      } catch (error) {
        set({ executionError: error.message });
        throw error;
      }
    },

    /**
     * Execute code using WebSocket streaming
     */
    executeCodeWebSocket: async (containerId, code, filename = 'main') => {
      try {
        set({ 
          isExecuting: true, 
          executionOutput: '', 
          executionError: null 
        });

        const executionId = crypto.randomUUID();
        
        // Set up WebSocket event listeners
        const ws = websocketService.getSocket();
        
        const handleExecutionStarted = (data) => {
          if (data.executionId === executionId) {
            set({ 
              activeExecution: data,
              executions: new Map(get().executions).set(executionId, {
                ...data,
                status: 'running',
                output: ''
              })
            });
          }
        };

        const handleExecutionOutput = (data) => {
          if (data.executionId === executionId) {
            set((state) => ({
              executionOutput: state.executionOutput + data.output,
              executions: new Map(state.executions).set(executionId, {
                ...state.executions.get(executionId),
                output: (state.executions.get(executionId)?.output || '') + data.output
              })
            }));
          }
        };

        const handleExecutionCompleted = (data) => {
          if (data.executionId === executionId) {
            set((state) => ({
              isExecuting: false,
              activeExecution: null,
              executions: new Map(state.executions).set(executionId, {
                ...state.executions.get(executionId),
                ...data,
                status: 'completed'
              })
            }));
            
            // Clean up listeners
            ws.off('execution:started', handleExecutionStarted);
            ws.off('execution:output', handleExecutionOutput);
            ws.off('execution:completed', handleExecutionCompleted);
            ws.off('execution:error', handleExecutionError);
            ws.off('execution:stopped', handleExecutionStopped);
          }
        };

        const handleExecutionError = (data) => {
          if (data.executionId === executionId) {
            set((state) => ({
              isExecuting: false,
              activeExecution: null,
              executionError: data.error,
              executions: new Map(state.executions).set(executionId, {
                ...state.executions.get(executionId),
                ...data,
                status: 'error'
              })
            }));
            
            // Clean up listeners
            ws.off('execution:started', handleExecutionStarted);
            ws.off('execution:output', handleExecutionOutput);
            ws.off('execution:completed', handleExecutionCompleted);
            ws.off('execution:error', handleExecutionError);
            ws.off('execution:stopped', handleExecutionStopped);
          }
        };

        const handleExecutionStopped = (data) => {
          if (data.executionId === executionId) {
            set((state) => ({
              isExecuting: false,
              activeExecution: null,
              executions: new Map(state.executions).set(executionId, {
                ...state.executions.get(executionId),
                ...data,
                status: 'stopped'
              })
            }));
            
            // Clean up listeners
            ws.off('execution:started', handleExecutionStarted);
            ws.off('execution:output', handleExecutionOutput);
            ws.off('execution:completed', handleExecutionCompleted);
            ws.off('execution:error', handleExecutionError);
            ws.off('execution:stopped', handleExecutionStopped);
          }
        };

        // Set up event listeners
        ws.on('execution:started', handleExecutionStarted);
        ws.on('execution:output', handleExecutionOutput);
        ws.on('execution:completed', handleExecutionCompleted);
        ws.on('execution:error', handleExecutionError);
        ws.on('execution:stopped', handleExecutionStopped);

        // Start execution
        ws.emit('execution:start', {
          containerId,
          code,
          filename,
          executionId
        });

        return executionId;
      } catch (error) {
        set({ 
          isExecuting: false, 
          executionError: error.message 
        });
        throw error;
      }
    },

    /**
     * Execute code using HTTP streaming
     */
    executeCodeHTTP: async (containerId, code, filename = 'main') => {
      try {
        set({ 
          isExecuting: true, 
          executionOutput: '', 
          executionError: null 
        });

        const stream = await executionAPI.executeCode(containerId, code, filename);
        const reader = stream.getReader();
        const decoder = new TextDecoder();

        let output = '';
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          output += chunk;
          
          set((state) => ({
            executionOutput: state.executionOutput + chunk
          }));
        }

        set({ isExecuting: false });
        return output;
      } catch (error) {
        set({ 
          isExecuting: false, 
          executionError: error.message 
        });
        throw error;
      }
    },

    /**
     * Stop active execution
     */
    stopExecution: async () => {
      const { activeExecution } = get();
      
      if (!activeExecution) {
        return;
      }

      try {
        const ws = websocketService.getSocket();
        ws.emit('execution:stop', {
          executionId: activeExecution.executionId
        });
      } catch (error) {
        set({ executionError: error.message });
        throw error;
      }
    },

    /**
     * Get container information
     */
    getContainerInfo: async (containerId) => {
      try {
        const response = await executionAPI.getContainerInfo(containerId);
        const container = response.container;
        
        set((state) => ({
          containers: new Map(state.containers).set(containerId, container)
        }));
        
        return container;
      } catch (error) {
        set({ executionError: error.message });
        throw error;
      }
    },

    /**
     * Stop and remove container
     */
    stopContainer: async (containerId) => {
      try {
        await executionAPI.stopContainer(containerId);
        
        set((state) => {
          const newContainers = new Map(state.containers);
          newContainers.delete(containerId);
          return { containers: newContainers };
        });
      } catch (error) {
        set({ executionError: error.message });
        throw error;
      }
    },

    /**
     * List workspace containers
     */
    loadWorkspaceContainers: async (workspaceId) => {
      try {
        const response = await executionAPI.listWorkspaceContainers(workspaceId);
        const containers = response.containers;
        
        const containersMap = new Map();
        containers.forEach(container => {
          containersMap.set(container.id, container);
        });
        
        set({ containers: containersMap });
        return containers;
      } catch (error) {
        set({ executionError: error.message });
        throw error;
      }
    },

    /**
     * Clear execution output
     */
    clearOutput: () => {
      set({ 
        executionOutput: '', 
        executionError: null 
      });
    },

    /**
     * Get execution history
     */
    getExecutionHistory: () => {
      return Array.from(get().executions.values())
        .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    },

    /**
     * Get container by language
     */
    getContainerByLanguage: (language) => {
      const containers = Array.from(get().containers.values());
      return containers.find(container => 
        container.language === language && container.status === 'running'
      );
    },

    /**
     * Get supported language info
     */
    getLanguageInfo: (languageId) => {
      return get().supportedLanguages.find(lang => lang.id === languageId);
    },

    /**
     * Reset execution state
     */
    reset: () => {
      set({
        containers: new Map(),
        executions: new Map(),
        activeExecution: null,
        isExecuting: false,
        executionOutput: '',
        executionError: null
      });
    }
  }))
);

export default useExecutionStore;