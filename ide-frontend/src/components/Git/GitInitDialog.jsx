import React, { useState } from 'react';
import { GitBranch, User, Mail } from 'lucide-react';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

import useGitStore from '../../stores/gitStore';
import useWorkspaceStore from '../../stores/workspaceStore';
import useAuthStore from '../../stores/authStore';

const GitInitDialog = ({ open, onOpenChange }) => {
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [useAuthUser, setUseAuthUser] = useState(true);

  const { initRepository, isLoading } = useGitStore();
  const { currentWorkspace } = useWorkspaceStore();
  const { user } = useAuthStore();

  React.useEffect(() => {
    if (user && useAuthUser) {
      setUserName(user.name || '');
      setUserEmail(user.email || '');
    }
  }, [user, useAuthUser]);

  const handleInit = async () => {
    if (!currentWorkspace?.id) return;

    const options = {};
    
    if (userName.trim()) {
      options.userName = userName.trim();
    }
    
    if (userEmail.trim()) {
      options.userEmail = userEmail.trim();
    }

    const result = await initRepository(currentWorkspace.id, options);
    
    if (result.success) {
      onOpenChange(false);
      // Reset form
      setUserName(user?.name || '');
      setUserEmail(user?.email || '');
      setUseAuthUser(true);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Reset form
    setUserName(user?.name || '');
    setUserEmail(user?.email || '');
    setUseAuthUser(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Initialize Git Repository
          </DialogTitle>
          <DialogDescription>
            Initialize a new Git repository in this workspace. This will create a .git folder 
            and set up version control for your project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="use-auth-user"
                checked={useAuthUser}
                onChange={(e) => {
                  setUseAuthUser(e.target.checked);
                  if (e.target.checked && user) {
                    setUserName(user.name || '');
                    setUserEmail(user.email || '');
                  }
                }}
                className="rounded"
              />
              <Label htmlFor="use-auth-user" className="text-sm">
                Use my account information
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-name" className="flex items-center gap-2">
                <User className="h-3 w-3" />
                User Name
              </Label>
              <Input
                id="user-name"
                placeholder="Your Name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                disabled={useAuthUser}
              />
              <p className="text-xs text-muted-foreground">
                This will be used for Git commits
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-email" className="flex items-center gap-2">
                <Mail className="h-3 w-3" />
                Email Address
              </Label>
              <Input
                id="user-email"
                type="email"
                placeholder="your.email@example.com"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                disabled={useAuthUser}
              />
              <p className="text-xs text-muted-foreground">
                This will be associated with your commits
              </p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-md p-3">
            <h4 className="text-sm font-medium mb-2">What happens when you initialize:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Creates a .git directory in your workspace</li>
              <li>• Sets up Git configuration with your user information</li>
              <li>• Enables version control for your files</li>
              <li>• Creates an initial 'main' branch</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleInit} 
            disabled={isLoading || !userName.trim() || !userEmail.trim()}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Initializing...
              </>
            ) : (
              <>
                <GitBranch className="h-4 w-4 mr-2" />
                Initialize Repository
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GitInitDialog;