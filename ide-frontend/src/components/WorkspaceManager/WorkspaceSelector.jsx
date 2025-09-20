import React, { useState, useEffect } from 'react';
import { ChevronDown, Plus, Search, Settings, Archive, Users } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { CreateWorkspaceDialog } from './CreateWorkspaceDialog';
import { WorkspaceSettingsDialog } from './WorkspaceSettingsDialog';

export const WorkspaceSelector = ({ onWorkspaceChange }) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const {
    currentWorkspace,
    workspaces,
    loading,
    fetchWorkspaces,
    setCurrentWorkspace,
    setFilters
  } = useWorkspaceStore();
  
  const { user } = useAuthStore();

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const filteredWorkspaces = workspaces.filter(workspace =>
    workspace.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    workspace.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleWorkspaceSelect = (workspace) => {
    setCurrentWorkspace(workspace._id);
    onWorkspaceChange?.(workspace);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    setFilters({ search: query });
  };

  const getRoleIcon = (workspace) => {
    if (workspace.owner?._id === user?.id) {
      return <Settings className="h-3 w-3" />;
    }
    return <Users className="h-3 w-3" />;
  };

  const getRoleBadge = (workspace) => {
    if (workspace.owner?._id === user?.id) {
      return 'Owner';
    }
    return workspace.userRole || 'Collaborator';
  };

  return (
    <div className="flex items-center space-x-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-64 justify-between">
            <div className="flex items-center space-x-2">
              {currentWorkspace ? (
                <>
                  {getRoleIcon(currentWorkspace)}
                  <span className="truncate">{currentWorkspace.name}</span>
                </>
              ) : (
                <span className="text-muted-foreground">Select workspace</span>
              )}
            </div>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent className="w-80" align="start">
          <DropdownMenuLabel>
            <div className="flex items-center justify-between">
              <span>Workspaces</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </DropdownMenuLabel>
          
          <div className="px-2 pb-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search workspaces..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          
          <DropdownMenuSeparator />
          
          {loading ? (
            <DropdownMenuItem disabled>
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span>Loading...</span>
              </div>
            </DropdownMenuItem>
          ) : filteredWorkspaces.length === 0 ? (
            <DropdownMenuItem disabled>
              <span className="text-muted-foreground">No workspaces found</span>
            </DropdownMenuItem>
          ) : (
            filteredWorkspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace._id}
                onClick={() => handleWorkspaceSelect(workspace)}
                className="flex items-center justify-between p-3"
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  {getRoleIcon(workspace)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium truncate">{workspace.name}</span>
                      {workspace.isArchived && (
                        <Archive className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    {workspace.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {workspace.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                    {getRoleBadge(workspace)}
                  </span>
                  {workspace.collaborators?.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      +{workspace.collaborators.length} collaborator{workspace.collaborators.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </DropdownMenuItem>
            ))
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create new workspace
          </DropdownMenuItem>
          
          {currentWorkspace && currentWorkspace.owner?._id === user?.id && (
            <DropdownMenuItem onClick={() => setIsSettingsDialogOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Workspace settings
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateWorkspaceDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {currentWorkspace && (
        <WorkspaceSettingsDialog
          workspace={currentWorkspace}
          open={isSettingsDialogOpen}
          onOpenChange={setIsSettingsDialogOpen}
        />
      )}
    </div>
  );
};

export default WorkspaceSelector;