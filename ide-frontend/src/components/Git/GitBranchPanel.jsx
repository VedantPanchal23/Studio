import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  Plus, 
  Trash2, 
  GitMerge,
  Check,
  MoreHorizontal,
  AlertTriangle
} from 'lucide-react';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

import useGitStore from '../../stores/gitStore';
import useWorkspaceStore from '../../stores/workspaceStore';

const GitBranchPanel = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [selectedStartPoint, setSelectedStartPoint] = useState('');
  const [branchToDelete, setBranchToDelete] = useState(null);
  const [forceDelete, setForceDelete] = useState(false);

  const {
    branches,
    currentBranch,
    isLoading,
    loadBranches,
    createBranch,
    switchBranch,
    deleteBranch
  } = useGitStore();

  const { currentWorkspace } = useWorkspaceStore();

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadBranches(currentWorkspace.id);
    }
  }, [currentWorkspace?.id, loadBranches]);

  const handleCreateBranch = async () => {
    if (!newBranchName.trim() || !currentWorkspace?.id) return;

    const result = await createBranch(
      currentWorkspace.id, 
      newBranchName.trim(),
      selectedStartPoint || null
    );

    if (result.success) {
      setNewBranchName('');
      setSelectedStartPoint('');
      setShowCreateDialog(false);
    }
  };

  const handleSwitchBranch = async (branchName) => {
    if (currentWorkspace?.id && branchName !== currentBranch) {
      await switchBranch(currentWorkspace.id, branchName);
    }
  };

  const handleDeleteBranch = async () => {
    if (!branchToDelete || !currentWorkspace?.id) return;

    const result = await deleteBranch(currentWorkspace.id, branchToDelete, forceDelete);
    
    if (result.success) {
      setBranchToDelete(null);
      setForceDelete(false);
      setShowDeleteDialog(false);
    }
  };

  const openDeleteDialog = (branchName) => {
    setBranchToDelete(branchName);
    setShowDeleteDialog(true);
  };

  const getBranchDisplayName = (branch) => {
    if (branch.remote) {
      return branch.name.replace('origin/', '');
    }
    return branch.name;
  };

  const localBranches = branches.filter(b => !b.remote);
  const remoteBranches = branches.filter(b => b.remote);

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          <span className="font-medium">Branches</span>
          <Badge variant="outline" className="text-xs">
            {localBranches.length}
          </Badge>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Branch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Branch</DialogTitle>
              <DialogDescription>
                Create a new branch from the current branch or specify a starting point.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="branch-name">Branch Name</Label>
                <Input
                  id="branch-name"
                  placeholder="feature/new-feature"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="start-point">Start Point (optional)</Label>
                <Input
                  id="start-point"
                  placeholder="main, develop, or commit hash"
                  value={selectedStartPoint}
                  onChange={(e) => setSelectedStartPoint(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to create from current branch ({currentBranch})
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateBranch}
                disabled={!newBranchName.trim() || isLoading}
              >
                {isLoading ? 'Creating...' : 'Create Branch'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <div className="space-y-4">
          {/* Local Branches */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">Local Branches</h3>
              <Badge variant="secondary" className="text-xs">
                {localBranches.length}
              </Badge>
            </div>
            
            <div className="space-y-1">
              {localBranches.map((branch) => (
                <div
                  key={branch.name}
                  className={`flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 ${
                    branch.current ? 'bg-primary/10 border border-primary/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {branch.current ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <GitBranch className="h-4 w-4 text-muted-foreground" />
                    )}
                    
                    <span 
                      className={`text-sm truncate ${
                        branch.current ? 'font-medium text-primary' : ''
                      }`}
                      title={branch.name}
                    >
                      {getBranchDisplayName(branch)}
                    </span>
                    
                    {branch.current && (
                      <Badge variant="default" className="text-xs">
                        Current
                      </Badge>
                    )}
                  </div>

                  {!branch.current && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => handleSwitchBranch(branch.name)}
                          disabled={isLoading}
                        >
                          <GitMerge className="h-4 w-4 mr-2" />
                          Switch to Branch
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => openDeleteDialog(branch.name)}
                          className="text-destructive"
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Branch
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
              
              {localBranches.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No local branches found</p>
                </div>
              )}
            </div>
          </div>

          {/* Remote Branches */}
          {remoteBranches.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">Remote Branches</h3>
                <Badge variant="secondary" className="text-xs">
                  {remoteBranches.length}
                </Badge>
              </div>
              
              <div className="space-y-1">
                {remoteBranches.map((branch) => (
                  <div
                    key={branch.name}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50"
                  >
                    <GitBranch className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate flex-1" title={branch.name}>
                      {getBranchDisplayName(branch)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      Remote
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Delete Branch Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Branch
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the branch "{branchToDelete}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="force-delete"
                checked={forceDelete}
                onChange={(e) => setForceDelete(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="force-delete" className="text-sm">
                Force delete (ignore unmerged changes)
              </Label>
            </div>
            
            {forceDelete && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                <p className="text-xs text-destructive">
                  Warning: Force delete will permanently lose any unmerged changes in this branch.
                </p>
              </div>
            )}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBranch}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete Branch'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GitBranchPanel;