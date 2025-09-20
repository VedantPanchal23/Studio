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
      return <Folder className="h-5 w-5 text-blue-500" />;
    }

    const mimeType = file.mimeType.toLowerCase();
    
    if (mimeType.startsWith('image/')) {
      return <Image className="h-5 w-5 text-green-500" />;
    }
    
    if (mimeType.startsWith('video/')) {
      return <Video className="h-5 w-5 text-purple-500" />;
    }
    
    if (mimeType.startsWith('audio/')) {
      return <Music className="h-5 w-5 text-orange-500" />;
    }
    
    if (mimeType.includes('zip') || mimeType.includes('archive')) {
      return <Archive className="h-5 w-5 text-yellow-500" />;
    }
    
    if (mimeType.includes('javascript') || mimeType.includes('typescript') || 
        mimeType.includes('python') || mimeType.includes('java')) {
      return <Code className="h-5 w-5 text-indigo-500" />;
    }
    
    if (mimeType.includes('text') || mimeType.includes('json') || mimeType.includes('xml')) {
      return <FileText className="h-5 w-5 text-gray-500" />;
    }
    
    return <File className="h-5 w-5 text-gray-400" />;
  };

  const displayFiles = searchQuery ? searchResults : files;

  return (
    <div className="space-y-4">
      {/* Search and Navigation */}
      <div className="flex items-center space-x-2">
        <form onSubmit={handleSearch} className="flex-1 flex space-x-2">
          <Input
            placeholder="Search files in Drive..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={isSearching || !searchQuery.trim()}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
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
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Breadcrumb Navigation */}
      {folderPath.length > 0 && !searchQuery && (
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Button variant="ghost" size="sm" onClick={handleBackClick}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <span>/</span>
          {folderPath.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <span>{folder.name}</span>
              {index < folderPath.length - 1 && <span>/</span>}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {selectedFiles.length > 0 && (
            <Badge variant="secondary">
              {selectedFiles.length} selected
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {!searchQuery && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateFolder(true)}
            >
              <Folder className="h-4 w-4 mr-1" />
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
            <form onSubmit={handleCreateFolder} className="flex space-x-2">
              <Input
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="flex-1"
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
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Files List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading files...</span>
            </div>
          ) : displayFiles.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              {searchQuery ? 'No files found matching your search.' : 'No files in this folder.'}
            </div>
          ) : (
            <div className="divide-y">
              {displayFiles.map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center p-4 hover:bg-gray-50 cursor-pointer ${
                    selectedFiles.some(f => f.id === file.id) ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleFileSelect(file)}
                >
                  <div className="flex items-center flex-1 min-w-0">
                    {getFileIcon(file)}
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {file.size && formatBytes(parseInt(file.size))} • {formatDate(file.modifiedTime)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
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
                          <Download className="h-4 w-4 mr-1" />
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
                          <Upload className="h-4 w-4 mr-1" />
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
                          <Download className="h-4 w-4" />
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
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(file);
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
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