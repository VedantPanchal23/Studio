import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Grid, 
  List, 
  Archive, 
  Users, 
  Clock, 
  FileText,
  HardDrive,
  Play,
  Settings,
  Eye,
  Edit,
  Crown
} from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { CreateWorkspaceDialog } from './CreateWorkspaceDialog';
import { WorkspaceSettingsDialog } from './WorkspaceSettingsDialog';
import styles from './WorkspaceDashboard.module.css';

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getRoleIcon = (role) => {
  switch (role) {
    case 'owner':
      return <Crown className={`${styles.roleIcon} ${styles.crownIcon}`} />;
    case 'editor':
      return <Edit className={`${styles.roleIcon} ${styles.editIcon}`} />;
    case 'viewer':
      return <Eye className={`${styles.roleIcon} ${styles.viewIcon}`} />;
    default:
      return <Users className={`${styles.roleIcon} ${styles.usersIcon}`} />;
  }
};

const WorkspaceCard = ({ workspace, onSelect, onSettings }) => {
  const { user } = useAuthStore();
  const isOwner = workspace.owner?._id === user?.id;
  
  return (
    <Card className={styles.workspaceCard}>
      <CardHeader className={styles.cardHeader}>
        <div className={styles.cardHeaderTop}>
          <div className={styles.cardTitleSection}>
            {getRoleIcon(workspace.userRole)}
            <CardTitle className={styles.cardTitle}>{workspace.name}</CardTitle>
            {workspace.isArchived && (
              <Badge variant="secondary" className={styles.archiveBadge}>
                <Archive className={styles.archiveIcon} />
                Archived
              </Badge>
            )}
            {workspace.isPublic && (
              <Badge variant="outline" className={styles.publicBadge}>Public</Badge>
            )}
          </div>
          {isOwner && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSettings(workspace);
              }}
              className={styles.settingsButton}
            >
              <Settings className={styles.settingsIcon} />
            </Button>
          )}
        </div>
        {workspace.description && (
          <CardDescription className={styles.cardDescription}>
            {workspace.description}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent onClick={() => onSelect(workspace)} className={styles.cardContent}>
        <div className={styles.cardStats}>
          <div className={styles.cardStatsLeft}>
            <div className={styles.statItem}>
              <FileText className={styles.statIcon} />
              <span>{workspace.stats?.totalFiles || 0} files</span>
            </div>
            <div className={styles.statItem}>
              <HardDrive className={styles.statIcon} />
              <span>{formatFileSize(workspace.stats?.totalSize || 0)}</span>
            </div>
            {workspace.stats?.executionCount > 0 && (
              <div className={styles.activityStat}>
                <Play className={styles.activityIcon} />
                <span>{workspace.stats.executionCount} runs</span>
              </div>
            )}
          </div>
        </div>
        
        <div className={styles.cardFooter}>
          <div className={styles.cardFooterLeft}>
            <Badge variant="secondary" className={styles.roleBadge}>
              {workspace.settings?.runtime || 'node'}
            </Badge>
            <Badge variant="outline" className={styles.publicFooterBadge}>
              {workspace.userRole}
            </Badge>
          </div>
          
          <div className={styles.cardFooterRight}>
            <div className={styles.lastAccessedContainer}>
              <Clock className={styles.clockIcon} />
              <span>{formatDate(workspace.stats?.lastActivity || workspace.updatedAt)}</span>
            </div>
            
            {workspace.collaborators && workspace.collaborators.length > 0 && (
              <div className={styles.collaboratorsContainer}>
                <Users className={styles.collaboratorsIcon} />
                <span>+{workspace.collaborators.length} collaborator{workspace.collaborators.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const WorkspaceList = ({ workspaces, onSelect }) => {
  return (
    <div className={styles.workspaceList}>
      {workspaces.map((workspace) => (
        <div
          key={workspace._id}
          className={styles.listItem}
          onClick={() => onSelect(workspace)}
        >
          <div className={styles.listItemContent}>
            {getRoleIcon(workspace.userRole)}
            <div className={styles.listItemDetails}>
              <div className={styles.listItemHeader}>
                <h3 className={styles.workspaceListTitle}>{workspace.name}</h3>
                {workspace.isArchived && (
                  <Badge variant="secondary" className={styles.listArchiveBadge}>
                    <Archive className={styles.archiveIcon} />
                    Archived
                  </Badge>
                )}
                {workspace.isPublic && (
                  <Badge variant="outline" className={styles.listPublicBadge}>Public</Badge>
                )}
              </div>
              {workspace.description && (
                <p className={styles.listItemDescription}>
                  {workspace.description}
                </p>
              )}
            </div>
          </div>
          
          <div className={styles.listItemRight}>
            <div className={styles.workspaceListStat}>
              <FileText className={styles.statIcon} />
              <span>{workspace.stats?.totalFiles || 0}</span>
            </div>
            <div className={styles.workspaceListStat}>
              <Clock className={styles.statIcon} />
              <span>{formatDate(workspace.stats?.lastActivity || workspace.updatedAt)}</span>
            </div>
            <Badge variant="secondary" className={styles.listRoleBadge}>
              {workspace.userRole}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
};

export const WorkspaceDashboard = ({ onWorkspaceSelect }) => {
  const [viewMode, setViewMode] = useState('grid');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  
  const {
    workspaces,
    stats,
    loading,
    filters,
    fetchWorkspaces,
    fetchStats,
    setFilters,
    setCurrentWorkspace
  } = useWorkspaceStore();

  useEffect(() => {
    fetchWorkspaces();
    fetchStats();
  }, [fetchWorkspaces, fetchStats]);

  const handleSearch = (query) => {
    setFilters({ search: query });
    fetchWorkspaces();
  };

  const handleSortChange = (sortBy) => {
    setFilters({ sortBy });
    fetchWorkspaces();
  };

  const handleWorkspaceSelect = (workspace) => {
    setCurrentWorkspace(workspace._id);
    onWorkspaceSelect?.(workspace);
  };

  const handleWorkspaceSettings = (workspace) => {
    setSelectedWorkspace(workspace);
    setIsSettingsDialogOpen(true);
  };

  const filteredWorkspaces = workspaces.filter(workspace => {
    if (filters.includeArchived) return true;
    return !workspace.isArchived;
  });

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <div className={styles.dashboardHeader}>
        <div className={styles.dashboardHeaderText}>
          <h1>Workspaces</h1>
          <p>
            Manage your projects and collaborate with your team
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className={styles.buttonIcon} />
          New Workspace
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className={styles.statsGrid}>
          <Card className={styles.statsCard}>
            <CardHeader className={styles.statsCardHeader}>
              <CardTitle className={styles.statsCardTitle}>Total Workspaces</CardTitle>
              <FileText className={styles.statsCardIcon} />
            </CardHeader>
            <CardContent>
              <div className={styles.statsCardValue}>{stats.stats?.totalWorkspaces || 0}</div>
            </CardContent>
          </Card>
          
          <Card className={styles.statsCard}>
            <CardHeader className={styles.statsCardHeader}>
              <CardTitle className={styles.statsCardTitle}>Owned</CardTitle>
              <Crown className={styles.statsCardIcon} />
            </CardHeader>
            <CardContent>
              <div className={styles.statsCardValue}>{stats.stats?.ownedWorkspaces || 0}</div>
            </CardContent>
          </Card>
          
          <Card className={styles.statsCard}>
            <CardHeader className={styles.statsCardHeader}>
              <CardTitle className={styles.statsCardTitle}>Collaborative</CardTitle>
              <Users className={styles.statsCardIcon} />
            </CardHeader>
            <CardContent>
              <div className={styles.statsCardValue}>{stats.stats?.collaborativeWorkspaces || 0}</div>
            </CardContent>
          </Card>
          
          <Card className={styles.statsCard}>
            <CardHeader className={styles.statsCardHeader}>
              <CardTitle className={styles.statsCardTitle}>Total Files</CardTitle>
              <HardDrive className={styles.statsCardIcon} />
            </CardHeader>
            <CardContent>
              <div className={styles.statsCardValue}>{stats.stats?.totalFiles || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Controls */}
      <div className={styles.filtersSection}>
        <div className={styles.filtersLeft}>
          <div className={styles.searchContainer}>
            <Search className={styles.searchIcon} />
            <Input
              placeholder="Search workspaces..."
              value={filters.search}
              onChange={(e) => handleSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          
          <Select value={filters.sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className={styles.selectTrigger}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lastActivity">Last Activity</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="createdAt">Created Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className={styles.viewModeButtons}>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className={styles.viewIcon} />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className={styles.viewIcon} />
          </Button>
        </div>
      </div>

      {/* Workspace List */}
      <Tabs defaultValue="active" className={styles.tabsContainer}>
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className={styles.tabsContent}>
          {loading ? (
            <div className={styles.loadingSpinner}>
              <div className={styles.spinner}></div>
            </div>
          ) : filteredWorkspaces.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateText}>No workspaces found</p>
              <Button 
                className="mt-4" 
                onClick={() => setIsCreateDialogOpen(true)}
              >
                Create your first workspace
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className={styles.workspaceGrid}>
              {filteredWorkspaces.map((workspace) => (
                <WorkspaceCard
                  key={workspace._id}
                  workspace={workspace}
                  onSelect={handleWorkspaceSelect}
                  onSettings={handleWorkspaceSettings}
                />
              ))}
            </div>
          ) : (
            <WorkspaceList
              workspaces={filteredWorkspaces}
              onSelect={handleWorkspaceSelect}
              onSettings={handleWorkspaceSettings}
            />
          )}
        </TabsContent>
        
        <TabsContent value="archived" className={styles.tabsContent}>
          {/* Archived workspaces would be shown here */}
          <div className={styles.archivedEmptyState}>
            <Archive className={styles.archivedIcon} />
            <p className={styles.emptyStateText}>No archived workspaces</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateWorkspaceDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {selectedWorkspace && (
        <WorkspaceSettingsDialog
          workspace={selectedWorkspace}
          open={isSettingsDialogOpen}
          onOpenChange={setIsSettingsDialogOpen}
        />
      )}
    </div>
  );
};

export default WorkspaceDashboard;