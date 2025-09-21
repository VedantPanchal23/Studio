import React, { useState } from 'react';
import { Play, Square, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';
import useExecutionStore from '../../stores/executionStore';
import useEditorStore from '../../store/editorStore';
import useWorkspaceStore from '../../stores/workspaceStore';

/**
 * Run button component for executing code from the editor
 */
const RunButton = () => {
  const {
    selectedLanguage,
    supportedLanguages,
    isExecuting,
    activeExecution,
    setSelectedLanguage,
    createContainer,
    executeCodeWebSocket,
    stopExecution,
    getContainerByLanguage
  } = useExecutionStore();

  const { activeFile, getFileContent } = useEditorStore();
  const { currentWorkspace } = useWorkspaceStore();

  const [isCreatingContainer, setIsCreatingContainer] = useState(false);

  // Get current container
  const currentContainer = getContainerByLanguage(selectedLanguage);

  /**
   * Detect language from file extension
   */
  const detectLanguageFromFile = (filename) => {
    if (!filename) return selectedLanguage;

    const extension = filename.split('.').pop()?.toLowerCase();
    const languageMap = {
      'js': 'node',
      'jsx': 'node',
      'ts': 'node',
      'tsx': 'node',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'cc': 'cpp',
      'cxx': 'cpp',
      'go': 'go',
      'rs': 'rust'
    };

    return languageMap[extension] || selectedLanguage;
  };

  /**
   * Handle language selection
   */
  const handleLanguageSelect = (language) => {
    setSelectedLanguage(language);
  };

  /**
   * Execute current file
   */
  const handleExecute = async () => {
    if (!activeFile || !currentWorkspace) {
      return;
    }

    try {
      // Auto-detect language if needed
      const detectedLanguage = detectLanguageFromFile(activeFile.name);
      if (detectedLanguage !== selectedLanguage) {
        setSelectedLanguage(detectedLanguage);
      }

      // Get or create container
      let container = getContainerByLanguage(detectedLanguage);
      
      if (!container) {
        setIsCreatingContainer(true);
        container = await createContainer(detectedLanguage, currentWorkspace.id);
        setIsCreatingContainer(false);
      }

      // Get code content
      const code = getFileContent(activeFile.path);
      if (!code || code.trim() === '') {
        return;
      }

      // Execute code
      const filename = activeFile.name.split('.')[0]; // Remove extension
      await executeCodeWebSocket(container.containerId, code, filename);
    } catch (error) {
      console.error('Execution failed:', error);
      setIsCreatingContainer(false);
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
   * Check if file is executable
   */
  const isFileExecutable = () => {
    if (!activeFile) return false;
    
    const extension = activeFile.name.split('.').pop()?.toLowerCase();
    const executableExtensions = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'cc', 'cxx', 'go', 'rs'];
    
    return executableExtensions.includes(extension);
  };

  /**
   * Get button variant based on state
   */
  const getButtonVariant = () => {
    if (isExecuting) return 'destructive';
    if (currentContainer) return 'default';
    return 'secondary';
  };

  /**
   * Get button text
   */
  const getButtonText = () => {
    if (isCreatingContainer) return 'Creating...';
    if (isExecuting) return 'Stop';
    if (!currentContainer) return 'Run (Create Container)';
    return 'Run';
  };

  /**
   * Get button icon
   */
  const getButtonIcon = () => {
    if (isCreatingContainer) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (isExecuting) return <Square className="h-4 w-4" />;
    return <Play className="h-4 w-4" />;
  };

  if (!isFileExecutable()) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      {/* Main Run/Stop Button */}
      <Button
        size="sm"
        variant={getButtonVariant()}
        onClick={isExecuting ? handleStop : handleExecute}
        disabled={!activeFile || isCreatingContainer}
        className="flex items-center gap-1"
      >
        {getButtonIcon()}
        {getButtonText()}
      </Button>

      {/* Language Selection Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="px-2"
            disabled={isExecuting || isCreatingContainer}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5 text-xs font-medium text-gray-500">
            Runtime Environment
          </div>
          <DropdownMenuSeparator />
          
          {supportedLanguages.map((lang) => (
            <DropdownMenuItem
              key={lang.id}
              onClick={() => handleLanguageSelect(lang.id)}
              className="flex items-center justify-between"
            >
              <span>{lang.name}</span>
              {selectedLanguage === lang.id && (
                <Badge variant="secondary" className="text-xs">
                  Selected
                </Badge>
              )}
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          
          <div className="px-2 py-1.5 text-xs text-gray-500">
            Container Status: {currentContainer ? (
              <span className="text-green-600 font-medium">Ready</span>
            ) : (
              <span className="text-gray-400">Not Created</span>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Execution Status Badge */}
      {activeExecution && (
        <Badge 
          variant={isExecuting ? "secondary" : "outline"} 
          className="text-xs"
        >
          {isExecuting ? 'Running' : activeExecution.status}
        </Badge>
      )}
    </div>
  );
};

export default RunButton;