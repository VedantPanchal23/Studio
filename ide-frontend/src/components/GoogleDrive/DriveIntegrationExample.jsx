import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { 
  Cloud, 
  FolderOpen, 
  Settings 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import DriveIntegration from './DriveIntegration';

/**
 * Example component showing how to integrate Google Drive into the IDE
 * This can be used in the sidebar, settings panel, or as a modal
 */
const DriveIntegrationExample = ({ workspaceId, onFileImport }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleFileImport = (fileData) => {
    // Handle imported file - add to workspace, open in editor, etc.
    console.log('File imported:', fileData);
    
    if (onFileImport) {
      onFileImport(fileData);
    }
    
    // Close dialog after import
    setIsOpen(false);
  };

  return (
    <>
      {/* Trigger Button - can be placed anywhere in the IDE */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="flex items-center space-x-2">
            <Cloud className="h-4 w-4" />
            <span>Google Drive</span>
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Cloud className="h-5 w-5" />
              <span>Google Drive Integration</span>
            </DialogTitle>
            <DialogDescription>
              Connect and sync your workspace with Google Drive
            </DialogDescription>
          </DialogHeader>
          
          <DriveIntegration 
            workspaceId={workspaceId}
            onFileImport={handleFileImport}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

/**
 * Sidebar panel version - for permanent integration in the IDE sidebar
 */
export const DriveSidebarPanel = ({ workspaceId, onFileImport }) => {
  return (
    <div className="p-4">
      <DriveIntegration 
        workspaceId={workspaceId}
        onFileImport={onFileImport}
      />
    </div>
  );
};

/**
 * Settings panel version - for IDE settings/preferences
 */
export const DriveSettingsPanel = ({ workspaceId }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>Google Drive Settings</span>
        </CardTitle>
        <CardDescription>
          Configure Google Drive integration for this workspace
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DriveIntegration workspaceId={workspaceId} />
      </CardContent>
    </Card>
  );
};

export default DriveIntegrationExample;