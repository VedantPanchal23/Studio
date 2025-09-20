import React, { useState, useEffect } from 'react';
import { 
  GitCommit, 
  Clock, 
  User, 
  Hash,
  RefreshCw,
  Calendar,
  MoreHorizontal
} from 'lucide-react';

import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

import useGitStore from '../../stores/gitStore';
import useWorkspaceStore from '../../stores/workspaceStore';

const GitHistoryPanel = () => {
  const [limit, setLimit] = useState('20');
  const [sinceDate, setSinceDate] = useState('');

  const {
    commits,
    isLoading,
    loadCommitHistory
  } = useGitStore();

  const { currentWorkspace } = useWorkspaceStore();

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadCommitHistory(currentWorkspace.id, {
        limit: parseInt(limit),
        since: sinceDate || undefined
      });
    }
  }, [currentWorkspace?.id, limit, sinceDate, loadCommitHistory]);

  const handleRefresh = () => {
    if (currentWorkspace?.id) {
      loadCommitHistory(currentWorkspace.id, {
        limit: parseInt(limit),
        since: sinceDate || undefined
      });
    }
  };

  const formatCommitHash = (hash) => {
    return hash.substring(0, 7);
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  };

  const CommitItem = ({ commit }) => {
    return (
      <div className="flex items-start gap-3 p-3 hover:bg-muted/50 rounded-md group">
        <div className="flex-shrink-0 mt-1">
          <div className="w-2 h-2 bg-primary rounded-full"></div>
        </div>
        
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-tight">
              {commit.message}
            </p>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(commit.hash)}>
                  <Hash className="h-4 w-4 mr-2" />
                  Copy Hash
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(commit.message)}>
                  <GitCommit className="h-4 w-4 mr-2" />
                  Copy Message
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Hash className="h-3 w-3" />
              <code className="font-mono">{formatCommitHash(commit.hash)}</code>
            </div>
            
            {commit.author && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{commit.author}</span>
              </div>
            )}
            
            {commit.date && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span title={new Date(commit.date).toLocaleString()}>
                  {formatRelativeTime(commit.date)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      {/* Header and Controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitCommit className="h-4 w-4" />
            <span className="font-medium">Commit History</span>
            <Badge variant="outline" className="text-xs">
              {commits.length}
            </Badge>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="limit" className="text-xs">Limit</Label>
            <Select value={limit} onValueChange={setLimit}>
              <SelectTrigger id="limit" className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 commits</SelectItem>
                <SelectItem value="20">20 commits</SelectItem>
                <SelectItem value="50">50 commits</SelectItem>
                <SelectItem value="100">100 commits</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="since" className="text-xs">Since</Label>
            <Input
              id="since"
              type="date"
              value={sinceDate}
              onChange={(e) => setSinceDate(e.target.value)}
              className="h-8"
            />
          </div>
        </div>
      </div>

      {/* Commit List */}
      <div className="flex-1 overflow-hidden">
        {commits.length > 0 ? (
          <ScrollArea className="h-full">
            <div className="space-y-1">
              {commits.map((commit, index) => (
                <div key={commit.hash} className="relative">
                  <CommitItem commit={commit} />
                  
                  {/* Connection line */}
                  {index < commits.length - 1 && (
                    <div className="absolute left-[21px] top-12 w-px h-4 bg-border"></div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <GitCommit className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium">No Commits</h3>
              <p className="text-sm text-muted-foreground">
                {isLoading 
                  ? 'Loading commit history...' 
                  : 'No commits found in this repository.'
                }
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      {commits.length > 0 && (
        <div className="border-t pt-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Showing {commits.length} commits</span>
            {sinceDate && (
              <span>Since {new Date(sinceDate).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GitHistoryPanel;