import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  HardDrive, 
  Loader2, 
  AlertCircle, 
  RefreshCw,
  Cloud,
  Database,
  Archive
} from 'lucide-react';
import { Button } from '../ui/button';
import useDriveStore from '../../stores/driveStore';
import { formatBytes } from '../../utils/formatters';

const DriveStorageInfo = () => {
  const {
    storageInfo,
    isLoading,
    error,
    getStorageInfo
  } = useDriveStore();

  useEffect(() => {
    getStorageInfo();
  }, [getStorageInfo]);

  const handleRefresh = async () => {
    try {
      await getStorageInfo();
    } catch (error) {
      console.error('Failed to refresh storage info:', error);
    }
  };

  if (isLoading && !storageInfo) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading storage information...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="ghost" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!storageInfo) {
    return (
      <Card>
        <CardContent className="text-center p-8 text-gray-500">
          <HardDrive className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>No storage information available</p>
          <Button variant="outline" onClick={handleRefresh} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  const quota = storageInfo.storageQuota;
  const usedBytes = parseInt(quota?.usage || 0);
  const totalBytes = parseInt(quota?.limit || 0);
  const usagePercentage = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0;

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 75) return 'text-orange-500';
    if (percentage >= 50) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="space-y-4">
      {/* Storage Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HardDrive className="h-5 w-5" />
              <CardTitle>Storage Usage</CardTitle>
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
          <CardDescription>
            Your Google Drive storage usage and available space.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Usage Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Used Storage</span>
                <span className={getUsageColor(usagePercentage)}>
                  {formatBytes(usedBytes)} of {formatBytes(totalBytes)}
                </span>
              </div>
              <Progress 
                value={usagePercentage} 
                className="w-full h-2"
              />
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>0%</span>
                <span>{usagePercentage.toFixed(1)}% used</span>
                <span>100%</span>
              </div>
            </div>

            {/* Storage Breakdown */}
            {quota?.usageInDrive && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Cloud className="h-8 w-8 text-blue-500" />
                  </div>
                  <p className="text-sm font-medium">Drive Files</p>
                  <p className="text-lg font-bold text-blue-500">
                    {formatBytes(parseInt(quota.usageInDrive))}
                  </p>
                </div>

                {quota.usageInDriveTrash && (
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Archive className="h-8 w-8 text-gray-500" />
                    </div>
                    <p className="text-sm font-medium">Trash</p>
                    <p className="text-lg font-bold text-gray-500">
                      {formatBytes(parseInt(quota.usageInDriveTrash))}
                    </p>
                  </div>
                )}

                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Database className="h-8 w-8 text-green-500" />
                  </div>
                  <p className="text-sm font-medium">Available</p>
                  <p className="text-lg font-bold text-green-500">
                    {formatBytes(totalBytes - usedBytes)}
                  </p>
                </div>
              </div>
            )}

            {/* Storage Warnings */}
            {usagePercentage >= 90 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your Google Drive is almost full. Consider cleaning up files or upgrading your storage plan.
                </AlertDescription>
              </Alert>
            )}

            {usagePercentage >= 75 && usagePercentage < 90 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your Google Drive is getting full. You may want to review and delete unnecessary files.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Information */}
      {storageInfo.user && (
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              {storageInfo.user.photoLink && (
                <img
                  src={storageInfo.user.photoLink}
                  alt={storageInfo.user.displayName}
                  className="w-12 h-12 rounded-full"
                />
              )}
              <div>
                <p className="font-medium">{storageInfo.user.displayName}</p>
                <p className="text-sm text-gray-600">{storageInfo.user.emailAddress}</p>
                {storageInfo.user.permissionId && (
                  <Badge variant="secondary" className="mt-1">
                    ID: {storageInfo.user.permissionId}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Storage Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start space-x-2">
              <Archive className="h-4 w-4 mt-0.5 text-gray-400" />
              <div>
                <p className="font-medium">Empty Trash</p>
                <p>Files in trash still count toward your storage quota. Empty trash to free up space.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <Cloud className="h-4 w-4 mt-0.5 text-blue-400" />
              <div>
                <p className="font-medium">Large Files</p>
                <p>Review and remove large files you no longer need, especially videos and archives.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <Database className="h-4 w-4 mt-0.5 text-green-400" />
              <div>
                <p className="font-medium">Upgrade Storage</p>
                <p>Consider upgrading to Google One for more storage space and additional features.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DriveStorageInfo;