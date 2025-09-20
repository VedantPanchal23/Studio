const axios = require('axios');
const logger = require('./logger');

class GitHubAPI {
  constructor() {
    this.baseURL = 'https://api.github.com';
    this.apiVersion = '2022-11-28';
  }

  /**
   * Create authenticated axios instance
   */
  createAuthenticatedClient(accessToken) {
    return axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': this.apiVersion,
        'User-Agent': 'IDE-Backend/1.0.0'
      },
      timeout: 30000
    });
  }

  /**
   * Get authenticated user information
   */
  async getAuthenticatedUser(accessToken) {
    try {
      const client = this.createAuthenticatedClient(accessToken);
      const response = await client.get('/user');
      
      return {
        success: true,
        user: response.data
      };
    } catch (error) {
      logger.error('Error getting authenticated user:', error);
      return {
        success: false,
        error: this.handleAPIError(error)
      };
    }
  }

  /**
   * List user repositories
   */
  async listUserRepositories(accessToken, options = {}) {
    try {
      const client = this.createAuthenticatedClient(accessToken);
      const params = {
        visibility: options.visibility || 'all',
        affiliation: options.affiliation || 'owner,collaborator',
        sort: options.sort || 'updated',
        direction: options.direction || 'desc',
        per_page: options.perPage || 30,
        page: options.page || 1
      };
      
      const response = await client.get('/user/repos', { params });
      
      return {
        success: true,
        repositories: response.data,
        pagination: this.extractPaginationInfo(response.headers)
      };
    } catch (error) {
      logger.error('Error listing user repositories:', error);
      return {
        success: false,
        error: this.handleAPIError(error)
      };
    }
  }

  /**
   * Get repository information
   */
  async getRepository(accessToken, owner, repo) {
    try {
      const client = this.createAuthenticatedClient(accessToken);
      const response = await client.get(`/repos/${owner}/${repo}`);
      
      return {
        success: true,
        repository: response.data
      };
    } catch (error) {
      logger.error('Error getting repository:', error);
      return {
        success: false,
        error: this.handleAPIError(error)
      };
    }
  }

  /**
   * Create a new repository
   */
  async createRepository(accessToken, repoData) {
    try {
      const client = this.createAuthenticatedClient(accessToken);
      
      const payload = {
        name: repoData.name,
        description: repoData.description || '',
        private: repoData.private || false,
        auto_init: repoData.autoInit || false,
        gitignore_template: repoData.gitignoreTemplate || null,
        license_template: repoData.licenseTemplate || null,
        allow_squash_merge: repoData.allowSquashMerge !== false,
        allow_merge_commit: repoData.allowMergeCommit !== false,
        allow_rebase_merge: repoData.allowRebaseMerge !== false,
        delete_branch_on_merge: repoData.deleteBranchOnMerge || false
      };
      
      const response = await client.post('/user/repos', payload);
      
      return {
        success: true,
        repository: response.data
      };
    } catch (error) {
      logger.error('Error creating repository:', error);
      return {
        success: false,
        error: this.handleAPIError(error)
      };
    }
  }

  /**
   * Fork a repository
   */
  async forkRepository(accessToken, owner, repo, options = {}) {
    try {
      const client = this.createAuthenticatedClient(accessToken);
      
      const payload = {};
      if (options.organization) {
        payload.organization = options.organization;
      }
      if (options.name) {
        payload.name = options.name;
      }
      if (options.defaultBranchOnly) {
        payload.default_branch_only = options.defaultBranchOnly;
      }
      
      const response = await client.post(`/repos/${owner}/${repo}/forks`, payload);
      
      return {
        success: true,
        repository: response.data
      };
    } catch (error) {
      logger.error('Error forking repository:', error);
      return {
        success: false,
        error: this.handleAPIError(error)
      };
    }
  }

  /**
   * List repository branches
   */
  async listBranches(accessToken, owner, repo, options = {}) {
    try {
      const client = this.createAuthenticatedClient(accessToken);
      const params = {
        protected: options.protected,
        per_page: options.perPage || 30,
        page: options.page || 1
      };
      
      const response = await client.get(`/repos/${owner}/${repo}/branches`, { params });
      
      return {
        success: true,
        branches: response.data,
        pagination: this.extractPaginationInfo(response.headers)
      };
    } catch (error) {
      logger.error('Error listing branches:', error);
      return {
        success: false,
        error: this.handleAPIError(error)
      };
    }
  }

  /**
   * Get branch information
   */
  async getBranch(accessToken, owner, repo, branch) {
    try {
      const client = this.createAuthenticatedClient(accessToken);
      const response = await client.get(`/repos/${owner}/${repo}/branches/${branch}`);
      
      return {
        success: true,
        branch: response.data
      };
    } catch (error) {
      logger.error('Error getting branch:', error);
      return {
        success: false,
        error: this.handleAPIError(error)
      };
    }
  }

  /**
   * List commits
   */
  async listCommits(accessToken, owner, repo, options = {}) {
    try {
      const client = this.createAuthenticatedClient(accessToken);
      const params = {
        sha: options.sha,
        path: options.path,
        author: options.author,
        since: options.since,
        until: options.until,
        per_page: options.perPage || 30,
        page: options.page || 1
      };
      
      const response = await client.get(`/repos/${owner}/${repo}/commits`, { params });
      
      return {
        success: true,
        commits: response.data,
        pagination: this.extractPaginationInfo(response.headers)
      };
    } catch (error) {
      logger.error('Error listing commits:', error);
      return {
        success: false,
        error: this.handleAPIError(error)
      };
    }
  }

  /**
   * Get commit information
   */
  async getCommit(accessToken, owner, repo, sha) {
    try {
      const client = this.createAuthenticatedClient(accessToken);
      const response = await client.get(`/repos/${owner}/${repo}/commits/${sha}`);
      
      return {
        success: true,
        commit: response.data
      };
    } catch (error) {
      logger.error('Error getting commit:', error);
      return {
        success: false,
        error: this.handleAPIError(error)
      };
    }
  }

  /**
   * Create a pull request
   */
  async createPullRequest(accessToken, owner, repo, pullRequestData) {
    try {
      const client = this.createAuthenticatedClient(accessToken);
      
      const payload = {
        title: pullRequestData.title,
        head: pullRequestData.head,
        base: pullRequestData.base,
        body: pullRequestData.body || '',
        maintainer_can_modify: pullRequestData.maintainerCanModify !== false,
        draft: pullRequestData.draft || false
      };
      
      const response = await client.post(`/repos/${owner}/${repo}/pulls`, payload);
      
      return {
        success: true,
        pullRequest: response.data
      };
    } catch (error) {
      logger.error('Error creating pull request:', error);
      return {
        success: false,
        error: this.handleAPIError(error)
      };
    }
  }

  /**
   * List pull requests
   */
  async listPullRequests(accessToken, owner, repo, options = {}) {
    try {
      const client = this.createAuthenticatedClient(accessToken);
      const params = {
        state: options.state || 'open',
        head: options.head,
        base: options.base,
        sort: options.sort || 'created',
        direction: options.direction || 'desc',
        per_page: options.perPage || 30,
        page: options.page || 1
      };
      
      const response = await client.get(`/repos/${owner}/${repo}/pulls`, { params });
      
      return {
        success: true,
        pullRequests: response.data,
        pagination: this.extractPaginationInfo(response.headers)
      };
    } catch (error) {
      logger.error('Error listing pull requests:', error);
      return {
        success: false,
        error: this.handleAPIError(error)
      };
    }
  }

  /**
   * Get repository collaborators
   */
  async listCollaborators(accessToken, owner, repo, options = {}) {
    try {
      const client = this.createAuthenticatedClient(accessToken);
      const params = {
        affiliation: options.affiliation || 'all',
        per_page: options.perPage || 30,
        page: options.page || 1
      };
      
      const response = await client.get(`/repos/${owner}/${repo}/collaborators`, { params });
      
      return {
        success: true,
        collaborators: response.data,
        pagination: this.extractPaginationInfo(response.headers)
      };
    } catch (error) {
      logger.error('Error listing collaborators:', error);
      return {
        success: false,
        error: this.handleAPIError(error)
      };
    }
  }

  /**
   * Search repositories
   */
  async searchRepositories(accessToken, query, options = {}) {
    try {
      const client = this.createAuthenticatedClient(accessToken);
      const params = {
        q: query,
        sort: options.sort || 'updated',
        order: options.order || 'desc',
        per_page: options.perPage || 30,
        page: options.page || 1
      };
      
      const response = await client.get('/search/repositories', { params });
      
      return {
        success: true,
        repositories: response.data.items,
        totalCount: response.data.total_count,
        pagination: this.extractPaginationInfo(response.headers)
      };
    } catch (error) {
      logger.error('Error searching repositories:', error);
      return {
        success: false,
        error: this.handleAPIError(error)
      };
    }
  }

  /**
   * Get repository contents
   */
  async getContents(accessToken, owner, repo, path = '', options = {}) {
    try {
      const client = this.createAuthenticatedClient(accessToken);
      const params = {
        ref: options.ref
      };
      
      const response = await client.get(`/repos/${owner}/${repo}/contents/${path}`, { params });
      
      return {
        success: true,
        contents: response.data
      };
    } catch (error) {
      logger.error('Error getting repository contents:', error);
      return {
        success: false,
        error: this.handleAPIError(error)
      };
    }
  }

  /**
   * Create or update file contents
   */
  async createOrUpdateFile(accessToken, owner, repo, path, fileData) {
    try {
      const client = this.createAuthenticatedClient(accessToken);
      
      const payload = {
        message: fileData.message,
        content: Buffer.from(fileData.content).toString('base64'),
        branch: fileData.branch,
        sha: fileData.sha // Required for updates
      };
      
      if (fileData.committer) {
        payload.committer = fileData.committer;
      }
      
      if (fileData.author) {
        payload.author = fileData.author;
      }
      
      const response = await client.put(`/repos/${owner}/${repo}/contents/${path}`, payload);
      
      return {
        success: true,
        file: response.data
      };
    } catch (error) {
      logger.error('Error creating/updating file:', error);
      return {
        success: false,
        error: this.handleAPIError(error)
      };
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(accessToken, owner, repo, path, fileData) {
    try {
      const client = this.createAuthenticatedClient(accessToken);
      
      const payload = {
        message: fileData.message,
        sha: fileData.sha, // Required
        branch: fileData.branch
      };
      
      if (fileData.committer) {
        payload.committer = fileData.committer;
      }
      
      if (fileData.author) {
        payload.author = fileData.author;
      }
      
      const response = await client.delete(`/repos/${owner}/${repo}/contents/${path}`, { data: payload });
      
      return {
        success: true,
        result: response.data
      };
    } catch (error) {
      logger.error('Error deleting file:', error);
      return {
        success: false,
        error: this.handleAPIError(error)
      };
    }
  }

  /**
   * Extract pagination information from response headers
   */
  extractPaginationInfo(headers) {
    const linkHeader = headers.link;
    if (!linkHeader) {
      return null;
    }
    
    const pagination = {};
    const links = linkHeader.split(',');
    
    for (const link of links) {
      const match = link.match(/<([^>]+)>;\s*rel="([^"]+)"/);
      if (match) {
        const url = new URL(match[1]);
        const page = parseInt(url.searchParams.get('page'));
        pagination[match[2]] = page;
      }
    }
    
    return pagination;
  }

  /**
   * Handle API errors and return user-friendly messages
   */
  handleAPIError(error) {
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          return 'Authentication failed. Please check your GitHub token.';
        case 403:
          if (data.message && data.message.includes('rate limit')) {
            return 'GitHub API rate limit exceeded. Please try again later.';
          }
          return 'Access forbidden. You may not have permission to perform this action.';
        case 404:
          return 'Repository or resource not found.';
        case 422:
          return data.message || 'Validation failed. Please check your input.';
        default:
          return data.message || `GitHub API error: ${status}`;
      }
    } else if (error.request) {
      return 'Network error. Please check your internet connection.';
    } else {
      return error.message || 'An unexpected error occurred.';
    }
  }

  /**
   * Validate GitHub token
   */
  async validateToken(accessToken) {
    try {
      const result = await this.getAuthenticatedUser(accessToken);
      return result.success;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get rate limit information
   */
  async getRateLimit(accessToken) {
    try {
      const client = this.createAuthenticatedClient(accessToken);
      const response = await client.get('/rate_limit');
      
      return {
        success: true,
        rateLimit: response.data
      };
    } catch (error) {
      logger.error('Error getting rate limit:', error);
      return {
        success: false,
        error: this.handleAPIError(error)
      };
    }
  }
}

// Create singleton instance
const githubAPI = new GitHubAPI();

module.exports = githubAPI;