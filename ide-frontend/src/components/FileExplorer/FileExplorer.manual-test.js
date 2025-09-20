/**
 * Manual test file for FileExplorer component
 * This file can be used to manually verify FileExplorer functionality
 */

// Test data for FileExplorer
export const mockFileData = [
  {
    name: 'src',
    path: 'src',
    type: 'directory',
    children: [
      { name: 'components', path: 'src/components', type: 'directory' },
      { name: 'utils', path: 'src/utils', type: 'directory' },
      { name: 'App.jsx', path: 'src/App.jsx', type: 'file', size: 2048 }
    ]
  },
  {
    name: 'package.json',
    path: 'package.json',
    type: 'file',
    size: 1024
  },
  {
    name: 'README.md',
    path: 'README.md',
    type: 'file',
    size: 512
  },
  {
    name: '.gitignore',
    path: '.gitignore',
    type: 'file',
    size: 256
  }
];

// Test scenarios for FileExplorer
export const testScenarios = {
  // Test 1: Basic rendering
  basicRendering: {
    description: 'FileExplorer should render with file tree',
    steps: [
      '1. Load FileExplorer component',
      '2. Verify "Explorer" header is visible',
      '3. Verify file tree shows files and folders',
      '4. Verify toolbar buttons (New File, New Folder, Upload, Refresh) are present'
    ]
  },

  // Test 2: File operations
  fileOperations: {
    description: 'File and folder operations should work',
    steps: [
      '1. Click "New File" button',
      '2. Verify create file modal opens',
      '3. Enter file name and create',
      '4. Right-click on a file',
      '5. Verify context menu appears with rename/delete options',
      '6. Test rename functionality',
      '7. Test delete functionality'
    ]
  },

  // Test 3: Search functionality
  searchFunctionality: {
    description: 'Search should filter files correctly',
    steps: [
      '1. Type in search input',
      '2. Verify files are filtered based on search query',
      '3. Clear search',
      '4. Verify all files are shown again'
    ]
  },

  // Test 4: Drag and drop
  dragAndDrop: {
    description: 'Drag and drop should work for file organization',
    steps: [
      '1. Drag a file over a folder',
      '2. Verify drop target highlighting',
      '3. Drop file into folder',
      '4. Verify file is moved to folder'
    ]
  },

  // Test 5: Sorting
  sorting: {
    description: 'File sorting should work correctly',
    steps: [
      '1. Click "Name" sort button',
      '2. Verify files are sorted by name',
      '3. Click again to reverse order',
      '4. Test "Modified" sort button',
      '5. Verify files are sorted by modification date'
    ]
  },

  // Test 6: Hidden files toggle
  hiddenFiles: {
    description: 'Hidden files toggle should work',
    steps: [
      '1. Click hidden files toggle button',
      '2. Verify hidden files (starting with .) are shown/hidden',
      '3. Toggle again to verify state change'
    ]
  }
};

// Validation functions
export const validateFileExplorer = {
  hasRequiredElements: (container) => {
    const header = container.querySelector('h2');
    const searchInput = container.querySelector('input[placeholder*="Search"]');
    const newFileBtn = container.querySelector('button[title="New File"]');
    const newFolderBtn = container.querySelector('button[title="New Folder"]');
    const uploadBtn = container.querySelector('button[title="Upload Files"]');
    const refreshBtn = container.querySelector('button[title="Refresh"]');

    return {
      hasHeader: !!header && header.textContent.includes('Explorer'),
      hasSearchInput: !!searchInput,
      hasNewFileBtn: !!newFileBtn,
      hasNewFolderBtn: !!newFolderBtn,
      hasUploadBtn: !!uploadBtn,
      hasRefreshBtn: !!refreshBtn
    };
  },

  hasFileTree: (container) => {
    // Look for file tree items
    const fileItems = container.querySelectorAll('[draggable="true"]');
    return fileItems.length > 0;
  },

  canInteractWithFiles: (container) => {
    const fileItems = container.querySelectorAll('[draggable="true"]');
    let canClick = true;
    let canRightClick = true;

    fileItems.forEach(item => {
      if (!item.onclick && !item.addEventListener) {
        canClick = false;
      }
      if (!item.oncontextmenu) {
        canRightClick = false;
      }
    });

    return { canClick, canRightClick };
  }
};

// Usage example:
/*
import { FileExplorer } from './FileExplorer';
import { mockFileData, testScenarios, validateFileExplorer } from './FileExplorer.manual-test';

// In your test component or development environment:
function TestFileExplorer() {
  const handleFileOpen = (path, name) => {
    console.log('File opened:', path, name);
  };

  return (
    <div style={{ height: '500px', width: '300px' }}>
      <FileExplorer 
        workspaceId="test-workspace"
        onFileOpen={handleFileOpen}
      />
    </div>
  );
}

// Run validation
const container = document.querySelector('.file-explorer-container');
const validation = validateFileExplorer.hasRequiredElements(container);
console.log('Validation results:', validation);
*/