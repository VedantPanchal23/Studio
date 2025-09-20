import { 
  Folder, 
  File, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  MoreHorizontal,
  Search,
  FolderPlus,
  Upload,
  RefreshCw,
  SortAsc,
  SortDesc,
  Eye,
  EyeOff
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useFileStore } from '../../stores/fileStore'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { ContextMenu, ContextMenuItem, ContextMenuSeparator } from '../ui/ContextMenu'
import { FileTreeItem } from './FileTreeItem'
import { CreateItemModal } from './CreateItemModal'
import { RenameModal } from './RenameModal'
import styles from './FileExplorer.module.css'

function FileExplorer({ onFileOpen, workspaceId }) {
  // Workspace store
  const { currentWorkspaceId } = useWorkspaceStore()
  
  // Use provided workspaceId or fall back to current workspace
  const activeWorkspaceId = workspaceId || currentWorkspaceId

  // File store state
  const {
    files,
    loading,
    error,
    searchQuery,
    sortBy,
    sortOrder,
    showHiddenFiles,
    expandedFolders,
    selectedFile,
    setCurrentWorkspace,
    loadFiles,
    refreshFiles,
    createFile,
    createDirectory,
    deleteItem,
    renameItem,
    copyItem,
    uploadFiles,
    toggleFolder,
    selectFile,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    toggleHiddenFiles,
    getFilteredFiles,
    buildFileTree,
    clearError
  } = useFileStore()

  // Local state for UI
  const [contextMenu, setContextMenu] = useState({ isOpen: false, position: { x: 0, y: 0 }, item: null })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createType, setCreateType] = useState('file')
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [itemToRename, setItemToRename] = useState(null)
  const [draggedItem, setDraggedItem] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)
  const [isDragOver, setIsDragOver] = useState(false)
  
  const fileInputRef = useRef(null)
  const searchInputRef = useRef(null)

  // Set workspace and load files when workspace changes (with debounce to prevent rate limiting)
  useEffect(() => {
    if (activeWorkspaceId) {
      setCurrentWorkspace(activeWorkspaceId)
      
      // Debounce the loadFiles call to prevent rapid API requests
      const timer = setTimeout(() => {
        loadFiles()
      }, 300)
      
      return () => clearTimeout(timer)
    }
  }, [activeWorkspaceId, setCurrentWorkspace, loadFiles])

  // Handle file selection and opening
  const handleFileClick = (filePath, fileName, fileType) => {
    selectFile(filePath)
    
    // Only open files in editor, not directories
    if (fileType === 'file' && onFileOpen && !loading) {
      onFileOpen(filePath, fileName)
    }
  }

  // Handle folder toggle
  const handleFolderToggle = (folderPath) => {
    toggleFolder(folderPath)
  }

  // Context menu handlers
  const handleContextMenu = (e, item) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      item
    })
  }

  const closeContextMenu = () => {
    setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, item: null })
  }

  // File operations
  const handleCreateFile = () => {
    setCreateType('file')
    setShowCreateModal(true)
    closeContextMenu()
  }

  const handleCreateFolder = () => {
    setCreateType('directory')
    setShowCreateModal(true)
    closeContextMenu()
  }

  const handleRename = (item) => {
    setItemToRename(item)
    setShowRenameModal(true)
    closeContextMenu()
  }

  const handleDelete = async (item) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      await deleteItem(item.path)
    }
    closeContextMenu()
  }

  const handleCopy = async (item) => {
    const newPath = `${item.path}_copy`
    await copyItem(item.path, newPath)
    closeContextMenu()
  }

  // File upload
  const handleFileUpload = () => {
    fileInputRef.current?.click()
    closeContextMenu()
  }

  const handleFilesSelected = async (e) => {
    const files = e.target.files
    if (files && files.length > 0) {
      await uploadFiles(files)
    }
    // Reset input
    e.target.value = ''
  }

  // Drag and drop handlers
  const handleDragStart = (e, item) => {
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', item.path)
  }

  const handleDragOver = (e, item) => {
    e.preventDefault()
    if (item && item.type === 'directory' && draggedItem && draggedItem.path !== item.path) {
      setDropTarget(item)
      setIsDragOver(true)
    }
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
    setDropTarget(null)
  }

  const handleDrop = async (e, targetItem) => {
    e.preventDefault()
    setIsDragOver(false)
    
    if (draggedItem && targetItem && targetItem.type === 'directory') {
      const sourcePath = draggedItem.path
      const targetPath = `${targetItem.path}/${draggedItem.name}`
      
      if (sourcePath !== targetPath) {
        await renameItem(sourcePath, targetPath)
      }
    }
    
    setDraggedItem(null)
    setDropTarget(null)
  }

  // Search functionality
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') {
      setSearchQuery('')
      searchInputRef.current?.blur()
    }
  }

  // Sort functionality
  const handleSort = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(newSortBy)
      setSortOrder('asc')
    }
  }

  // Build file tree from flat file list
  const fileTree = buildFileTree(getFilteredFiles())

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>Explorer</h2>
        <div className={styles.headerActions}>
          <button 
            className={styles.actionButton}
            title="New File"
            onClick={handleCreateFile}
          >
            <Plus className={styles.actionIcon} />
          </button>
          <button 
            className={styles.actionButton}
            title="New Folder"
            onClick={handleCreateFolder}
          >
            <FolderPlus className={styles.actionIcon} />
          </button>
          <button 
            className={styles.actionButton}
            title="Upload Files"
            onClick={handleFileUpload}
          >
            <Upload className={styles.actionIcon} />
          </button>
          <button 
            className={styles.actionButton}
            title="Refresh"
            onClick={refreshFiles}
            disabled={loading}
          >
            <RefreshCw className={`${styles.actionIcon} ${loading ? styles.loadingIcon : ''}`} />
          </button>
        </div>
      </div>

      {/* Search and filters */}
      <div className={styles.searchSection}>
        <div className={styles.searchContainer}>
          <Search className={styles.searchIcon} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className={styles.searchInput}
          />
        </div>
        
        <div className={styles.controls}>
          <div className={styles.sortControls}>
            <button
              onClick={() => handleSort('name')}
              className={`${styles.sortButton} ${sortBy === 'name' ? styles.sortButtonActive : ''}`}
              title="Sort by name"
            >
              Name {sortBy === 'name' && (sortOrder === 'asc' ? <SortAsc className={styles.sortIcon} /> : <SortDesc className={styles.sortIcon} />)}
            </button>
            <button
              onClick={() => handleSort('modified')}
              className={`${styles.sortButton} ${sortBy === 'modified' ? styles.sortButtonActive : ''}`}
              title="Sort by modified date"
            >
              Modified {sortBy === 'modified' && (sortOrder === 'asc' ? <SortAsc className={styles.sortIcon} /> : <SortDesc className={styles.sortIcon} />)}
            </button>
          </div>
          
          <button
            onClick={toggleHiddenFiles}
            className={`${styles.toggleButton} ${showHiddenFiles ? styles.toggleButtonActive : ''}`}
            title={showHiddenFiles ? 'Hide hidden files' : 'Show hidden files'}
          >
            {showHiddenFiles ? <Eye className={styles.toggleIcon} /> : <EyeOff className={styles.toggleIcon} />}
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className={styles.errorBanner}>
          <span>{error}</span>
          <button onClick={clearError} className={styles.errorClose}>
            ×
          </button>
        </div>
      )}

      {/* File tree */}
      <div className={styles.fileList}>
        {loading && files.length === 0 ? (
          <div className={styles.loadingState}>
            <RefreshCw className={styles.loadingIcon} />
            Loading files...
          </div>
        ) : files.length === 0 ? (
          <div className={styles.emptyState}>
            <Folder className={styles.emptyIcon} />
            <p>No files in workspace</p>
            <button 
              onClick={handleCreateFile}
              className={styles.emptyLink}
            >
              Create your first file
            </button>
          </div>
        ) : (
          <FileTreeItem
            items={Object.values(fileTree)}
            depth={0}
            onFileClick={handleFileClick}
            onFolderToggle={handleFolderToggle}
            onContextMenu={handleContextMenu}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            selectedFile={selectedFile}
            expandedFolders={expandedFolders}
            draggedItem={draggedItem}
            dropTarget={dropTarget}
            isDragOver={isDragOver}
          />
        )}
      </div>

      {/* Hidden file input for uploads */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFilesSelected}
      />

      {/* Context Menu */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        onClose={closeContextMenu}
        position={contextMenu.position}
      >
        {contextMenu.item && (
          <>
            <ContextMenuItem onClick={handleCreateFile} icon={<Plus className={styles.contextMenuIcon} />}>
              New File
            </ContextMenuItem>
            <ContextMenuItem onClick={handleCreateFolder} icon={<FolderPlus className={styles.contextMenuIcon} />}>
              New Folder
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => handleRename(contextMenu.item)}>
              Rename
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleCopy(contextMenu.item)}>
              Copy
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => handleDelete(contextMenu.item)} className={styles.contextMenuDanger}>
              Delete
            </ContextMenuItem>
          </>
        )}
      </ContextMenu>

      {/* Create Item Modal */}
      <CreateItemModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        type={createType}
        onCreateFile={createFile}
        onCreateDirectory={createDirectory}
      />

      {/* Rename Modal */}
      <RenameModal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        item={itemToRename}
        onRename={renameItem}
      />
    </div>
  )
}

// Default export
export default FileExplorer;