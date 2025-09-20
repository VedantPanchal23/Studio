import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Users, 
  Trash2, 
  Archive, 
  Copy, 
  Save, 
  Loader2,
  Mail,
  Crown,
  Edit,
  Eye,
  UserMinus
} from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';

const RUNTIME_OPTIONS = [
  { value: 'node', label: 'Node.js' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' }
];

const ROLE_OPTIONS = [
  { value: 'owner', label: 'Owner', icon: Crown, description: 'Full access and admin rights' },
  { value: 'editor', label: 'Editor', icon: Edit, description: 'Can read, write, and execute code' },
  { value: 'viewer', label: 'Viewer', icon: Eye, description: 'Can only view the workspace' }
];

export const WorkspaceSettingsDialog = ({ workspace, open, onOpenChange }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState({});
  const [collaboratorEmail, setCollaboratorEmail] = useState('');
  const [collaboratorRole, setCollaboratorRole] = useState('viewer');
  const [errors, setErrors] = useState({});
  
  const {
    updateWorkspace,
    deleteWorkspace,
    duplicateWorkspace,
    addCollaborator,
    updateCollaboratorRole,
    removeCollaborator,
    loading
  } = useWorkspaceStore();
  
  const { user } = useAuthStore();

  useEffect(() => {
    if (workspace) {
      setFormData({
        name: workspace.name || '',
        description: workspace.description || '',
        isPublic: workspace.isPublic || false,
        runtime: workspace.settings?.runtime || 'node',
        version: workspace.settings?.version || 'latest',
        buildCommand: workspace.settings?.buildCommand || '',
        runCommand: workspace.settings?.runCommand || ''
      });
    }
  }, [workspace]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleSaveSettings = async () => {
    try {
      const updates = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        isPublic: formData.isPublic,
        settings: {
          runtime: formData.runtime,
          version: formData.version,
          buildCommand: formData.buildCommand,
          runCommand: formData.runCommand
        }
      };

      await updateWorkspace(workspace._id, updates);
      setErrors({});
    } catch (error) {
      if (error.response?.data?.errors) {
        const apiErrors = {};
        error.response.data.errors.forEach(err => {
          apiErrors[err.path] = err.msg;
        });
        setErrors(apiErrors);
      } else {
        setErrors({ 
          general: error.response?.data?.message || 'Failed to update workspace' 
        });
      }
    }
  };

  const handleAddCollaborator = async () => {
    if (!collaboratorEmail.trim()) {
      setErrors({ collaborator: 'Email is required' });
      return;
    }

    try {
      await addCollaborator(workspace._id, collaboratorEmail.trim(), collaboratorRole);
      setCollaboratorEmail('');
      setCollaboratorRole('viewer');
      setErrors({});
    } catch (error) {
      setErrors({ 
        collaborator: error.response?.data?.message || 'Failed to add collaborator' 
      });
    }
  };

  const handleUpdateCollaboratorRole = async (userId, newRole) => {
    try {
      await updateCollaboratorRole(workspace._id, userId, newRole);
    } catch (error) {
      setErrors({ 
        general: error.response?.data?.message || 'Failed to update collaborator role' 
      });
    }
  };

  const handleRemoveCollaborator = async (userId) => {
    try {
      await removeCollaborator(workspace._id, userId);
    } catch (error) {
      setErrors({ 
        general: error.response?.data?.message || 'Failed to remove collaborator' 
      });
    }
  };

  const handleDuplicateWorkspace = async () => {
    try {
      const newName = `${workspace.name} (Copy)`;
      await duplicateWorkspace(workspace._id, newName);
      onOpenChange(false);
    } catch (error) {
      setErrors({ 
        general: error.response?.data?.message || 'Failed to duplicate workspace' 
      });
    }
  };

  const handleArchiveWorkspace = async () => {
    try {
      await deleteWorkspace(workspace._id, false);
      onOpenChange(false);
    } catch (error) {
      setErrors({ 
        general: error.response?.data?.message || 'Failed to archive workspace' 
      });
    }
  };

  const handleDeleteWorkspace = async () => {
    try {
      await deleteWorkspace(workspace._id, true);
      onOpenChange(false);
    } catch (error) {
      setErrors({ 
        general: error.response?.data?.message || 'Failed to delete workspace' 
      });
    }
  };

  const isOwner = workspace?.owner?._id === user?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Workspace Settings</span>
          </DialogTitle>
          <DialogDescription>
            Manage your workspace settings, collaborators, and permissions.
          </DialogDescription>
        </DialogHeader>

        {errors.general && (
          <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
            {errors.general}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="collaborators">
              <Users className="h-4 w-4 mr-1" />
              Collaborators
            </TabsTrigger>
            <TabsTrigger value="danger">Danger Zone</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Workspace Name</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  disabled={!isOwner}
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  disabled={!isOwner}
                  className={errors.description ? 'border-destructive' : ''}
                  rows={3}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="runtime">Runtime</Label>
                  <Select
                    value={formData.runtime || 'node'}
                    onValueChange={(value) => handleInputChange('runtime', value)}
                    disabled={!isOwner}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RUNTIME_OPTIONS.map((runtime) => (
                        <SelectItem key={runtime.value} value={runtime.value}>
                          {runtime.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    value={formData.version || ''}
                    onChange={(e) => handleInputChange('version', e.target.value)}
                    disabled={!isOwner}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="buildCommand">Build Command</Label>
                <Input
                  id="buildCommand"
                  placeholder="npm run build"
                  value={formData.buildCommand || ''}
                  onChange={(e) => handleInputChange('buildCommand', e.target.value)}
                  disabled={!isOwner}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="runCommand">Run Command</Label>
                <Input
                  id="runCommand"
                  placeholder="npm start"
                  value={formData.runCommand || ''}
                  onChange={(e) => handleInputChange('runCommand', e.target.value)}
                  disabled={!isOwner}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPublic"
                  checked={formData.isPublic || false}
                  onCheckedChange={(checked) => handleInputChange('isPublic', checked)}
                  disabled={!isOwner}
                />
                <Label htmlFor="isPublic" className="text-sm">
                  Make this workspace public
                </Label>
              </div>

              {isOwner && (
                <div className="flex justify-end">
                  <Button onClick={handleSaveSettings} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="collaborators" className="space-y-4">
            {isOwner && (
              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-medium">Add Collaborator</h4>
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Enter email address"
                      value={collaboratorEmail}
                      onChange={(e) => setCollaboratorEmail(e.target.value)}
                      className={errors.collaborator ? 'border-destructive' : ''}
                    />
                    {errors.collaborator && (
                      <p className="text-sm text-destructive mt-1">{errors.collaborator}</p>
                    )}
                  </div>
                  <Select
                    value={collaboratorRole}
                    onValueChange={setCollaboratorRole}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.filter(role => role.value !== 'owner').map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddCollaborator} disabled={loading}>
                    <Mail className="h-4 w-4 mr-1" />
                    Invite
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="font-medium">Current Collaborators</h4>
              
              {/* Owner */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <div>
                    <p className="font-medium">{workspace?.owner?.name}</p>
                    <p className="text-sm text-muted-foreground">{workspace?.owner?.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    Owner
                  </span>
                </div>
              </div>

              {/* Collaborators */}
              {workspace?.collaborators?.map((collaborator) => {
                const roleOption = ROLE_OPTIONS.find(r => r.value === collaborator.role);
                const RoleIcon = roleOption?.icon || Eye;
                
                return (
                  <div key={collaborator.userId._id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <RoleIcon className="h-4 w-4" />
                      <div>
                        <p className="font-medium">{collaborator.userId.name}</p>
                        <p className="text-sm text-muted-foreground">{collaborator.userId.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isOwner ? (
                        <>
                          <Select
                            value={collaborator.role}
                            onValueChange={(newRole) => handleUpdateCollaboratorRole(collaborator.userId._id, newRole)}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLE_OPTIONS.filter(role => role.value !== 'owner').map((role) => (
                                <SelectItem key={role.value} value={role.value}>
                                  {role.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveCollaborator(collaborator.userId._id)}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <span className="text-sm bg-secondary px-2 py-1 rounded">
                          {roleOption?.label}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {(!workspace?.collaborators || workspace.collaborators.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No collaborators yet. Invite team members to start collaborating!
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="danger" className="space-y-4">
            <div className="space-y-4">
              <div className="p-4 border border-orange-200 rounded-lg">
                <h4 className="font-medium text-orange-800 mb-2">Duplicate Workspace</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Create a copy of this workspace with all files and settings.
                </p>
                <Button variant="outline" onClick={handleDuplicateWorkspace} disabled={loading}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate Workspace
                </Button>
              </div>

              {isOwner && (
                <>
                  <div className="p-4 border border-yellow-200 rounded-lg">
                    <h4 className="font-medium text-yellow-800 mb-2">Archive Workspace</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Archive this workspace. It can be restored later from your archived workspaces.
                    </p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="text-yellow-700 border-yellow-300">
                          <Archive className="h-4 w-4 mr-2" />
                          Archive Workspace
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Archive Workspace</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to archive "{workspace?.name}"? 
                            You can restore it later from your archived workspaces.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleArchiveWorkspace}>
                            Archive
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  <div className="p-4 border border-red-200 rounded-lg">
                    <h4 className="font-medium text-red-800 mb-2">Delete Workspace</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Permanently delete this workspace. This action cannot be undone.
                    </p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Workspace
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to permanently delete "{workspace?.name}"? 
                            This action cannot be undone and all files will be lost.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleDeleteWorkspace}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete Permanently
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default WorkspaceSettingsDialog;