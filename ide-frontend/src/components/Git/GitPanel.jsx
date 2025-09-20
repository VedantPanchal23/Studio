import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  GitCommit, 
  GitPullRequest, 
  Plus, 
  Minus, 
  RefreshCw,
  Settings,
  Upload,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText
} from 'lucide-react';

import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';

import useGitStore from '../../stores/gitStore';
import useWorkspaceStore from '../../stores/workspaceStore';
import GitStatusPanel from './GitStatusPanel';
import GitCommitPanel from './GitCommitPanel';
import GitBranchPanel from './GitBranchPanel';
import GitHistoryPanel from './GitHistoryPanel';
import GitRemotePanel from './GitRemotePanel';
import GitInitDialog from './GitInitDialog';
import GitCloneDialog from './GitCloneDialog';

const GitPanel = () => {
  const [activeTab, setActiveTab] = useState('status');
  const [showInitDialog, setShowInitDialog] = useState(false);
  const [showCloneDialog, setShowCloneDialog] = useState(false);

  const {
    isGitRepository,
    isLoading,
    error,
    currentBranch,
    stagedFiles,
    modifiedFiles,
    untrackedFiles,
    initializeGitStatus,
    refreshStatus,
    clearError
  } = useGitStore();

  const { currentWorkspace } = useWorkspaceStore();

  useEffect(() => {
    if (currentWorkspace?.id) {
      initializeGitStatus(currentWorkspace.id);
    }
  }, [currentWorkspace?.id, initializeGitStatus]);

  const handleRefresh = async () => {
    if (currentWorkspace?.id) {
      if (isGitRepository) {
        await refreshStatus(currentWorkspace.id);
      } else {
        await initializeGitStatus(currentWorkspace.id);
      }
    }
  };

  const getTotalChanges = () => {
    return stagedFiles.length + modifiedFiles.length + untrackedFiles.length;
  };

  const getStatusIcon = () => {
    const totalChanges = getTotalChanges();
    
    if (totalChanges === 0) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (stagedFiles.length > 0) {
      return <Clock className="h-4 w-4 text-yellow-500" />;
    } else {
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    }
  };

  if (!currentWorkspace) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">No workspace selected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Git
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('settings')}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 mt-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
                className="ml-auto"
              >
                ×
              </Button>
            </div>
          </div>
        )}

        {isGitRepository && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span>
                {getTotalChanges() === 0 
                  ? 'Working tree clean' 
                  : `${getTotalChanges()} changes`
                }
              </span>
            </div>
            {currentBranch && (
              <div className="flex items-center gap-2">
                <GitBranch className="h-3 w-3" />
                <Badge variant="outline" className="text-xs">
                  {currentBranch}
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-0">
        {!isGitRepository ? (
          <div className="p-6 text-center space-y-4">
            <div className="space-y-2">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-medium">No Git Repository</h3>
              <p className="text-sm text-muted-foreground">
                This workspace is not a Git repository. Initialize or clone a repository to get started.
              </p>
            </div>
            
            <div className="flex flex-col gap-2 max-w-xs mx-auto">
              <Button 
                onClick={() => setShowInitDialog(true)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Initialize Repository
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowCloneDialog(true)}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Clone Repository
              </Button>
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-5 mx-4 mb-2">
              <TabsTrigger value="status" className="text-xs">
                Status
                {getTotalChanges() > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {getTotalChanges()}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="commit" className="text-xs">Commit</TabsTrigger>
              <TabsTrigger value="branches" className="text-xs">Branches</TabsTrigger>
              <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
              <TabsTrigger value="remote" className="text-xs">Remote</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="status" className="h-full m-0">
                <GitStatusPanel />
              </TabsContent>

              <TabsContent value="commit" className="h-full m-0">
                <GitCommitPanel />
              </TabsContent>

              <TabsContent value="branches" className="h-full m-0">
                <GitBranchPanel />
              </TabsContent>

              <TabsContent value="history" className="h-full m-0">
                <GitHistoryPanel />
              </TabsContent>

              <TabsContent value="remote" className="h-full m-0">
                <GitRemotePanel />
              </TabsContent>
            </div>
          </Tabs>
        )}
      </CardContent>

      {/* Dialogs */}
      <GitInitDialog 
        open={showInitDialog} 
        onOpenChange={setShowInitDialog}
      />
      <GitCloneDialog 
        open={showCloneDialog} 
        onOpenChange={setShowCloneDialog}
      />
    </Card>
  );
};

export default GitPanel;