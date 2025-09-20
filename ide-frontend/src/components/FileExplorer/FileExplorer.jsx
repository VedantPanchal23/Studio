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

export function FileExplorer({ onFileOpen, workspaceId }) {
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

  // Set workspace and load files when workspace changes
  useEffect(() => {
    if (activeWorkspaceId) {
      setCurrentWorkspace(activeWorkspaceId)
      loadFiles()
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
    <div className="h-full bg-slate-800 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        <h2 className="text-sm font-medium text-slate-200">Explorer</h2>
        <div className="flex items-center space-x-1">
          <button 
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
            title="New File"
            onClick={handleCreateFile}
          >
            <Plus className="w-4 h-4" />
          </button>
          <button 
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
            title="New Folder"
            onClick={handleCreateFolder}
          >
            <FolderPlus className="w-4 h-4" />
          </button>
          <button 
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
            title="Upload Files"
            onClick={handleFileUpload}
          >
            <Upload className="w-4 h-4" />
          </button>
          <button 
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
            title="Refresh"
            onClick={refreshFiles}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="p-2 border-b border-slate-700 space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full pl-8 pr-3 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleSort('name')}
              className={`px-2 py-1 text-xs rounded ${sortBy === 'name' ? 'bg-slate-600 text-slate-200' : 'text-slate-400 hover:text-slate-200'}`}
              title="Sort by name"
            >
              Name {sortBy === 'name' && (sortOrder === 'asc' ? <SortAsc className="inline w-3 h-3" /> : <SortDesc className="inline w-3 h-3" />)}
            </button>
            <button
              onClick={() => handleSort('modified')}
              className={`px-2 py-1 text-xs rounded ${sortBy === 'modified' ? 'bg-slate-600 text-slate-200' : 'text-slate-400 hover:text-slate-200'}`}
              title="Sort by modified date"
            >
              Modified {sortBy === 'modified' && (sortOrder === 'asc' ? <SortAsc className="inline w-3 h-3" /> : <SortDesc className="inline w-3 h-3" />)}
            </button>
          </div>
          
          <button
            onClick={toggleHiddenFiles}
            className={`p-1 rounded ${showHiddenFiles ? 'text-slate-200' : 'text-slate-400'} hover:text-slate-200`}
            title={showHiddenFiles ? 'Hide hidden files' : 'Show hidden files'}
          >
            {showHiddenFiles ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-2 bg-red-900/20 border-b border-red-800 text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-300 hover:text-red-200">
            ×
          </button>
        </div>
      )}

      {/* File tree */}
      <div className="flex-1 overflow-y-auto">
        {loading && files.length === 0 ? (
          <div className="p-4 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading files...
          </div>
        ) : files.length === 0 ? (
          <div className="p-4 text-center text-slate-400">
            <Folder className="w-8 h-8 mx-auto mb-2" />
            <p>No files in workspace</p>
            <button 
              onClick={handleCreateFile}
              className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
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
            <ContextMenuItem onClick={handleCreateFile} icon={<Plus className="w-4 h-4" />}>
              New File
            </ContextMenuItem>
            <ContextMenuItem onClick={handleCreateFolder} icon={<FolderPlus className="w-4 h-4" />}>
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
            <ContextMenuItem onClick={() => handleDelete(contextMenu.item)} className="text-red-400">
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