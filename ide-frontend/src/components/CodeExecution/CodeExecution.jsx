import React, { useState } from 'react';
import { Play, Square, Settings, Terminal, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import useExecutionStore from '../../stores/executionStore';
import useEditorStore from '../../store/editorStore';
import useWorkspaceStore from '../../stores/workspaceStore';
import styles from './CodeExecution.module.css';

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
        <Badge variant="secondary" className={styles.statusBadge}>
          <Loader2 className={styles.spinIcon} />
          Running
        </Badge>
      );
    }

    if (activeExecution) {
      return (
        <Badge variant="outline" className={styles.statusBadge}>
          <Terminal className={styles.statusIcon} />
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
        <Badge variant="default" className={styles.statusBadge}>
          <div className={`${styles.containerStatusIcon} ${styles.containerReady}`} />
          {languageInfo?.name} Ready
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className={styles.statusBadge}>
        <div className={`${styles.containerStatusIcon} ${styles.containerNotReady}`} />
        No Container
      </Badge>
    );
  };

  return (
    <Card className={styles.container}>
      <CardHeader className={styles.header}>
        <div className={styles.headerTop}>
          <CardTitle className={styles.title}>Code Execution</CardTitle>
          <div className={styles.statusContainer}>
            {getExecutionStatus()}
            {getContainerStatus()}
          </div>
        </div>
        
        {/* Controls */}
        <div className={styles.controls}>
          {/* Language Selection */}
          <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
            <SelectTrigger className={styles.languageSelect}>
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
          <div className={styles.executionControls}>
            {!isExecuting ? (
              <Button
                size="sm"
                onClick={handleExecute}
                disabled={!activeFile || isCreatingContainer}
                className={styles.runButton}
              >
                {isCreatingContainer ? (
                  <Loader2 className={styles.spinIcon} />
                ) : (
                  <Play className={styles.statusIcon} />
                )}
                Run
              </Button>
            ) : (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleStop}
                className={styles.stopButton}
              >
                <Square className={styles.statusIcon} />
                Stop
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={handleClearOutput}
              disabled={isExecuting}
              className={styles.clearButton}
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

      <CardContent className={styles.content}>
        {/* Output Display */}
        <div className={styles.outputContainer}>
          <div className={styles.outputContent}>
            {executionOutput ? (
              <pre className={styles.outputText}>
                {executionOutput}
              </pre>
            ) : (
              <div className={styles.noOutput}>
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