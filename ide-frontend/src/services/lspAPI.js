import { api } from './api'

/**
 * LSP API service for managing Language Server Protocol servers
 */
export class LSPAPI {
  /**
   * Get list of supported programming languages
   * @returns {Promise<Object>} API response with supported languages
   */
  static async getSupportedLanguages() {
    try {
      const response = await api.get('/lsp/languages')
      return response.data
    } catch (error) {
      console.error('Failed to get supported languages:', error)
      throw error
    }
  }

  /**
   * Get list of active LSP servers
   * @returns {Promise<Object>} API response with active servers
   */
  static async getActiveServers() {
    try {
      const response = await api.get('/lsp/servers')
      return response.data
    } catch (error) {
      console.error('Failed to get active servers:', error)
      throw error
    }
  }

  /**
   * Start an LSP server for a specific language
   * @param {string} language - Programming language
   * @param {string} workspaceRoot - Workspace root directory
   * @returns {Promise<Object>} API response with server information
   */
  static async startServer(language, workspaceRoot) {
    try {
      const response = await api.post('/lsp/servers', {
        language,
        workspaceRoot
      })
      return response.data
    } catch (error) {
      console.error('Failed to start LSP server:', error)
      throw error
    }
  }

  /**
   * Stop an LSP server
   * @param {string} serverId - Server ID
   * @returns {Promise<Object>} API response
   */
  static async stopServer(serverId) {
    try {
      const response = await api.delete(`/lsp/servers/${serverId}`)
      return response.data
    } catch (error) {
      console.error('Failed to stop LSP server:', error)
      throw error
    }
  }

  /**
   * Get LSP server status
   * @param {string} serverId - Server ID
   * @returns {Promise<Object>} API response with server status
   */
  static async getServerStatus(serverId) {
    try {
      const response = await api.get(`/lsp/servers/${serverId}/status`)
      return response.data
    } catch (error) {
      console.error('Failed to get server status:', error)
      throw error
    }
  }

  /**
   * Check if LSP server executable is available for a language
   * @param {string} language - Programming language
   * @returns {Promise<Object>} API response with availability status
   */
  static async checkExecutable(language) {
    try {
      const response = await api.post('/lsp/check-executable', {
        language
      })
      return response.data
    } catch (error) {
      console.error('Failed to check LSP executable:', error)
      throw error
    }
  }

  /**
   * Shutdown all LSP servers
   * @returns {Promise<Object>} API response
   */
  static async shutdownAll() {
    try {
      const response = await api.post('/lsp/shutdown')
      return response.data
    } catch (error) {
      console.error('Failed to shutdown LSP servers:', error)
      throw error
    }
  }
}

export default LSPAPI