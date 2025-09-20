import React, { useState } from 'react';
import { Download, GitBranch, ExternalLink, Github } from 'lucide-react';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

const GitCloneDialog = ({ open, onOpenChange }) => {
  const [activeTab, setActiveTab] = useState('url');
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [depth, setDepth] = useState('');
  const [selectedRepo, setSelectedRepo] = useState('');

  const { 
    cloneRepository, 
    isLoading,
    githubRepositories,
    loadGitHubRepositories,
    githubUser
  } = useGitStore();
  
  const { currentWorkspace } = useWorkspaceStore();

  React.useEffect(() => {
    if (open && activeTab === 'github' && githubUser) {
      loadGitHubRepositories();
    }
  }, [open, activeTab, githubUser, loadGitHubRepositories]);

  const handleClone = async () => {
    if (!currentWorkspace?.id) return;

    let urlToClone = repoUrl;
    
    if (activeTab === 'github' && selectedRepo) {
      const repo = githubRepositories.find(r => r.id.toString() === selectedRepo);
      if (repo) {
        urlToClone = repo.clone_url;
      }
    }

    if (!urlToClone.trim()) return;

    const options = {};
    
    if (branch.trim()) {
      options.branch = branch.trim();
    }
    
    if (depth.trim() && !isNaN(parseInt(depth))) {
      options.depth = parseInt(depth);
    }

    const result = await cloneRepository(currentWorkspace.id, urlToClone.trim(), options);
    
    if (result.success) {
      onOpenChange(false);
      // Reset form
      setRepoUrl('');
      setBranch('');
      setDepth('');
      setSelectedRepo('');
      setActiveTab('url');
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Reset form
    setRepoUrl('');
    setBranch('');
    setDepth('');
    setSelectedRepo('');
    setActiveTab('url');
  };

  const isValidUrl = (url) => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return /^git@/.test(url) || /^https?:\/\//.test(url);
    }
  };

  const canClone = () => {
    if (activeTab === 'url') {
      return isValidUrl(repoUrl.trim());
    } else if (activeTab === 'github') {
      return selectedRepo && githubRepositories.find(r => r.id.toString() === selectedRepo);
    }
    return false;
  };

  const getSelectedRepoUrl = () => {
    if (selectedRepo) {
      const repo = githubRepositories.find(r => r.id.toString() === selectedRepo);
      return repo?.clone_url || '';
    }
    return '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Clone Repository
          </DialogTitle>
          <DialogDescription>
            Clone an existing Git repository into this workspace. This will download 
            all files and commit history.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url">Repository URL</TabsTrigger>
            <TabsTrigger value="github" disabled={!githubUser}>
              <Github className="h-4 w-4 mr-2" />
              GitHub
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="repo-url">Repository URL *</Label>
              <Input
                id="repo-url"
                placeholder="https://github.com/user/repo.git"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                HTTPS or SSH URL to the Git repository
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="branch">Branch (optional)</Label>
                <Input
                  id="branch"
                  placeholder="main, develop, etc."
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="depth">Depth (optional)</Label>
                <Input
                  id="depth"
                  type="number"
                  placeholder="1, 10, etc."
                  value={depth}
                  onChange={(e) => setDepth(e.target.value)}
                />
              </div>
            </div>

            <div className="bg-muted/50 rounded-md p-3">
              <h4 className="text-sm font-medium mb-2">Clone Options:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• <strong>Branch:</strong> Clone a specific branch instead of the default</li>
                <li>• <strong>Depth:</strong> Limit history depth for faster cloning</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="github" className="space-y-4">
            {!githubUser ? (
              <div className="text-center py-6">
                <Github className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Connect your GitHub account to browse repositories
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="github-repo">Select Repository *</Label>
                  <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a repository..." />
                    </SelectTrigger>
                    <SelectContent>
                      {githubRepositories.map((repo) => (
                        <SelectItem key={repo.id} value={repo.id.toString()}>
                          <div className="flex items-center gap-2">
                            <span>{repo.full_name}</span>
                            {repo.private && (
                              <span className="text-xs bg-muted px-1 rounded">Private</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedRepo && (
                  <div className="bg-muted/50 rounded-md p-3">
                    {(() => {
                      const repo = githubRepositories.find(r => r.id.toString() === selectedRepo);
                      if (!repo) return null;
                      
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium">{repo.name}</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(repo.html_url, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                          {repo.description && (
                            <p className="text-xs text-muted-foreground">
                              {repo.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Language: {repo.language || 'Unknown'}</span>
                            <span>Updated: {new Date(repo.updated_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="github-branch">Branch (optional)</Label>
                    <Input
                      id="github-branch"
                      placeholder="main, develop, etc."
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="github-depth">Depth (optional)</Label>
                    <Input
                      id="github-depth"
                      type="number"
                      placeholder="1, 10, etc."
                      value={depth}
                      onChange={(e) => setDepth(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <p className="text-xs text-yellow-800">
            <strong>Warning:</strong> Cloning will replace all existing files in this workspace. 
            Make sure to save any important work first.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleClone} 
            disabled={!canClone() || isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Cloning...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Clone Repository
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GitCloneDialog;