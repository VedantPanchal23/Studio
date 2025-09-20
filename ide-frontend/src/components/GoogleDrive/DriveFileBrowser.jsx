import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Search, 
  Folder, 
  File, 
  Download, 
  Upload, 
  Trash2, 
  MoreHorizontal,
  ArrowLeft,
  Loader2,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code,
  RefreshCw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import useDriveStore from '../../stores/driveStore';
import { formatBytes, formatDate } from '../../utils/formatters';
import styles from './DriveFileBrowser.module.css';

const DriveFileBrowser = ({ workspaceId, onFileImport }) => {
  const {
    files,
    currentFolder,
    selectedFiles,
    searchResults,
    isLoading,
    error,
    loadFiles,
    searchFiles,
    downloadFile,
    deleteFile,
    createFolder,
    setSelectedFiles,
    importFromDrive
  } = useDriveStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [folderPath, setFolderPath] = useState([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      await searchFiles(searchQuery);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    loadFiles(currentFolder);
  };

  const handleFolderClick = async (folder) => {
    try {
      await loadFiles(folder.id);
      setFolderPath([...folderPath, { id: folder.id, name: folder.name }]);
    } catch (error) {
      console.error('Failed to load folder:', error);
    }
  };

  const handleBackClick = async () => {
    const newPath = folderPath.slice(0, -1);
    const parentId = newPath.length > 0 ? newPath[newPath.length - 1].id : null;
    
    try {
      await loadFiles(parentId);
      setFolderPath(newPath);
    } catch (error) {
      console.error('Failed to navigate back:', error);
    }
  };

  const handleFileSelect = (file) => {
    const isSelected = selectedFiles.some(f => f.id === file.id);
    if (isSelected) {
      setSelectedFiles(selectedFiles.filter(f => f.id !== file.id));
    } else {
      setSelectedFiles([...selectedFiles, file]);
    }
  };

  const handleDownloadFile = async (file) => {
    try {
      const fileData = await downloadFile(file.id);
      
      // Create download link
      const blob = new Blob([atob(fileData.content)], { type: fileData.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileData.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleImportFile = async (file) => {
    try {
      const fileData = await downloadFile(file.id);
      
      if (onFileImport) {
        onFileImport({
          name: fileData.name,
          content: atob(fileData.content),
          mimeType: fileData.mimeType
        });
      }
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  const handleImportFolder = async (folder) => {
    try {
      await importFromDrive(workspaceId, folder.id);
      // Show success message or refresh workspace
    } catch (error) {
      console.error('Folder import failed:', error);
    }
  };

  const handleDeleteFile = async (file) => {
    if (window.confirm(`Are you sure you want to delete "${file.name}"?`)) {
      try {
        await deleteFile(file.id);
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      await createFolder(newFolderName, currentFolder);
      setNewFolderName('');
      setShowCreateFolder(false);
    } catch (error) {
      console.error('Create folder failed:', error);
    }
  };

  const getFileIcon = (file) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      return <Folder className={`${styles.fileIcon} ${styles.folderIcon}`} />;
    }

    const mimeType = file.mimeType.toLowerCase();
    
    if (mimeType.startsWith('image/')) {
      return <Image className={`${styles.fileIcon} ${styles.imageIcon}`} />;
    }
    
    if (mimeType.startsWith('video/')) {
      return <Video className={`${styles.fileIcon} ${styles.videoIcon}`} />;
    }
    
    if (mimeType.startsWith('audio/')) {
      return <Music className={`${styles.fileIcon} ${styles.musicIcon}`} />;
    }
    
    if (mimeType.includes('zip') || mimeType.includes('archive')) {
      return <Archive className={`${styles.fileIcon} ${styles.archiveIcon}`} />;
    }
    
    if (mimeType.includes('javascript') || mimeType.includes('typescript') || 
        mimeType.includes('python') || mimeType.includes('java')) {
      return <Code className={`${styles.fileIcon} ${styles.codeIcon}`} />;
    }
    
    if (mimeType.includes('text') || mimeType.includes('json') || mimeType.includes('xml')) {
      return <FileText className={`${styles.fileIcon} ${styles.textIcon}`} />;
    }
    
    return <File className={`${styles.fileIcon} ${styles.defaultIcon}`} />;
  };

  const displayFiles = searchQuery ? searchResults : files;

  return (
    <div className={styles.browser}>
      {/* Search and Navigation */}
      <div className={styles.header}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <Input
            placeholder="Search files in Drive..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          <Button type="submit" disabled={isSearching || !searchQuery.trim()} className={styles.searchButton}>
            {isSearching ? (
              <Loader2 className={styles.loadingIcon} />
            ) : (
              <Search className={styles.searchIcon} />
            )}
          </Button>
          {searchQuery && (
            <Button variant="outline" onClick={handleClearSearch}>
              Clear
            </Button>
          )}
        </form>
        
        <Button
          variant="outline"
          onClick={() => loadFiles(currentFolder)}
          disabled={isLoading}
          className={styles.refreshButton}
        >
          <RefreshCw className={`${styles.refreshIcon} ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Breadcrumb Navigation */}
      {folderPath.length > 0 && !searchQuery && (
        <div className={styles.navigation}>
          <div className={styles.breadcrumb}>
            <button className={styles.backButton} onClick={handleBackClick}>
              <ArrowLeft className={styles.backIcon} />
              Back
            </button>
            <span>/</span>
            {folderPath.map((folder, index) => (
              <React.Fragment key={folder.id}>
                <span>{folder.name}</span>
                {index < folderPath.length - 1 && <span>/</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className={styles.controls}>
        <div className={styles.controlsLeft}>
          {selectedFiles.length > 0 && (
            <Badge variant="secondary">
              {selectedFiles.length} selected
            </Badge>
          )}
        </div>
        
        <div className={styles.controlsRight}>
          {!searchQuery && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateFolder(true)}
              className={styles.createButton}
            >
              <Folder className={styles.createIcon} />
              New Folder
            </Button>
          )}
        </div>
      </div>

      {/* Create Folder Form */}
      {showCreateFolder && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Folder</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateFolder} className={styles.createForm}>
              <Input
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className={styles.grow}
                autoFocus
              />
              <Button type="submit" disabled={!newFolderName.trim()}>
                Create
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowCreateFolder(false);
                  setNewFolderName('');
                }}
              >
                Cancel
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert className={styles.errorAlert}>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Files List */}
      <Card>
        <CardContent className={styles.cardContent}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <Loader2 className={styles.loadingIcon} />
              <span>Loading files...</span>
            </div>
          ) : displayFiles.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyDescription}>
                {searchQuery ? 'No files found matching your search.' : 'No files in this folder.'}
              </div>
            </div>
          ) : (
            <div className={styles.fileListView}>
              {displayFiles.map((file) => (
                <div
                  key={file.id}
                  className={`${styles.fileItem} ${
                    selectedFiles.some(f => f.id === file.id) ? styles.selected : ''
                  }`}
                  onClick={() => handleFileSelect(file)}
                >
                  <div className={styles.fileItemContent}>
                    {getFileIcon(file)}
                    <div className={styles.fileItemInfo}>
                      <p className={styles.fileItemName}>
                        {file.name}
                      </p>
                      <p className={styles.fileItemMeta}>
                        {file.size && formatBytes(parseInt(file.size))} • {formatDate(file.modifiedTime)}
                      </p>
                    </div>
                  </div>

                  <div className={styles.fileActions}>
                    {file.mimeType === 'application/vnd.google-apps.folder' ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFolderClick(file);
                          }}
                        >
                          Open
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleImportFolder(file);
                          }}
                        >
                          <Download className={styles.createIcon} />
                          Import
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleImportFile(file);
                          }}
                        >
                          <Upload className={styles.createIcon} />
                          Import
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadFile(file);
                          }}
                        >
                          <Download className={styles.createIcon} />
                        </Button>
                      </>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className={styles.createIcon} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(file);
                          }}
                          className={styles.errorText}
                        >
                          <Trash2 className={styles.createIcon} />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DriveFileBrowser;