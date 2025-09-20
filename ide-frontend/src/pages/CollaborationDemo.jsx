import React, { useState, useEffect } from 'react'
import CollaborativeEditor from '../components/CollaborativeEditor'
import CollaborativeTextArea from '../components/CollaborativeTextArea'
import styles from './CollaborationDemo.module.css'

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
      <div className={styles.loading}>
        <div className={styles.loadingText}>Loading...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.maxWidth}>
        <h1 className={styles.title}>
          Collaboration Demo
        </h1>

        {/* User Info */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Current User</h2>
          <div className={styles.userInfoContainer}>
            <div
              className={styles.userAvatar}
              style={{ backgroundColor: '#007ACC' }}
            >
              {userInfo.name.charAt(0)}
            </div>
            <div>
              <div className={styles.userName}>{userInfo.name}</div>
              <div className={styles.userEmail}>{userInfo.email}</div>
              <div className={styles.userId}>ID: {userInfo.id}</div>
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Configuration</h2>
          <div className={`${styles.grid} ${styles.gridMd2}`}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Workspace ID
              </label>
              <input
                type="text"
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                File Path
              </label>
              <input
                type="text"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                className={styles.input}
              />
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className={styles.infoCard}>
          <h3 className={styles.infoTitle}>
            How to Test Collaboration
          </h3>
          <ol className={styles.infoList}>
            <li>Open this page in multiple browser tabs or windows</li>
            <li>Use the same Workspace ID and File Path in all tabs</li>
            <li>Start typing in either editor - changes should sync in real-time</li>
            <li>Move your cursor around to see cursor positions sync</li>
            <li>Select text to see selection highlighting</li>
            <li>Watch the user presence indicators in the top-right</li>
          </ol>
        </div>

        {/* Monaco Editor Demo */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Monaco Editor (Collaborative)</h2>
            <p className={styles.sectionDescription}>
              Full-featured code editor with syntax highlighting and IntelliSense
            </p>
          </div>
          <div className={styles.sectionContent}>
            <CollaborativeEditor
              workspaceId={workspaceId}
              filePath={filePath}
              language="javascript"
              theme="vs-dark"
              userInfo={userInfo}
              onContentChange={setEditorContent}
              className={styles.editorContainer}
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                wordWrap: 'on'
              }}
            />
            {editorContent && (
              <div className={styles.contentInfo}>
                <strong>Content length:</strong> {editorContent.length} characters
              </div>
            )}
          </div>
        </div>

        {/* TextArea Demo */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Collaborative TextArea</h2>
            <p className={styles.sectionDescription}>
              Simple textarea with real-time collaboration
            </p>
          </div>
          <div className={styles.sectionContent}>
            <CollaborativeTextArea
              workspaceId={workspaceId}
              filePath={`${filePath}.txt`}
              userInfo={userInfo}
              placeholder="Start typing in this collaborative textarea..."
              rows={8}
              onContentChange={setTextAreaContent}
              className={styles.textareaFull}
            />
            {textAreaContent && (
              <div className={styles.contentInfo}>
                <strong>Content length:</strong> {textAreaContent.length} characters
              </div>
            )}
          </div>
        </div>

        {/* Debug Info */}
        <div className={styles.debugCard}>
          <h3 className={styles.debugTitle}>Debug Information</h3>
          <div className={styles.debugGrid}>
            <div>
              <strong>Document ID (Editor):</strong><br />
              <code className={styles.debugCode}>{workspaceId}:{filePath}</code>
            </div>
            <div>
              <strong>Document ID (TextArea):</strong><br />
              <code className={styles.debugCode}>{workspaceId}:{filePath}.txt</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CollaborationDemo