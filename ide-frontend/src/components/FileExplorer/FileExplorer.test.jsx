import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileExplorer } from './FileExplorer';
import { useFileStore } from '../../stores/fileStore';

// Mock the file store
jest.mock('../../stores/fileStore');

// Mock the FileAPI
jest.mock('../../services/fileAPI', () => ({
  FileAPI: {
    listFiles: jest.fn(),
    getFileIcon: jest.fn(() => '📄'),
    formatFileSize: jest.fn(() => '1 KB'),
    validateFileName: jest.fn(() => ({ isValid: true, errors: [] })),
    sortFiles: jest.fn((files) => files)
  }
}));

describe('FileExplorer', () => {
  const mockFileStore = {
    files: [
      { name: 'test.js', path: 'test.js', type: 'file', size: 1024 },
      { name: 'src', path: 'src', type: 'directory' }
    ],
    loading: false,
    error: null,
    searchQuery: '',
    sortBy: 'name',
    sortOrder: 'asc',
    showHiddenFiles: false,
    expandedFolders: new Set(),
    selectedFile: null,
    setCurrentWorkspace: jest.fn(),
    loadFiles: jest.fn(),
    refreshFiles: jest.fn(),
    createFile: jest.fn(),
    createDirectory: jest.fn(),
    deleteItem: jest.fn(),
    renameItem: jest.fn(),
    copyItem: jest.fn(),
    uploadFiles: jest.fn(),
    toggleFolder: jest.fn(),
    selectFile: jest.fn(),
    setSearchQuery: jest.fn(),
    setSortBy: jest.fn(),
    setSortOrder: jest.fn(),
    toggleHiddenFiles: jest.fn(),
    clearError: jest.fn(),
    getFilteredFiles: jest.fn(() => [
      { name: 'test.js', path: 'test.js', type: 'file', size: 1024 },
      { name: 'src', path: 'src', type: 'directory' }
    ]),
    isExpanded: jest.fn(() => false),
    isSelected: jest.fn(() => false),
    getFileIcon: jest.fn(() => '📄'),
    formatFileSize: jest.fn(() => '1 KB'),
    validateFileName: jest.fn(() => ({ isValid: true, errors: [] }))
  };

  beforeEach(() => {
    useFileStore.mockReturnValue(mockFileStore);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders file explorer with files', () => {
    render(<FileExplorer workspaceId="test-workspace" />);
    
    expect(screen.getByText('Explorer')).toBeInTheDocument();
    expect(screen.getByText('test.js')).toBeInTheDocument();
    expect(screen.getByText('src')).toBeInTheDocument();
  });

  it('calls onFileOpen when file is clicked', () => {
    const mockOnFileOpen = jest.fn();
    render(<FileExplorer workspaceId="test-workspace" onFileOpen={mockOnFileOpen} />);
    
    fireEvent.click(screen.getByText('test.js'));
    
    expect(mockFileStore.selectFile).toHaveBeenCalledWith('test.js');
  });

  it('shows search input', () => {
    render(<FileExplorer workspaceId="test-workspace" />);
    
    const searchInput = screen.getByPlaceholderText('Search files...');
    expect(searchInput).toBeInTheDocument();
  });

  it('shows create file button', () => {
    render(<FileExplorer workspaceId="test-workspace" />);
    
    const createButton = screen.getByTitle('New File');
    expect(createButton).toBeInTheDocument();
  });

  it('shows refresh button', () => {
    render(<FileExplorer workspaceId="test-workspace" />);
    
    const refreshButton = screen.getByTitle('Refresh');
    expect(refreshButton).toBeInTheDocument();
  });

  it('displays loading state', () => {
    useFileStore.mockReturnValue({
      ...mockFileStore,
      loading: true,
      getFilteredFiles: jest.fn(() => [])
    });

    render(<FileExplorer workspaceId="test-workspace" />);
    
    expect(screen.getByText('Loading files...')).toBeInTheDocument();
  });

  it('displays error state', () => {
    useFileStore.mockReturnValue({
      ...mockFileStore,
      error: 'Failed to load files'
    });

    render(<FileExplorer workspaceId="test-workspace" />);
    
    expect(screen.getByText('Failed to load files')).toBeInTheDocument();
  });

  it('displays empty state when no files', () => {
    useFileStore.mockReturnValue({
      ...mockFileStore,
      getFilteredFiles: jest.fn(() => [])
    });

    render(<FileExplorer workspaceId="test-workspace" />);
    
    expect(screen.getByText('No files in this workspace')).toBeInTheDocument();
  });
});