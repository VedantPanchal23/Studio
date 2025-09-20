import React, { useEffect, useState } from 'react'
import { lspService } from '../../services/lspService'

/**
 * Simple test component to verify LSP integration
 */
export function LSPIntegrationTest() {
  const [lspStatus, setLspStatus] = useState('Initializing...')
  const [supportedLanguages, setSupportedLanguages] = useState([])
  const [activeServers, setActiveServers] = useState([])

  useEffect(() => {
    const testLSPIntegration = async () => {
      try {
        // Initialize LSP service
        lspService.initialize()
        setLspStatus('LSP Service initialized')

        // Test getting supported languages
        const languages = lspService.getSupportedLanguages?.() || []
        setSupportedLanguages(languages)

        // Test getting active servers
        const servers = lspService.getActiveServers?.() || []
        setActiveServers(servers)

        setLspStatus('LSP Integration test completed successfully')
      } catch (error) {
        setLspStatus(`LSP Integration test failed: ${error.message}`)
        console.error('LSP Integration test error:', error)
      }
    }

    testLSPIntegration()
  }, [])

  return (
    <div className="p-4 bg-slate-800 text-white rounded">
      <h3 className="text-lg font-semibold mb-4">LSP Integration Test</h3>
      
      <div className="mb-4">
        <strong>Status:</strong> {lspStatus}
      </div>

      <div className="mb-4">
        <strong>Supported Languages:</strong>
        <ul className="list-disc list-inside ml-4">
          {supportedLanguages.map(lang => (
            <li key={lang}>{lang}</li>
          ))}
        </ul>
      </div>

      <div className="mb-4">
        <strong>Active Servers:</strong>
        {activeServers.length > 0 ? (
          <ul className="list-disc list-inside ml-4">
            {activeServers.map(server => (
              <li key={server.serverId}>
                {server.name} ({server.language}) - {server.status}
              </li>
            ))}
          </ul>
        ) : (
          <p className="ml-4 text-gray-400">No active servers</p>
        )}
      </div>
    </div>
  )
}

export default LSPIntegrationTest