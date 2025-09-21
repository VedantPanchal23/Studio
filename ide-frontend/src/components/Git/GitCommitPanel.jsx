import React, { useState } from 'react';
import { 
  GitCommit, 
  Send, 
  AlertCircle, 
  CheckCircle,
  FileText,
  User
} from 'lucide-react';

import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';

import useGitStore from '../../stores/gitStore';
import useWorkspaceStore from '../../stores/workspaceStore';
import useAuthStore from '../../stores/authStore';

const GitCommitPanel = () => {
  const [commitMessage, setCommitMessage] = useState('');
  const [commitDescription, setCommitDescription] = useState('');
  const [customAuthor, setCustomAuthor] = useState('');
  const [useCustomAuthor, setUseCustomAuthor] = useState(false);
  const [amendLastCommit, setAmendLastCommit] = useState(false);

  const {
    stagedFiles,
    isLoading,
    commit,
    commits
  } = useGitStore();

  const { currentWorkspace } = useWorkspaceStore();
  const { user } = useAuthStore();

  const handleCommit = async () => {
    if (!commitMessage.trim() || !currentWorkspace?.id) return;

    const fullMessage = commitDescription.trim() 
      ? `${commitMessage.trim()}\n\n${commitDescription.trim()}`
      : commitMessage.trim();

    const options = {
      amend: amendLastCommit
    };

    if (useCustomAuthor && customAuthor.trim()) {
      options.author = customAuthor.trim();
    }

    const result = await commit(currentWorkspace.id, fullMessage, options);
    
    if (result.success) {
      setCommitMessage('');
      setCommitDescription('');
      setAmendLastCommit(false);
    }
  };

  const getCommitButtonText = () => {
    if (amendLastCommit) {
      return 'Amend Last Commit';
    }
    return stagedFiles.length > 0 
      ? `Commit (${stagedFiles.length} files)` 
      : 'Commit';
  };

  const canCommit = () => {
    return commitMessage.trim() && (stagedFiles.length > 0 || amendLastCommit) && !isLoading;
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'modified_staged': { label: 'M', color: 'text-yellow-600' },
      'added': { label: 'A', color: 'text-green-600' },
      'deleted_staged': { label: 'D', color: 'text-red-600' },
      'renamed_staged': { label: 'R', color: 'text-blue-600' },
      'copied_staged': { label: 'C', color: 'text-blue-600' }
    };

    const config = statusMap[status] || { label: '?', color: 'text-muted-foreground' };
    
    return (
      <Badge variant="outline" className={`text-xs ${config.color}`}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      {/* Commit Message */}
      <div className="space-y-2">
        <Label htmlFor="commit-message">Commit Message *</Label>
        <Textarea
          id="commit-message"
          placeholder="Enter commit message..."
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          className="min-h-[80px] resize-none"
          maxLength={72}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Keep it concise and descriptive</span>
          <span>{commitMessage.length}/72</span>
        </div>
      </div>

      {/* Commit Description */}
      <div className="space-y-2">
        <Label htmlFor="commit-description">Description (optional)</Label>
        <Textarea
          id="commit-description"
          placeholder="Add detailed description..."
          value={commitDescription}
          onChange={(e) => setCommitDescription(e.target.value)}
          className="min-h-[60px] resize-none"
        />
      </div>

      {/* Author Settings */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="custom-author"
            checked={useCustomAuthor}
            onCheckedChange={setUseCustomAuthor}
          />
          <Label htmlFor="custom-author" className="text-sm">
            Use custom author
          </Label>
        </div>
        
        {useCustomAuthor && (
          <div className="space-y-2">
            <Input
              placeholder="Author Name <email@example.com>"
              value={customAuthor}
              onChange={(e) => setCustomAuthor(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Format: Name &lt;email@example.com&gt;
            </p>
          </div>
        )}
        
        {!useCustomAuthor && user && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-3 w-3" />
            <span>Committing as: {user.name} &lt;{user.email}&gt;</span>
          </div>
        )}
      </div>

      {/* Advanced Options */}
      {commits.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="amend-commit"
              checked={amendLastCommit}
              onCheckedChange={setAmendLastCommit}
            />
            <Label htmlFor="amend-commit" className="text-sm">
              Amend last commit
            </Label>
          </div>
          
          {amendLastCommit && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Amending last commit</span>
              </div>
              <p className="text-xs text-yellow-700 mt-1">
                This will modify the last commit. Only do this if the commit hasn't been pushed.
              </p>
            </div>
          )}
        </div>
      )}

      <Separator />

      {/* Staged Files Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
            Files to be committed
          </Label>
          <Badge variant="outline" className="text-xs">
            {stagedFiles.length}
          </Badge>
        </div>
        
        {stagedFiles.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="max-h-32">
                <div className="space-y-1 p-2">
                  {stagedFiles.map((file) => (
                    <div key={file.path} className="flex items-center gap-2 text-sm">
                      <FileText className="h-3 w-3" />
                      <span className="truncate flex-1" title={file.path}>
                        {file.path}
                      </span>
                      {getStatusBadge(file.status)}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No files staged for commit</p>
            <p className="text-xs">Stage files in the Status tab first</p>
          </div>
        )}
      </div>

      {/* Commit Button */}
      <div className="mt-auto pt-4">
        <Button
          onClick={handleCommit}
          disabled={!canCommit()}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Committing...
            </>
          ) : (
            <>
              <GitCommit className="h-4 w-4 mr-2" />
              {getCommitButtonText()}
            </>
          )}
        </Button>
        
        {!commitMessage.trim() && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Enter a commit message to continue
          </p>
        )}
        
        {commitMessage.trim() && stagedFiles.length === 0 && !amendLastCommit && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            No files staged for commit
          </p>
        )}
      </div>
    </div>
  );
};

export default GitCommitPanel;