import React, { useState, useEffect, useCallback } from 'react';
import { 
  Upload, 
  Download, 
  RefreshCw, 
  Plus, 
  Trash2,
  ExternalLink,
  GitBranch,
  Cloud,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Checkbox } from '../ui/checkbox';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

import useGitStore from '../../stores/gitStore';
import useWorkspaceStore from '../../stores/workspaceStore';

const GitRemotePanel = () => {
  const [showAddRemoteDialog, setShowAddRemoteDialog] = useState(false);
  const [remoteName, setRemoteName] = useState('');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [pushRemote, setPushRemote] = useState('origin');
  const [pushBranch, setPushBranch] = useState('');
  const [setUpstream, setSetUpstream] = useState(false);
  const [forcePush, setForcePush] = useState(false);
  const [pullRemote, setPullRemote] = useState('origin');
  const [pullBranch, setPullBranch] = useState('');
  const [useRebase, setUseRebase] = useState(false);

  const {
    remotes,
    currentBranch,
    isLoading,
    getRemotes,
    addRemote,
    push,
    pull,
    fetch
  } = useGitStore();

  const { currentWorkspace } = useWorkspaceStore();

  const loadRemotes = useCallback(async () => {
    if (currentWorkspace?.id) {
      await getRemotes(currentWorkspace.id);
    }
  }, [currentWorkspace?.id, getRemotes]);

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadRemotes();
    }
  }, [currentWorkspace?.id, loadRemotes]);

  const handleAddRemote = async () => {
    if (!remoteName.trim() || !remoteUrl.trim() || !currentWorkspace?.id) return;

    const result = await addRemote(currentWorkspace.id, remoteName.trim(), remoteUrl.trim());
    
    if (result.success) {
      setRemoteName('');
      setRemoteUrl('');
      setShowAddRemoteDialog(false);
      await loadRemotes();
    }
  };

  const handlePush = async () => {
    if (!currentWorkspace?.id) return;

    const options = {
      remote: pushRemote || undefined,
      branch: pushBranch || undefined,
      setUpstream,
      force: forcePush
    };

    await push(currentWorkspace.id, options);
  };

  const handlePull = async () => {
    if (!currentWorkspace?.id) return;

    const options = {
      remote: pullRemote || undefined,
      branch: pullBranch || undefined,
      rebase: useRebase
    };

    await pull(currentWorkspace.id, options);
  };

  const handleFetch = async (remote = null) => {
    if (!currentWorkspace?.id) return;

    const options = remote ? { remote } : { all: true };
    await fetch(currentWorkspace.id, options);
  };

  const getRemotesList = () => {
    return Object.keys(remotes || {});
  };

  const getRemoteUrl = (remoteName) => {
    const remote = remotes?.[remoteName];
    return remote?.fetch || remote?.push || '';
  };

  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return /^git@/.test(url) || /^https?:\/\//.test(url);
    }
  };

  const openRemoteUrl = (url) => {
    if (url.startsWith('git@github.com:')) {
      const repoPath = url.replace('git@github.com:', '').replace('.git', '');
      window.open(`https://github.com/${repoPath}`, '_blank');
    } else if (url.includes('github.com')) {
      window.open(url.replace('.git', ''), '_blank');
    }
  };

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4" />
          <span className="font-medium">Remote Repositories</span>
          <Badge variant="outline" className="text-xs">
            {getRemotesList().length}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadRemotes}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          
          <Dialog open={showAddRemoteDialog} onOpenChange={setShowAddRemoteDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Remote
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Remote Repository</DialogTitle>
                <DialogDescription>
                  Add a remote repository to push to and pull from.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="remote-name">Remote Name</Label>
                  <Input
                    id="remote-name"
                    placeholder="origin"
                    value={remoteName}
                    onChange={(e) => setRemoteName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="remote-url">Remote URL</Label>
                  <Input
                    id="remote-url"
                    placeholder="https://github.com/user/repo.git"
                    value={remoteUrl}
                    onChange={(e) => setRemoteUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    HTTPS or SSH URL to the remote repository
                  </p>
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowAddRemoteDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddRemote}
                  disabled={!remoteName.trim() || !remoteUrl.trim() || !isValidUrl(remoteUrl) || isLoading}
                >
                  {isLoading ? 'Adding...' : 'Add Remote'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6">
          {/* Remote List */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Configured Remotes</h3>
            
            {getRemotesList().length > 0 ? (
              <div className="space-y-2">
                {getRemotesList().map((remoteName) => {
                  const url = getRemoteUrl(remoteName);
                  return (
                    <div key={remoteName} className="flex items-center gap-2 p-3 border rounded-md">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{remoteName}</span>
                          <Badge variant="outline" className="text-xs">
                            Remote
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate" title={url}>
                          {url}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {url.includes('github.com') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openRemoteUrl(url)}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFetch(remoteName)}
                          disabled={isLoading}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Cloud className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No remote repositories configured</p>
                <p className="text-xs">Add a remote to push and pull changes</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Push Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Push Changes
            </h3>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Remote</Label>
                  <Select value={pushRemote} onValueChange={setPushRemote}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getRemotesList().map((remote) => (
                        <SelectItem key={remote} value={remote}>
                          {remote}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs">Branch</Label>
                  <Input
                    placeholder={currentBranch || 'current'}
                    value={pushBranch}
                    onChange={(e) => setPushBranch(e.target.value)}
                    className="h-8"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="set-upstream"
                    checked={setUpstream}
                    onCheckedChange={setSetUpstream}
                  />
                  <Label htmlFor="set-upstream" className="text-sm">
                    Set upstream branch
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="force-push"
                    checked={forcePush}
                    onCheckedChange={setForcePush}
                  />
                  <Label htmlFor="force-push" className="text-sm text-destructive">
                    Force push (dangerous)
                  </Label>
                </div>
              </div>
              
              <Button
                onClick={handlePush}
                disabled={isLoading || getRemotesList().length === 0}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isLoading ? 'Pushing...' : 'Push'}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Pull Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Download className="h-4 w-4" />
              Pull Changes
            </h3>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Remote</Label>
                  <Select value={pullRemote} onValueChange={setPullRemote}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getRemotesList().map((remote) => (
                        <SelectItem key={remote} value={remote}>
                          {remote}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs">Branch</Label>
                  <Input
                    placeholder={currentBranch || 'current'}
                    value={pullBranch}
                    onChange={(e) => setPullBranch(e.target.value)}
                    className="h-8"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use-rebase"
                  checked={useRebase}
                  onCheckedChange={setUseRebase}
                />
                <Label htmlFor="use-rebase" className="text-sm">
                  Use rebase instead of merge
                </Label>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handlePull}
                  disabled={isLoading || getRemotesList().length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isLoading ? 'Pulling...' : 'Pull'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleFetch()}
                  disabled={isLoading || getRemotesList().length === 0}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Fetch All
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default GitRemotePanel;