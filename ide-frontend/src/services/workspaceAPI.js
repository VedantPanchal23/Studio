import { api } from './api';

/**
 * Workspace API service
 * Handles all workspace-related API calls
 */

/**
 * Get list of user workspaces
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @param {string} params.search - Search query
 * @param {string} params.sortBy - Sort field
 * @param {string} params.sortOrder - Sort order (asc/desc)
 * @param {boolean} params.includeArchived - Include archived workspaces
 * @returns {Promise} API response
 */
export const getWorkspaces = async (params = {}) => {
  try {
    const response = await api.get('/workspaces', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    throw error;
  }
};

/**
 * Get workspace details by ID
 * @param {string} workspaceId - Workspace ID
 * @returns {Promise} API response
 */
export const getWorkspace = async (workspaceId) => {
  try {
    const response = await api.get(`/workspaces/${workspaceId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching workspace:', error);
    throw error;
  }
};

/**
 * Create new workspace
 * @param {Object} workspaceData - Workspace data
 * @param {string} workspaceData.name - Workspace name
 * @param {string} workspaceData.description - Workspace description
 * @param {boolean} workspaceData.isPublic - Is workspace public
 * @param {Object} workspaceData.settings - Workspace settings
 * @returns {Promise} API response
 */
export const createWorkspace = async (workspaceData) => {
  try {
    const response = await api.post('/workspaces', workspaceData);
    return response.data;
  } catch (error) {
    console.error('Error creating workspace:', error);
    throw error;
  }
};

/**
 * Update workspace
 * @param {string} workspaceId - Workspace ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise} API response
 */
export const updateWorkspace = async (workspaceId, updates) => {
  try {
    const response = await api.put(`/workspaces/${workspaceId}`, updates);
    return response.data;
  } catch (error) {
    console.error('Error updating workspace:', error);
    throw error;
  }
};

/**
 * Delete workspace (archive or permanent)
 * @param {string} workspaceId - Workspace ID
 * @param {boolean} permanent - Permanently delete (default: false - archive)
 * @returns {Promise} API response
 */
export const deleteWorkspace = async (workspaceId, permanent = false) => {
  try {
    const params = permanent ? { permanent: 'true' } : {};
    const response = await api.delete(`/workspaces/${workspaceId}`, { params });
    return response.data;
  } catch (error) {
    console.error('Error deleting workspace:', error);
    throw error;
  }
};

/**
 * Duplicate workspace
 * @param {string} workspaceId - Source workspace ID
 * @param {string} name - New workspace name
 * @returns {Promise} API response
 */
export const duplicateWorkspace = async (workspaceId, name) => {
  try {
    const response = await api.post(`/workspaces/${workspaceId}/duplicate`, { name });
    return response.data;
  } catch (error) {
    console.error('Error duplicating workspace:', error);
    throw error;
  }
};

/**
 * Restore archived workspace
 * @param {string} workspaceId - Workspace ID
 * @returns {Promise} API response
 */
export const restoreWorkspace = async (workspaceId) => {
  try {
    const response = await api.post(`/workspaces/${workspaceId}/restore`);
    return response.data;
  } catch (error) {
    console.error('Error restoring workspace:', error);
    throw error;
  }
};

/**
 * Add collaborator to workspace
 * @param {string} workspaceId - Workspace ID
 * @param {string} email - Collaborator email
 * @param {string} role - Collaborator role (owner/editor/viewer)
 * @returns {Promise} API response
 */
export const addCollaborator = async (workspaceId, email, role = 'viewer') => {
  try {
    const response = await api.post(`/workspaces/${workspaceId}/collaborators`, {
      email,
      role
    });
    return response.data;
  } catch (error) {
    console.error('Error adding collaborator:', error);
    throw error;
  }
};

/**
 * Update collaborator role
 * @param {string} workspaceId - Workspace ID
 * @param {string} userId - User ID
 * @param {string} role - New role
 * @returns {Promise} API response
 */
export const updateCollaboratorRole = async (workspaceId, userId, role) => {
  try {
    const response = await api.put(`/workspaces/${workspaceId}/collaborators/${userId}`, {
      role
    });
    return response.data;
  } catch (error) {
    console.error('Error updating collaborator role:', error);
    throw error;
  }
};

/**
 * Remove collaborator from workspace
 * @param {string} workspaceId - Workspace ID
 * @param {string} userId - User ID
 * @returns {Promise} API response
 */
export const removeCollaborator = async (workspaceId, userId) => {
  try {
    const response = await api.delete(`/workspaces/${workspaceId}/collaborators/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error removing collaborator:', error);
    throw error;
  }
};

/**
 * Get public workspaces
 * @param {Object} params - Query parameters
 * @returns {Promise} API response
 */
export const getPublicWorkspaces = async (params = {}) => {
  try {
    const response = await api.get('/workspaces/public/list', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching public workspaces:', error);
    throw error;
  }
};

/**
 * Get workspace statistics
 * @returns {Promise} API response
 */
export const getWorkspaceStats = async () => {
  try {
    const response = await api.get('/workspaces/stats/overview');
    return response.data;
  } catch (error) {
    console.error('Error fetching workspace stats:', error);
    throw error;
  }
};

export default {
  getWorkspaces,
  getWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  duplicateWorkspace,
  restoreWorkspace,
  addCollaborator,
  updateCollaboratorRole,
  removeCollaborator,
  getPublicWorkspaces,
  getWorkspaceStats
};