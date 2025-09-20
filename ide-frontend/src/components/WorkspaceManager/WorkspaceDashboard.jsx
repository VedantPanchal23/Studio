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
      return <Crown className="h-4 w-4 text-yellow-500" />;
    case 'editor':
      return <Edit className="h-4 w-4 text-blue-500" />;
    case 'viewer':
      return <Eye className="h-4 w-4 text-gray-500" />;
    default:
      return <Users className="h-4 w-4 text-gray-500" />;
  }
};

const WorkspaceCard = ({ workspace, onSelect, onSettings }) => {
  const { user } = useAuthStore();
  const isOwner = workspace.owner?._id === user?.id;
  
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {getRoleIcon(workspace.userRole)}
            <CardTitle className="text-lg">{workspace.name}</CardTitle>
            {workspace.isArchived && (
              <Badge variant="secondary">
                <Archive className="h-3 w-3 mr-1" />
                Archived
              </Badge>
            )}
            {workspace.isPublic && (
              <Badge variant="outline">Public</Badge>
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
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
        {workspace.description && (
          <CardDescription className="line-clamp-2">
            {workspace.description}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent onClick={() => onSelect(workspace)}>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <FileText className="h-4 w-4" />
                <span>{workspace.stats?.totalFiles || 0} files</span>
              </div>
              <div className="flex items-center space-x-1">
                <HardDrive className="h-4 w-4" />
                <span>{formatFileSize(workspace.stats?.totalSize || 0)}</span>
              </div>
              {workspace.stats?.executionCount > 0 && (
                <div className="flex items-center space-x-1">
                  <Play className="h-4 w-4" />
                  <span>{workspace.stats.executionCount} runs</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs">
                {workspace.settings?.runtime || 'node'}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {workspace.userRole}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatDate(workspace.stats?.lastActivity || workspace.updatedAt)}</span>
            </div>
          </div>
          
          {workspace.collaborators && workspace.collaborators.length > 0 && (
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>+{workspace.collaborators.length} collaborator{workspace.collaborators.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const WorkspaceList = ({ workspaces, onSelect, onSettings }) => {
  return (
    <div className="space-y-2">
      {workspaces.map((workspace) => (
        <div
          key={workspace._id}
          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
          onClick={() => onSelect(workspace)}
        >
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            {getRoleIcon(workspace.userRole)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-medium truncate">{workspace.name}</h3>
                {workspace.isArchived && (
                  <Badge variant="secondary" className="text-xs">
                    <Archive className="h-3 w-3 mr-1" />
                    Archived
                  </Badge>
                )}
                {workspace.isPublic && (
                  <Badge variant="outline" className="text-xs">Public</Badge>
                )}
              </div>
              {workspace.description && (
                <p className="text-sm text-muted-foreground truncate">
                  {workspace.description}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <FileText className="h-4 w-4" />
              <span>{workspace.stats?.totalFiles || 0}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{formatDate(workspace.stats?.lastActivity || workspace.updatedAt)}</span>
            </div>
            <Badge variant="secondary" className="text-xs">
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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workspaces</h1>
          <p className="text-muted-foreground">
            Manage your projects and collaborate with your team
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Workspace
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Workspaces</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.stats?.totalWorkspaces || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Owned</CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.stats?.ownedWorkspaces || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collaborative</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.stats?.collaborativeWorkspaces || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Files</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.stats?.totalFiles || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="flex items-center justify-between space-x-4">
        <div className="flex items-center space-x-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workspaces..."
              value={filters.search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <Select value={filters.sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lastActivity">Last Activity</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="createdAt">Created Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Workspace List */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredWorkspaces.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No workspaces found</p>
              <Button 
                className="mt-4" 
                onClick={() => setIsCreateDialogOpen(true)}
              >
                Create your first workspace
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
        
        <TabsContent value="archived" className="space-y-4">
          {/* Archived workspaces would be shown here */}
          <div className="text-center py-8">
            <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No archived workspaces</p>
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