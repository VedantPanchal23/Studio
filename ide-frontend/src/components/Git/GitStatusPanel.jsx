import React, { useState } from 'react';
import { 
  Plus, 
  Minus, 
  FileText, 
  FilePlus, 
  FileX, 
  FileEdit,
  MoreHorizontal,
  CheckSquare,
  Square
} from 'lucide-react';

import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

import useGitStore from '../../stores/gitStore';
import useWorkspaceStore from '../../stores/workspaceStore';

const GitStatusPanel = () => {
  const [selectedFiles, setSelectedFiles] = useState(new Set());

  const {
    stagedFiles,
    modifiedFiles,
    untrackedFiles,
    isLoading,
    stageFiles,
    unstageFiles
  } = useGitStore();

  const { currentWorkspace } = useWorkspaceStore();

  const getFileIcon = (status) => {
    switch (status) {
      case 'untracked':
        return <FilePlus className="h-4 w-4 text-green-500" />;
      case 'modified':
      case 'modified_staged':
      case 'modified_both':
        return <FileEdit className="h-4 w-4 text-yellow-500" />;
      case 'deleted':
      case 'deleted_staged':
        return <FileX className="h-4 w-4 text-red-500" />;
      case 'added':
        return <FilePlus className="h-4 w-4 text-green-500" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'untracked': { label: 'U', variant: 'secondary', color: 'text-green-600' },
      'modified': { label: 'M', variant: 'secondary', color: 'text-yellow-600' },
      'modified_staged': { label: 'M', variant: 'default', color: 'text-yellow-600' },
      'modified_both': { label: 'MM', variant: 'destructive', color: 'text-red-600' },
      'added': { label: 'A', variant: 'default', color: 'text-green-600' },
      'deleted': { label: 'D', variant: 'secondary', color: 'text-red-600' },
      'deleted_staged': { label: 'D', variant: 'default', color: 'text-red-600' },
      'renamed': { label: 'R', variant: 'secondary', color: 'text-blue-600' },
      'copied': { label: 'C', variant: 'secondary', color: 'text-blue-600' }
    };

    const config = statusMap[status] || { label: '?', variant: 'outline', color: 'text-muted-foreground' };
    
    return (
      <Badge variant={config.variant} className={`text-xs ${config.color}`}>
        {config.label}
      </Badge>
    );
  };

  const handleFileSelect = (filePath, checked) => {
    const newSelected = new Set(selectedFiles);
    if (checked) {
      newSelected.add(filePath);
    } else {
      newSelected.delete(filePath);
    }
    setSelectedFiles(newSelected);
  };

  const handleSelectAll = (files, checked) => {
    const newSelected = new Set(selectedFiles);
    files.forEach(file => {
      if (checked) {
        newSelected.add(file.path);
      } else {
        newSelected.delete(file.path);
      }
    });
    setSelectedFiles(newSelected);
  };

  const handleStageSelected = async () => {
    if (selectedFiles.size > 0 && currentWorkspace?.id) {
      const filesToStage = Array.from(selectedFiles);
      await stageFiles(currentWorkspace.id, filesToStage);
      setSelectedFiles(new Set());
    }
  };

  const handleUnstageSelected = async () => {
    if (selectedFiles.size > 0 && currentWorkspace?.id) {
      const filesToUnstage = Array.from(selectedFiles);
      await unstageFiles(currentWorkspace.id, filesToUnstage);
      setSelectedFiles(new Set());
    }
  };

  const handleStageAll = async () => {
    if (currentWorkspace?.id) {
      await stageFiles(currentWorkspace.id, []);
      setSelectedFiles(new Set());
    }
  };

  const handleUnstageAll = async () => {
    if (currentWorkspace?.id) {
      await unstageFiles(currentWorkspace.id, []);
      setSelectedFiles(new Set());
    }
  };

  const FileItem = ({ file, isStaged = false }) => {
    const isSelected = selectedFiles.has(file.path);
    
    return (
      <div className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-sm group">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => handleFileSelect(file.path, checked)}
        />
        
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {getFileIcon(file.status)}
          <span className="text-sm truncate" title={file.path}>
            {file.path}
          </span>
          {getStatusBadge(file.status)}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isStaged ? (
              <DropdownMenuItem onClick={() => unstageFiles(currentWorkspace?.id, [file.path])}>
                <Minus className="h-4 w-4 mr-2" />
                Unstage
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => stageFiles(currentWorkspace?.id, [file.path])}>
                <Plus className="h-4 w-4 mr-2" />
                Stage
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const SectionHeader = ({ title, files, isStaged = false }) => {
    const allSelected = files.every(file => selectedFiles.has(file.path));
    const someSelected = files.some(file => selectedFiles.has(file.path));
    
    return (
      <div className="flex items-center justify-between p-2 bg-muted/30">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected && !allSelected;
            }}
            onCheckedChange={(checked) => handleSelectAll(files, checked)}
          />
          <span className="text-sm font-medium">{title}</span>
          <Badge variant="outline" className="text-xs">
            {files.length}
          </Badge>
        </div>
        
        {files.length > 0 && (
          <div className="flex items-center gap-1">
            {isStaged ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => unstageFiles(currentWorkspace?.id, files.map(f => f.path))}
                disabled={isLoading}
              >
                <Minus className="h-3 w-3 mr-1" />
                Unstage All
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => stageFiles(currentWorkspace?.id, files.map(f => f.path))}
                disabled={isLoading}
              >
                <Plus className="h-3 w-3 mr-1" />
                Stage All
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  const hasChanges = stagedFiles.length > 0 || modifiedFiles.length > 0 || untrackedFiles.length > 0;

  if (!hasChanges) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center space-y-2">
          <CheckSquare className="h-12 w-12 mx-auto text-green-500" />
          <h3 className="text-lg font-medium">Working tree clean</h3>
          <p className="text-sm text-muted-foreground">
            No changes to commit. Your working directory is clean.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Action buttons */}
      {selectedFiles.size > 0 && (
        <div className="p-3 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedFiles.size} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStageSelected}
              disabled={isLoading}
            >
              <Plus className="h-3 w-3 mr-1" />
              Stage
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnstageSelected}
              disabled={isLoading}
            >
              <Minus className="h-3 w-3 mr-1" />
              Unstage
            </Button>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="space-y-1">
          {/* Staged Changes */}
          {stagedFiles.length > 0 && (
            <div>
              <SectionHeader 
                title="Staged Changes" 
                files={stagedFiles} 
                isStaged={true}
              />
              <div className="space-y-1">
                {stagedFiles.map((file) => (
                  <FileItem key={file.path} file={file} isStaged={true} />
                ))}
              </div>
            </div>
          )}

          {/* Separator */}
          {stagedFiles.length > 0 && (modifiedFiles.length > 0 || untrackedFiles.length > 0) && (
            <Separator className="my-2" />
          )}

          {/* Modified Files */}
          {modifiedFiles.length > 0 && (
            <div>
              <SectionHeader 
                title="Changes" 
                files={modifiedFiles} 
                isStaged={false}
              />
              <div className="space-y-1">
                {modifiedFiles.map((file) => (
                  <FileItem key={file.path} file={file} isStaged={false} />
                ))}
              </div>
            </div>
          )}

          {/* Untracked Files */}
          {untrackedFiles.length > 0 && (
            <div>
              <SectionHeader 
                title="Untracked Files" 
                files={untrackedFiles} 
                isStaged={false}
              />
              <div className="space-y-1">
                {untrackedFiles.map((file) => (
                  <FileItem key={file.path} file={file} isStaged={false} />
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick actions */}
      <div className="p-3 border-t bg-muted/10">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleStageAll}
            disabled={isLoading || (modifiedFiles.length === 0 && untrackedFiles.length === 0)}
            className="flex-1"
          >
            <Plus className="h-3 w-3 mr-1" />
            Stage All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUnstageAll}
            disabled={isLoading || stagedFiles.length === 0}
            className="flex-1"
          >
            <Minus className="h-3 w-3 mr-1" />
            Unstage All
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GitStatusPanel;