import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { 
  Sync, 
  Upload, 
  Download, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Settings,
  FolderOpen,
  RefreshCw
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import useDriveStore from '../../stores/driveStore';
import { formatDate } from '../../utils/formatters';

const DriveSyncPanel = ({ workspaceId }) => {
  const {
    syncStatus,
    isLoading,
    error,
    getSyncStatus,
    syncWorkspace,
    importFromDrive
  } = useDriveStore();

  const [syncOptions, setSyncOptions] = useState({
    createFolder: true,
    overwriteExisting: false,
    excludePatterns: ['.git', 'node_modules', '.env']
  });
  const [showSyncOptions, setShowSyncOptions] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);

  useEffect(() => {
    if (workspaceId) {
      getSyncStatus(workspaceId);
    }
  }, [workspaceId, getSyncStatus]);

  const handleSyncToDrive = async () => {
    try {
      setSyncProgress({ type: 'upload', progress: 0 });
      const result = await syncWorkspace(workspaceId, syncOptions);
      
      // Simulate progress updates (in real implementation, this would come from WebSocket)
      for (let i = 0; i <= 100; i += 10) {
        setSyncProgress({ type: 'upload', progress: i });
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setSyncProgress(null);
      
      // Show success message with results
      alert(`Sync completed!\nUploaded: ${result.uploaded.length}\nUpdated: ${result.updated.length}\nSkipped: ${result.skipped.length}`);
    } catch (error) {
      setSyncProgress(null);
      console.error('Sync failed:', error);
    }
  };

  const handleImportFromDrive = async () => {
    if (!syncStatus.folderId) {
      alert('No Drive folder is linked to this workspace. Please sync to Drive first.');
      return;
    }

    try {
      setSyncProgress({ type: 'download', progress: 0 });
      const result = await importFromDrive(workspaceId, syncStatus.folderId);
      
      // Simulate progress updates
      for (let i = 0; i <= 100; i += 10) {
        setSyncProgress({ type: 'download', progress: i });
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setSyncProgress(null);
      
      // Show success message with results
      alert(`Import completed!\nImported: ${result.imported.length}\nUpdated: ${result.updated.length}\nSkipped: ${result.skipped.length}`);
    } catch (error) {
      setSyncProgress(null);
      console.error('Import failed:', error);
    }
  };

  const handleRefreshStatus = async () => {
    try {
      await getSyncStatus(workspaceId);
    } catch (error) {
      console.error('Failed to refresh status:', error);
    }
  };

  const getSyncStatusBadge = () => {
    if (syncStatus.inProgress || syncProgress) {
      return (
        <Badge variant="secondary" className="flex items-center space-x-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Syncing</span>
        </Badge>
      );
    }

    if (!syncStatus.enabled) {
      return (
        <Badge variant="outline" className="flex items-center space-x-1">
          <AlertCircle className="h-3 w-3" />
          <span>Not Synced</span>
        </Badge>
      );
    }

    return (
      <Badge variant="default" className="flex items-center space-x-1">
        <CheckCircle className="h-3 w-3" />
        <span>Synced</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Sync Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sync className="h-5 w-5" />
              <CardTitle>Sync Status</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              {getSyncStatusBadge()}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshStatus}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          <CardDescription>
            Manage synchronization between your workspace and Google Drive.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {/* Sync Information */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-gray-600">Drive Folder</Label>
                <p className="font-medium">
                  {syncStatus.folderId ? (
                    <span className="flex items-center">
                      <FolderOpen className="h-4 w-4 mr-1" />
                      Linked
                    </span>
                  ) : (
                    'Not linked'
                  )}
                </p>
              </div>
              <div>
                <Label className="text-gray-600">Last Sync</Label>
                <p className="font-medium">
                  {syncStatus.lastSync ? (
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatDate(syncStatus.lastSync)}
                    </span>
                  ) : (
                    'Never'
                  )}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            {syncProgress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center">
                    {syncProgress.type === 'upload' ? (
                      <>
                        <Upload className="h-4 w-4 mr-1" />
                        Uploading to Drive...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-1" />
                        Downloading from Drive...
                      </>
                    )}
                  </span>
                  <span>{syncProgress.progress}%</span>
                </div>
                <Progress value={syncProgress.progress} className="w-full" />
              </div>
            )}

            {/* Sync Actions */}
            <div className="flex space-x-2">
              <Button
                onClick={handleSyncToDrive}
                disabled={syncStatus.inProgress || syncProgress || isLoading}
                className="flex-1"
              >
                {syncStatus.inProgress || (syncProgress?.type === 'upload') ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Sync to Drive
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handleImportFromDrive}
                disabled={syncStatus.inProgress || syncProgress || isLoading || !syncStatus.folderId}
                className="flex-1"
              >
                {syncProgress?.type === 'download' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Import from Drive
                  </>
                )}
              </Button>

              <Dialog open={showSyncOptions} onOpenChange={setShowSyncOptions}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Sync Options</DialogTitle>
                    <DialogDescription>
                      Configure how files are synchronized with Google Drive.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="create-folder"
                        checked={syncOptions.createFolder}
                        onCheckedChange={(checked) =>
                          setSyncOptions(prev => ({ ...prev, createFolder: checked }))
                        }
                      />
                      <Label htmlFor="create-folder">Create Drive folder if it doesn't exist</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="overwrite-existing"
                        checked={syncOptions.overwriteExisting}
                        onCheckedChange={(checked) =>
                          setSyncOptions(prev => ({ ...prev, overwriteExisting: checked }))
                        }
                      />
                      <Label htmlFor="overwrite-existing">Overwrite existing files in Drive</Label>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Exclude Patterns</Label>
                      <p className="text-sm text-gray-600 mb-2">
                        Files and folders matching these patterns will be excluded from sync.
                      </p>
                      <div className="space-y-2">
                        {syncOptions.excludePatterns.map((pattern, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <Badge variant="secondary">{pattern}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowSyncOptions(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={() => setShowSyncOptions(false)}>
                      Save Options
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How Sync Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start space-x-2">
              <Upload className="h-4 w-4 mt-0.5 text-blue-500" />
              <div>
                <p className="font-medium">Sync to Drive</p>
                <p>Uploads your workspace files to Google Drive, creating a backup and enabling access from anywhere.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <Download className="h-4 w-4 mt-0.5 text-green-500" />
              <div>
                <p className="font-medium">Import from Drive</p>
                <p>Downloads files from your linked Drive folder into the current workspace.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <Sync className="h-4 w-4 mt-0.5 text-purple-500" />
              <div>
                <p className="font-medium">Automatic Sync</p>
                <p>Files are automatically synced when you save changes, ensuring your Drive backup is always up to date.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DriveSyncPanel;