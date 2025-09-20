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
import styles from './DriveIntegration.module.css';

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
        <CardContent className={styles.loadingCard}>
          <Loader2 className={styles.loadingSpinner} />
          <span className={styles.loadingText}>Checking Google Drive connection...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={styles.driveIntegration}>
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className={styles.statusHeader}>
            <div className={styles.statusLeft}>
              <Cloud className={styles.statusIcon} />
              <CardTitle>Google Drive Integration</CardTitle>
            </div>
            <div className={styles.statusRight}>
              <Badge variant={status.variant} className={styles.statusBadge}>
                <StatusIcon className={`h-3 w-3 ${status.color}`} />
                <span>{status.text}</span>
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className={styles.refreshButton}
              >
                <RefreshCw className={`${styles.refreshIcon} ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          <CardDescription>
            Sync your workspace with Google Drive for automatic backup and access from anywhere.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className={styles.errorAlert}>
              <AlertCircle className={styles.errorIcon} />
              <AlertDescription className={styles.errorContent}>
                <span>{error}</span>
                <Button variant="ghost" size="sm" onClick={clearError}>
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {!isConnected ? (
            <div className={styles.connectSection}>
              <Cloud className={styles.connectIcon} />
              <h3 className={styles.connectTitle}>Connect to Google Drive</h3>
              <p className={styles.connectDescription}>
                Connect your Google Drive to sync files and enable automatic backup.
              </p>
              <Button onClick={handleConnect} disabled={isLoading} className={styles.connectButton}>
                {isLoading ? (
                  <>
                    <Loader2 className={`${styles.connectButtonIcon} animate-spin`} />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Cloud className={styles.connectButtonIcon} />
                    Connect Google Drive
                  </>
                )}
              </Button>
            </div>
          ) : !hasAccess ? (
            <div className={styles.accessExpiredSection}>
              <AlertCircle className={styles.accessExpiredIcon} />
              <h3 className={styles.accessExpiredTitle}>Access Expired</h3>
              <p className={styles.accessExpiredDescription}>
                Your Google Drive access has expired. Please reconnect to continue using Drive features.
              </p>
              <div className={styles.accessExpiredActions}>
                <Button onClick={handleConnect} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className={`${styles.connectButtonIcon} animate-spin`} />
                      Reconnecting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className={styles.connectButtonIcon} />
                      Reconnect
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleDisconnect}>
                  <CloudOff className={styles.connectButtonIcon} />
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className={styles.tabsContainer}>
              <TabsList className={styles.tabsList}>
                <TabsTrigger value="browser" className={styles.tabsTrigger}>
                  <FolderOpen className={styles.tabIcon} />
                  <span>Browse Files</span>
                </TabsTrigger>
                <TabsTrigger value="sync" className={styles.tabsTrigger}>
                  <Sync className={styles.tabIcon} />
                  <span>Sync</span>
                </TabsTrigger>
                <TabsTrigger value="storage" className={styles.tabsTrigger}>
                  <Cloud className={styles.tabIcon} />
                  <span>Storage</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="browser" className={styles.tabsContent}>
                <DriveFileBrowser 
                  workspaceId={workspaceId}
                  onFileImport={onFileImport}
                />
              </TabsContent>

              <TabsContent value="sync" className={styles.tabsContent}>
                <DriveSyncPanel workspaceId={workspaceId} />
              </TabsContent>

              <TabsContent value="storage" className={styles.tabsContent}>
                <DriveStorageInfo />
              </TabsContent>
            </Tabs>
          )}

          {isConnected && hasAccess && (
            <div className={styles.disconnectActions}>
              <Button 
                variant="outline" 
                onClick={handleDisconnect}
                disabled={isLoading}
                className={styles.disconnectButton}
              >
                <CloudOff className={styles.connectButtonIcon} />
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