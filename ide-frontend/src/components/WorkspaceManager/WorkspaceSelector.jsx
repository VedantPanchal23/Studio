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
import styles from './WorkspaceSelector.module.css';

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
      return <Settings className={styles.roleIcon} />;
    }
    return <Users className={styles.roleIcon} />;
  };

  const getRoleBadge = (workspace) => {
    if (workspace.owner?._id === user?.id) {
      return 'Owner';
    }
    return workspace.userRole || 'Collaborator';
  };

  return (
    <div className={styles.container}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={styles.triggerButton}>
            <div className={styles.workspaceInfo}>
              {currentWorkspace ? (
                <>
                  {getRoleIcon(currentWorkspace)}
                  <span className={styles.workspaceName}>{currentWorkspace.name}</span>
                </>
              ) : (
                <span className={styles.placeholder}>Select workspace</span>
              )}
            </div>
            <ChevronDown className={styles.chevronIcon} />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent className={styles.dropdownContent} align="start">
          <DropdownMenuLabel>
            <div className={styles.header}>
              <span>Workspaces</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCreateDialogOpen(true)}
                className={styles.addButton}
              >
                <Plus className={styles.addIcon} />
              </Button>
            </div>
          </DropdownMenuLabel>
          
          <div className={styles.searchContainer}>
            <div className={styles.searchWrapper}>
              <Search className={styles.searchIcon} />
              <Input
                placeholder="Search workspaces..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          </div>
          
          <DropdownMenuSeparator />
          
          {loading ? (
            <DropdownMenuItem disabled>
              <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <span>Loading...</span>
              </div>
            </DropdownMenuItem>
          ) : filteredWorkspaces.length === 0 ? (
            <DropdownMenuItem disabled>
              <span className={styles.noResults}>No workspaces found</span>
            </DropdownMenuItem>
          ) : (
            filteredWorkspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace._id}
                onClick={() => handleWorkspaceSelect(workspace)}
                className={styles.workspaceItem}
              >
                <div className={styles.workspaceMain}>
                  {getRoleIcon(workspace)}
                  <div className={styles.workspaceDetails}>
                    <div className={styles.workspaceHeader}>
                      <span className={styles.workspaceTitle}>{workspace.name}</span>
                      {workspace.isArchived && (
                        <Archive className={styles.archiveIcon} />
                      )}
                    </div>
                    {workspace.description && (
                      <p className={styles.workspaceDescription}>
                        {workspace.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className={styles.workspaceMeta}>
                  <span className={styles.roleBadge}>
                    {getRoleBadge(workspace)}
                  </span>
                  {workspace.collaborators?.length > 0 && (
                    <span className={styles.collaboratorCount}>
                      +{workspace.collaborators.length} collaborator{workspace.collaborators.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </DropdownMenuItem>
            ))
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className={styles.menuIcon} />
            Create new workspace
          </DropdownMenuItem>
          
          {currentWorkspace && currentWorkspace.owner?._id === user?.id && (
            <DropdownMenuItem onClick={() => setIsSettingsDialogOpen(true)}>
              <Settings className={styles.menuIcon} />
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