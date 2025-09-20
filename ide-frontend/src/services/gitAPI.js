import api from './api';

class GitAPI {
  /**
   * Get Git repository status for a workspace
   */
  async getStatus(workspaceId) {
    try {
      const response = await api.get(`/git/${workspaceId}/status`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Initialize Git repository in workspace
   */
  async initRepository(workspaceId, options = {}) {
    try {
      const response = await api.post(`/git/${workspaceId}/init`, options);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Clone repository into workspace
   */
  async cloneRepository(workspaceId, repoUrl, options = {}) {
    try {
      const response = await api.post(`/git/${workspaceId}/clone`, {
        repoUrl,
        ...options
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Add files to staging area
   */
  async addFiles(workspaceId, files = []) {
    try {
      const response = await api.post(`/git/${workspaceId}/add`, { files });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Remove files from staging area
   */
  async unstageFiles(workspaceId, files = []) {
    try {
      const response = await api.post(`/git/${workspaceId}/unstage`, { files });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Commit changes
   */
  async commit(workspaceId, message, options = {}) {
    try {
      const response = await api.post(`/git/${workspaceId}/commit`, {
        message,
        ...options
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Get commit history
   */
  async getCommitHistory(workspaceId, options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit);
      if (options.since) params.append('since', options.since);
      
      const response = await api.get(`/git/${workspaceId}/history?${params}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Get branch information
   */
  async getBranches(workspaceId) {
    try {
      const response = await api.get(`/git/${workspaceId}/branches`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Create new branch
   */
  async createBranch(workspaceId, name, startPoint = null) {
    try {
      const response = await api.post(`/git/${workspaceId}/branches`, {
        name,
        startPoint
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Switch to branch
   */
  async switchBranch(workspaceId, name) {
    try {
      const response = await api.post(`/git/${workspaceId}/branches/switch`, {
        name
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Delete branch
   */
  async deleteBranch(workspaceId, branchName, force = false) {
    try {
      const params = new URLSearchParams();
      if (force) params.append('force', 'true');
      
      const response = await api.delete(`/git/${workspaceId}/branches/${branchName}?${params}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Get remote repositories
   */
  async getRemotes(workspaceId) {
    try {
      const response = await api.get(`/git/${workspaceId}/remotes`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Add remote repository
   */
  async addRemote(workspaceId, name, url) {
    try {
      const response = await api.post(`/git/${workspaceId}/remotes`, {
        name,
        url
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Push changes to remote
   */
  async push(workspaceId, options = {}) {
    try {
      const response = await api.post(`/git/${workspaceId}/push`, options);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Pull changes from remote
   */
  async pull(workspaceId, options = {}) {
    try {
      const response = await api.post(`/git/${workspaceId}/pull`, options);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Fetch changes from remote
   */
  async fetch(workspaceId, options = {}) {
    try {
      const response = await api.post(`/git/${workspaceId}/fetch`, options);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Get diff for files
   */
  async getDiff(workspaceId, options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.staged) params.append('staged', 'true');
      if (options.file) params.append('file', options.file);
      
      const response = await api.get(`/git/${workspaceId}/diff?${params}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // GitHub API methods

  /**
   * Get authenticated GitHub user
   */
  async getGitHubUser() {
    try {
      const response = await api.get('/git/github/user');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * List GitHub repositories
   */
  async listGitHubRepositories(options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.visibility) params.append('visibility', options.visibility);
      if (options.sort) params.append('sort', options.sort);
      if (options.direction) params.append('direction', options.direction);
      if (options.page) params.append('page', options.page);
      if (options.perPage) params.append('perPage', options.perPage);
      
      const response = await api.get(`/git/github/repositories?${params}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Create GitHub repository
   */
  async createGitHubRepository(repoData) {
    try {
      const response = await api.post('/git/github/repositories', repoData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }
}

const gitAPI = new GitAPI();
export default gitAPI;