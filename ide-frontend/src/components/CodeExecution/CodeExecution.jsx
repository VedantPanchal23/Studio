import React, { useState, useEffect } from 'react';
import { Play, Square, Settings, Terminal, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import useExecutionStore from '../../stores/executionStore';
import useEditorStore from '../../store/editorStore';
import useWorkspaceStore from '../../stores/workspaceStore';

/**
 * Code execution component with language selection and output display
 */
const CodeExecution = () => {
  const {
    selectedLanguage,
    supportedLanguages,
    isExecuting,
    executionOutput,
    executionError,
    activeExecution,
    containers,
    setSelectedLanguage,
    createContainer,
    executeCodeWebSocket,
    stopExecution,
    clearOutput,
    getContainerByLanguage,
    getLanguageInfo
  } = useExecutionStore();

  const { activeFile, getFileContent } = useEditorStore();
  const { currentWorkspace } = useWorkspaceStore();

  const [isCreatingContainer, setIsCreatingContainer] = useState(false);
  const [containerStatus, setContainerStatus] = useState(null);

  // Get current container for selected language
  const currentContainer = getContainerByLanguage(selectedLanguage);
  const languageInfo = getLanguageInfo(selectedLanguage);

  /**
   * Handle language selection change
   */
  const handleLanguageChange = (language) => {
    setSelectedLanguage(language);
    clearOutput();
  };

  /**
   * Create container for selected language
   */
  const handleCreateContainer = async () => {
    if (!currentWorkspace) {
      return;
    }

    setIsCreatingContainer(true);
    try {
      const container = await createContainer(selectedLanguage, currentWorkspace.id);
      setContainerStatus(`Container created: ${container.name}`);
      setTimeout(() => setContainerStatus(null), 3000);
    } catch (error) {
      console.error('Failed to create container:', error);
    } finally {
      setIsCreatingContainer(false);
    }
  };

  /**
   * Execute current file or selected code
   */
  const handleExecute = async () => {
    if (!currentContainer) {
      await handleCreateContainer();
      return;
    }

    if (!activeFile) {
      return;
    }

    try {
      const code = getFileContent(activeFile.path);
      if (!code || code.trim() === '') {
        return;
      }

      const filename = activeFile.name.split('.')[0]; // Remove extension
      await executeCodeWebSocket(currentContainer.containerId, code, filename);
    } catch (error) {
      console.error('Execution failed:', error);
    }
  };

  /**
   * Stop current execution
   */
  const handleStop = async () => {
    try {
      await stopExecution();
    } catch (error) {
      console.error('Failed to stop execution:', error);
    }
  };

  /**
   * Clear execution output
   */
  const handleClearOutput = () => {
    clearOutput();
  };

  /**
   * Get execution status display
   */
  const getExecutionStatus = () => {
    if (isExecuting) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Running
        </Badge>
      );
    }

    if (activeExecution) {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <Terminal className="h-3 w-3" />
          {activeExecution.status}
        </Badge>
      );
    }

    return null;
  };

  /**
   * Get container status display
   */
  const getContainerStatus = () => {
    if (currentContainer) {
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <div className="h-2 w-2 bg-green-500 rounded-full" />
          {languageInfo?.name} Ready
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <div className="h-2 w-2 bg-gray-400 rounded-full" />
        No Container
      </Badge>
    );
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Code Execution</CardTitle>
          <div className="flex items-center gap-2">
            {getExecutionStatus()}
            {getContainerStatus()}
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Language Selection */}
          <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {supportedLanguages.map((lang) => (
                <SelectItem key={lang.id} value={lang.id}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Execution Controls */}
          <div className="flex items-center gap-1">
            {!isExecuting ? (
              <Button
                size="sm"
                onClick={handleExecute}
                disabled={!activeFile || isCreatingContainer}
                className="flex items-center gap-1"
              >
                {isCreatingContainer ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                Run
              </Button>
            ) : (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleStop}
                className="flex items-center gap-1"
              >
                <Square className="h-3 w-3" />
                Stop
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={handleClearOutput}
              disabled={isExecuting}
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Status Messages */}
        {containerStatus && (
          <Alert>
            <AlertDescription>{containerStatus}</AlertDescription>
          </Alert>
        )}

        {executionError && (
          <Alert variant="destructive">
            <AlertDescription>{executionError}</AlertDescription>
          </Alert>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-0">
        {/* Output Display */}
        <div className="h-full bg-gray-900 text-gray-100 font-mono text-sm overflow-auto">
          <div className="p-3">
            {executionOutput ? (
              <pre className="whitespace-pre-wrap break-words">
                {executionOutput}
              </pre>
            ) : (
              <div className="text-gray-500 italic">
                {isExecuting ? 'Executing...' : 'No output yet. Run some code to see results.'}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CodeExecution;