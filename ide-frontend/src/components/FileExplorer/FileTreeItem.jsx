import { 
  Folder, 
  FolderOpen,
  ChevronRight, 
  ChevronDown, 
  MoreHorizontal 
} from 'lucide-react'
import { useFileStore } from '../../stores/fileStore'
import useEditorStore from '../../stores/editorStore'

export function FileTreeItem({
  items,
  depth = 0,
  onFileClick,
  onFolderToggle,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  selectedFile,
  expandedFolders,
  draggedItem,
  dropTarget,
  isDragOver
}) {
  const { getFileIcon, isExpanded, isSelected } = useFileStore()
  const { tabs } = useEditorStore()

  const renderItem = (item, index) => {
    const isFolder = item.type === 'directory'
    const isItemExpanded = isFolder && isExpanded(item.path)
    const isItemSelected = isSelected(item.path)
    const isDragging = draggedItem && draggedItem.path === item.path
    const isDropTarget = dropTarget && dropTarget.path === item.path
    
    // Check if file is open in editor
    const openTab = tabs.find(tab => tab.path === item.path)
    const isFileOpen = !!openTab
    const isFileModified = openTab?.modified || false

    return (
      <div key={`${item.path}-${index}`} className="select-none">
        <div 
          className={`
            flex items-center space-x-2 py-1 px-2 cursor-pointer group relative
            ${isItemSelected ? 'bg-slate-600' : 'hover:bg-slate-700'}
            ${isDragging ? 'opacity-50' : ''}
            ${isDropTarget && isDragOver ? 'bg-blue-900/30 border-l-2 border-blue-500' : ''}
          `}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          draggable={!isFolder || item.path !== ''}
          onClick={() => {
            if (isFolder) {
              onFolderToggle(item.path)
            } else {
              onFileClick(item.path, item.name, item.type)
            }
          }}
          onContextMenu={(e) => onContextMenu(e, item)}
          onDragStart={(e) => onDragStart(e, item)}
          onDragOver={(e) => onDragOver(e, item)}
          onDragLeave={onDragLeave}
          onDrop={(e) => onDrop(e, item)}
        >
          {/* Folder chevron */}
          {isFolder ? (
            <div className="flex items-center">
              {isItemExpanded ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
              {isItemExpanded ? (
                <FolderOpen className="w-4 h-4 text-blue-400 ml-1" />
              ) : (
                <Folder className="w-4 h-4 text-blue-400 ml-1" />
              )}
            </div>
          ) : (
            <>
              <div className="w-4" />
              <span className="text-sm">{getFileIcon(item.name, item.type)}</span>
            </>
          )}
          
          {/* File/folder name */}
          <span 
            className={`text-sm flex-1 truncate ${
              isFileOpen 
                ? isFileModified 
                  ? 'text-orange-300 font-medium' 
                  : 'text-blue-300'
                : 'text-slate-200'
            }`} 
            title={`${item.name}${isFileOpen ? ' (open)' : ''}${isFileModified ? ' (modified)' : ''}`}
          >
            {item.name}
          </span>
          
          {/* File status indicators */}
          {!isFolder && isFileOpen && (
            <div className="flex items-center space-x-1">
              {isFileModified && (
                <div 
                  className="w-1.5 h-1.5 bg-orange-400 rounded-full" 
                  title="File has unsaved changes"
                />
              )}
              <div 
                className="w-1.5 h-1.5 bg-blue-400 rounded-full" 
                title="File is open in editor"
              />
            </div>
          )}
          
          {/* File size for files */}
          {!isFolder && item.size && (
            <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100">
              {formatFileSize(item.size)}
            </span>
          )}
          
          {/* Context menu button */}
          <button 
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-600 rounded"
            onClick={(e) => {
              e.stopPropagation()
              onContextMenu(e, item)
            }}
          >
            <MoreHorizontal className="w-3 h-3 text-slate-400" />
          </button>
        </div>
        
        {/* Render children if folder is expanded */}
        {isFolder && isItemExpanded && item.children && Object.keys(item.children).length > 0 && (
          <FileTreeItem
            items={Object.values(item.children)}
            depth={depth + 1}
            onFileClick={onFileClick}
            onFolderToggle={onFolderToggle}
            onContextMenu={onContextMenu}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            selectedFile={selectedFile}
            expandedFolders={expandedFolders}
            draggedItem={draggedItem}
            dropTarget={dropTarget}
            isDragOver={isDragOver}
          />
        )}
      </div>
    )
  }

  return (
    <div>
      {items.map((item, index) => renderItem(item, index))}
    </div>
  )
}

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}