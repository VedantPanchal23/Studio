// Helper utility functions
// Common utility functions will be implemented here

export const getFileExtension = (filename) => {
  return filename.split('.').pop().toLowerCase();
};

export const getLanguageFromExtension = (extension) => {
  const extensionMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'cpp',
    'go': 'go',
    'rs': 'rust'
  };
  return extensionMap[extension] || 'plaintext';
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};