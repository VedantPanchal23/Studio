import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Cloud, 
  CloudOff, 
  Loader2, 
  RefreshCw, 
  Upload, 
  Download,
  AlertCircle,
  CheckCircle,
  Sync,
  FolderOpen
} from 'lucide-react';
import useDriveStore from '../../stores/driveStore';
import DriveFileBrowser from './DriveFileBrowser';
import DriveSyncPanel from './DriveSyncPanel';
import DriveStorageInfo from './DriveStorageInfo';

const DriveIntegration = ({ workspaceId, onFileImport }) => {
  const {
    isConnected,
    hasAccess,
    isLoading,
    error,
    checkStatus,
    connect,
    disconnect,
    clearError
  } = useDriveStore();

  const [activeTab, setActiveTab] = useState('browser');

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Failed to connect to Drive:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Failed to disconnect from Drive:', error);
    }
  };

  const handleRefresh = async () => {
    try {
      await checkStatus();
    } catch (error) {
      console.error('Failed to refresh status:', error);
    }
  };

  const getConnectionStatus = () => {
    if (!isConnected) {
      return {
        icon: CloudOff,
        text: 'Not Connected',
        variant: 'secondary',
        color: 'text-gray-500'
      };
    }
    
    if (!hasAccess) {
      return {
        icon: AlertCircle,
        text: 'Access Expired',
        variant: 'destructive',
        color: 'text-red-500'
      };
    }
    
    return {
      icon: CheckCircle,
      text: 'Connected',
      variant: 'default',
      color: 'text-green-500'
    };
  };

  const status = getConnectionStatus();
  const StatusIcon = status.icon;

  if (isLoading && !isConnected) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Checking Google Drive connection...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cloud className="h-5 w-5" />
              <CardTitle>Google Drive Integration</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={status.variant} className="flex items-center space-x-1">
                <StatusIcon className={`h-3 w-3 ${status.color}`} />
                <span>{status.text}</span>
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          <CardDescription>
            Sync your workspace with Google Drive for automatic backup and access from anywhere.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button variant="ghost" size="sm" onClick={clearError}>
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {!isConnected ? (
            <div className="text-center py-6">
              <Cloud className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">Connect to Google Drive</h3>
              <p className="text-gray-600 mb-4">
                Connect your Google Drive to sync files and enable automatic backup.
              </p>
              <Button onClick={handleConnect} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Cloud className="h-4 w-4 mr-2" />
                    Connect Google Drive
                  </>
                )}
              </Button>
            </div>
          ) : !hasAccess ? (
            <div className="text-center py-6">
              <AlertCircle className="h-12 w-12 mx-auto text-orange-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">Access Expired</h3>
              <p className="text-gray-600 mb-4">
                Your Google Drive access has expired. Please reconnect to continue using Drive features.
              </p>
              <div className="flex justify-center space-x-2">
                <Button onClick={handleConnect} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Reconnecting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reconnect
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleDisconnect}>
                  <CloudOff className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="browser" className="flex items-center space-x-2">
                  <FolderOpen className="h-4 w-4" />
                  <span>Browse Files</span>
                </TabsTrigger>
                <TabsTrigger value="sync" className="flex items-center space-x-2">
                  <Sync className="h-4 w-4" />
                  <span>Sync</span>
                </TabsTrigger>
                <TabsTrigger value="storage" className="flex items-center space-x-2">
                  <Cloud className="h-4 w-4" />
                  <span>Storage</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="browser" className="mt-4">
                <DriveFileBrowser 
                  workspaceId={workspaceId}
                  onFileImport={onFileImport}
                />
              </TabsContent>

              <TabsContent value="sync" className="mt-4">
                <DriveSyncPanel workspaceId={workspaceId} />
              </TabsContent>

              <TabsContent value="storage" className="mt-4">
                <DriveStorageInfo />
              </TabsContent>
            </Tabs>
          )}

          {isConnected && hasAccess && (
            <div className="flex justify-end mt-4 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={handleDisconnect}
                disabled={isLoading}
              >
                <CloudOff className="h-4 w-4 mr-2" />
                Disconnect Drive
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DriveIntegration;