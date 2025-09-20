import api from './api';

/**
 * Execution API service for managing code execution
 */
class ExecutionAPI {
  /**
   * Create a new execution container
   * @param {string} language - Programming language
   * @param {string} workspaceId - Workspace ID
   * @returns {Promise<Object>} Container information
   */
  async createContainer(language, workspaceId) {
    try {
      const response = await api.post('/execution/containers', {
        language,
        workspaceId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to create container:', error);
      throw new Error(error.response?.data?.message || 'Failed to create container');
    }
  }

  /**
   * Execute code in a container (HTTP streaming)
   * @param {string} containerId - Container ID
   * @param {string} code - Code to execute
   * @param {string} filename - Optional filename
   * @returns {Promise<ReadableStream>} Execution output stream
   */
  async executeCode(containerId, code, filename = 'main') {
    try {
      const response = await fetch(`${api.defaults.baseURL}/execution/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          containerId,
          code,
          filename
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Execution failed');
      }

      return response.body;
    } catch (error) {
      console.error('Failed to execute code:', error);
      throw error;
    }
  }

  /**
   * Get container information
   * @param {string} containerId - Container ID
   * @returns {Promise<Object>} Container information
   */
  async getContainerInfo(containerId) {
    try {
      const response = await api.get(`/execution/containers/${containerId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get container info:', error);
      throw new Error(error.response?.data?.message || 'Failed to get container information');
    }
  }

  /**
   * Stop and remove a container
   * @param {string} containerId - Container ID
   * @returns {Promise<Object>} Success response
   */
  async stopContainer(containerId) {
    try {
      const response = await api.delete(`/execution/containers/${containerId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to stop container:', error);
      throw new Error(error.response?.data?.message || 'Failed to stop container');
    }
  }

  /**
   * List containers for a workspace
   * @param {string} workspaceId - Workspace ID
   * @returns {Promise<Object>} List of containers
   */
  async listWorkspaceContainers(workspaceId) {
    try {
      const response = await api.get(`/execution/workspaces/${workspaceId}/containers`);
      return response.data;
    } catch (error) {
      console.error('Failed to list containers:', error);
      throw new Error(error.response?.data?.message || 'Failed to list containers');
    }
  }

  /**
   * Get execution statistics
   * @returns {Promise<Object>} Execution statistics
   */
  async getExecutionStats() {
    try {
      const response = await api.get('/execution/stats');
      return response.data;
    } catch (error) {
      console.error('Failed to get execution stats:', error);
      throw new Error(error.response?.data?.message || 'Failed to get execution statistics');
    }
  }
}

export default new ExecutionAPI();