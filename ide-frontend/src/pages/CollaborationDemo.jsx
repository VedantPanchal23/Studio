import React, { useState, useEffect } from 'react'
import CollaborativeEditor from '../components/CollaborativeEditor'
import CollaborativeTextArea from '../components/CollaborativeTextArea'

/**
 * Demo page for testing collaboration features
 */
const CollaborationDemo = () => {
  const [userInfo, setUserInfo] = useState(null)
  const [workspaceId, setWorkspaceId] = useState('demo-workspace')
  const [filePath, setFilePath] = useState('demo.js')
  const [editorContent, setEditorContent] = useState('')
  const [textAreaContent, setTextAreaContent] = useState('')

  // Mock user info (in real app, this would come from authentication)
  useEffect(() => {
    const mockUser = {
      id: `user-${Math.random().toString(36).substr(2, 9)}`,
      name: `User ${Math.floor(Math.random() * 1000)}`,
      email: `user${Math.floor(Math.random() * 1000)}@example.com`,
      avatar: null
    }
    setUserInfo(mockUser)
  }, [])

  if (!userInfo) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Collaboration Demo
        </h1>

        {/* User Info */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">Current User</h2>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium"
              style={{ backgroundColor: '#007ACC' }}
            >
              {userInfo.name.charAt(0)}
            </div>
            <div>
              <div className="font-medium">{userInfo.name}</div>
              <div className="text-sm text-gray-500">{userInfo.email}</div>
              <div className="text-xs text-gray-400">ID: {userInfo.id}</div>
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Workspace ID
              </label>
              <input
                type="text"
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                File Path
              </label>
              <input
                type="text"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            How to Test Collaboration
          </h3>
          <ol className="list-decimal list-inside text-blue-800 space-y-1">
            <li>Open this page in multiple browser tabs or windows</li>
            <li>Use the same Workspace ID and File Path in all tabs</li>
            <li>Start typing in either editor - changes should sync in real-time</li>
            <li>Move your cursor around to see cursor positions sync</li>
            <li>Select text to see selection highlighting</li>
            <li>Watch the user presence indicators in the top-right</li>
          </ol>
        </div>

        {/* Monaco Editor Demo */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Monaco Editor (Collaborative)</h2>
            <p className="text-sm text-gray-600">
              Full-featured code editor with syntax highlighting and IntelliSense
            </p>
          </div>
          <div className="p-4">
            <CollaborativeEditor
              workspaceId={workspaceId}
              filePath={filePath}
              language="javascript"
              theme="vs-dark"
              userInfo={userInfo}
              onContentChange={setEditorContent}
              className="h-96 border border-gray-300 rounded"
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                wordWrap: 'on'
              }}
            />
            {editorContent && (
              <div className="mt-4 p-3 bg-gray-100 rounded text-sm">
                <strong>Content length:</strong> {editorContent.length} characters
              </div>
            )}
          </div>
        </div>

        {/* TextArea Demo */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Collaborative TextArea</h2>
            <p className="text-sm text-gray-600">
              Simple textarea with real-time collaboration
            </p>
          </div>
          <div className="p-4">
            <CollaborativeTextArea
              workspaceId={workspaceId}
              filePath={`${filePath}.txt`}
              userInfo={userInfo}
              placeholder="Start typing in this collaborative textarea..."
              rows={8}
              onContentChange={setTextAreaContent}
              className="w-full"
            />
            {textAreaContent && (
              <div className="mt-4 p-3 bg-gray-100 rounded text-sm">
                <strong>Content length:</strong> {textAreaContent.length} characters
              </div>
            )}
          </div>
        </div>

        {/* Debug Info */}
        <div className="mt-6 bg-gray-100 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Debug Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Document ID (Editor):</strong><br />
              <code className="bg-white px-2 py-1 rounded">{workspaceId}:{filePath}</code>
            </div>
            <div>
              <strong>Document ID (TextArea):</strong><br />
              <code className="bg-white px-2 py-1 rounded">{workspaceId}:{filePath}.txt</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CollaborationDemo