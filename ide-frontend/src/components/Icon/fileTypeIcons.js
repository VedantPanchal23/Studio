import {
  FileText,
  FileCode,
  FileImage,
  FileVideo,
  FileArchive,
  Folder,
  FolderOpen,
  Settings,
  Database,
  Globe,
  Palette,
  Terminal,
  Package,
  GitBranch,
  Lock,
  Key,
  FileJson,
  FileSpreadsheet,
  FilePdf,
  FileMusic,
  Code,
  Braces,
  Hash,
  Layers,
  Box,
  Coffee,
  Zap,
  Cpu,
  Smartphone,
  Monitor,
  Cloud,
  Server,
  HardDrive,
  FileX,
  FileCheck,
  FileWarning,
  Cog,
  Wrench,
  Puzzle,
  Shield,
  Eye,
  Image,
  Play,
  Music,
  Archive,
  BookOpen,
  FileType,
  Brackets,
  Binary,
  Workflow
} from 'lucide-react';

/**
 * Comprehensive file type to icon mapping
 * Maps file extensions and special filenames to appropriate Lucide React icons
 */
export const fileTypeIcons = {
  // Programming Languages
  'js': Code,
  'jsx': Code,
  'ts': Code,
  'tsx': Code,
  'py': Code,
  'java': Coffee,
  'cpp': Cpu,
  'c': Cpu,
  'cs': Hash,
  'php': Code,
  'rb': Code,
  'go': Box,
  'rs': Cpu,
  'swift': Smartphone,
  'kt': Smartphone,
  'dart': Code,
  'scala': Code,
  'clj': Code,
  'hs': Code,
  'ml': Code,
  'r': Code,
  'matlab': Code,
  'lua': Code,
  'perl': Code,
  'sh': Terminal,
  'bash': Terminal,
  'zsh': Terminal,
  'fish': Terminal,
  'ps1': Terminal,
  'bat': Terminal,
  'cmd': Terminal,
  
  // Web Technologies
  'html': Globe,
  'htm': Globe,
  'css': Palette,
  'scss': Palette,
  'sass': Palette,
  'less': Palette,
  'stylus': Palette,
  'vue': Code,
  'svelte': Code,
  'astro': Code,
  'angular': Code,
  'react': Code,
  
  // Configuration Files
  'json': FileJson,
  'yaml': Settings,
  'yml': Settings,
  'toml': Settings,
  'ini': Settings,
  'cfg': Settings,
  'conf': Settings,
  'config': Settings,
  'env': Settings,
  'dockerfile': Box,
  'docker-compose': Layers,
  'makefile': Cog,
  'cmake': Cog,
  'gradle': Cog,
  'maven': Cog,
  
  // Package Files
  'package.json': Package,
  'package-lock.json': Lock,
  'yarn.lock': Lock,
  'pnpm-lock.yaml': Lock,
  'composer.json': Package,
  'composer.lock': Lock,
  'requirements.txt': FileText,
  'pipfile': Package,
  'gemfile': Package,
  'gemfile.lock': Lock,
  'cargo.toml': Package,
  'cargo.lock': Lock,
  'go.mod': Package,
  'go.sum': Lock,
  'pom.xml': Package,
  'build.gradle': Package,
  'build.gradle.kts': Package,
  'setup.py': Package,
  'pyproject.toml': Package,
  
  // Documentation
  'md': FileText,
  'mdx': FileText,
  'txt': FileText,
  'rtf': FileText,
  'doc': FileText,
  'docx': FileText,
  'pdf': FilePdf,
  'readme': FileText,
  'readme.md': FileText,
  'readme.txt': FileText,
  'license': Key,
  'license.md': Key,
  'license.txt': Key,
  'changelog': FileText,
  'changelog.md': FileText,
  'history': FileText,
  'authors': FileText,
  'contributors': FileText,
  'copying': Key,
  'notice': FileText,
  
  // Data Files
  'csv': FileSpreadsheet,
  'tsv': FileSpreadsheet,
  'xlsx': FileSpreadsheet,
  'xls': FileSpreadsheet,
  'ods': FileSpreadsheet,
  'sql': Database,
  'db': Database,
  'sqlite': Database,
  'sqlite3': Database,
  'mysql': Database,
  'postgres': Database,
  'mongodb': Database,
  'xml': FileCode,
  'xsd': FileCode,
  'xsl': FileCode,
  'xslt': FileCode,
  'rss': Globe,
  'atom': Globe,
  
  // Media Files
  'png': FileImage,
  'jpg': FileImage,
  'jpeg': FileImage,
  'gif': FileImage,
  'svg': FileImage,
  'webp': FileImage,
  'ico': FileImage,
  'bmp': FileImage,
  'tiff': FileImage,
  'tif': FileImage,
  'psd': FileImage,
  'ai': FileImage,
  'sketch': FileImage,
  'fig': FileImage,
  'figma': FileImage,
  'mp4': FileVideo,
  'avi': FileVideo,
  'mov': FileVideo,
  'wmv': FileVideo,
  'flv': FileVideo,
  'webm': FileVideo,
  'mkv': FileVideo,
  'ogv': FileVideo,
  'mp3': FileMusic,
  'wav': FileMusic,
  'flac': FileMusic,
  'aac': FileMusic,
  'ogg': FileMusic,
  'wma': FileMusic,
  'm4a': FileMusic,
  
  // Archive Files
  'zip': FileArchive,
  'rar': FileArchive,
  'tar': FileArchive,
  'gz': FileArchive,
  'bz2': FileArchive,
  'xz': FileArchive,
  '7z': FileArchive,
  'dmg': FileArchive,
  'iso': FileArchive,
  'deb': Package,
  'rpm': Package,
  'msi': Package,
  'exe': Binary,
  'app': Binary,
  
  // Special Files and Directories
  'gitignore': GitBranch,
  '.gitignore': GitBranch,
  'gitattributes': GitBranch,
  '.gitattributes': GitBranch,
  'gitmodules': GitBranch,
  '.gitmodules': GitBranch,
  'editorconfig': Settings,
  '.editorconfig': Settings,
  'eslintrc': Settings,
  '.eslintrc': Settings,
  '.eslintrc.js': Settings,
  '.eslintrc.json': Settings,
  '.eslintrc.yml': Settings,
  'prettierrc': Settings,
  '.prettierrc': Settings,
  '.prettierrc.js': Settings,
  '.prettierrc.json': Settings,
  'babelrc': Settings,
  '.babelrc': Settings,
  '.babelrc.js': Settings,
  '.babelrc.json': Settings,
  'webpack.config.js': Settings,
  'webpack.config.ts': Settings,
  'vite.config.js': Zap,
  'vite.config.ts': Zap,
  'rollup.config.js': Settings,
  'rollup.config.ts': Settings,
  'tsconfig.json': Settings,
  'jsconfig.json': Settings,
  'tslint.json': Settings,
  'stylelint.config.js': Settings,
  'postcss.config.js': Settings,
  'tailwind.config.js': Settings,
  'next.config.js': Settings,
  'nuxt.config.js': Settings,
  'gatsby.config.js': Settings,
  'svelte.config.js': Settings,
  'jest.config.js': Settings,
  'vitest.config.js': Settings,
  'cypress.config.js': Settings,
  'playwright.config.js': Settings,
  
  // IDE and Editor Files
  'vscode': Settings,
  '.vscode': Settings,
  'idea': Settings,
  '.idea': Settings,
  'sublime-project': Settings,
  'sublime-workspace': Settings,
  
  // Cloud and Infrastructure
  'terraform': Cloud,
  'tf': Cloud,
  'tfvars': Cloud,
  'ansible': Server,
  'playbook': Server,
  'kubernetes': Server,
  'k8s': Server,
  'helm': Server,
  'docker': Box,
  'vagrant': Box,
  'serverless': Cloud,
  
  // Folders (special handling)
  'folder': Folder,
  'folder-open': FolderOpen,
  'node_modules': Package,
  'dist': Box,
  'build': Box,
  'out': Box,
  'target': Box,
  'bin': Binary,
  'lib': Package,
  'libs': Package,
  'vendor': Package,
  'vendors': Package,
  'public': Globe,
  'static': Globe,
  'assets': FileImage,
  'images': FileImage,
  'img': FileImage,
  'icons': FileImage,
  'fonts': FileType,
  'styles': Palette,
  'src': Code,
  'source': Code,
  'sources': Code,
  'components': Layers,
  'pages': Globe,
  'views': Globe,
  'templates': Globe,
  'layouts': Globe,
  'api': Server,
  'server': Server,
  'backend': Server,
  'frontend': Monitor,
  'client': Monitor,
  'utils': Wrench,
  'utilities': Wrench,
  'helpers': Wrench,
  'services': Cog,
  'middleware': Layers,
  'plugins': Puzzle,
  'extensions': Puzzle,
  'addons': Puzzle,
  'modules': Package,
  'packages': Package,
  'tests': FileCheck,
  'test': FileCheck,
  'spec': FileCheck,
  'specs': FileCheck,
  '__tests__': FileCheck,
  'e2e': FileCheck,
  'integration': FileCheck,
  'unit': FileCheck,
  'docs': BookOpen,
  'documentation': BookOpen,
  'examples': BookOpen,
  'samples': BookOpen,
  'demo': Play,
  'demos': Play,
  'configuration': Settings,
  'configs': Settings,
  'settings': Settings,
  'environments': Settings,
  'scripts': Terminal,
  'tools': Wrench,
  'tooling': Wrench,
  'ci': Workflow,
  'cd': Workflow,
  'workflows': Workflow,
  'actions': Workflow,
  'pipelines': Workflow,
  'deployment': Cloud,
  'deploy': Cloud,
  'infrastructure': Server,
  'infra': Server,
  'security': Shield,
  'auth': Shield,
  'authentication': Shield,
  'authorization': Shield,
  'logs': FileText,
  'log': FileText,
  'temp': FileX,
  'tmp': FileX,
  'cache': HardDrive,
  'backup': Archive,
  'backups': Archive,
  
  // Default fallback
  'default': FileText
};

/**
 * Helper function to get icon component by file extension or filename
 * @param {string} filename - The filename or path
 * @returns {React.Component} - The appropriate Lucide React icon component
 */
export const getFileTypeIcon = (filename) => {
  if (!filename || typeof filename !== 'string') {
    return fileTypeIcons.default;
  }
  
  // Normalize filename - remove path and convert to lowercase
  const normalizedName = filename.split('/').pop().split('\\').pop().toLowerCase();
  
  // Check for exact filename matches first (e.g., package.json, .gitignore)
  if (fileTypeIcons[normalizedName]) {
    return fileTypeIcons[normalizedName];
  }
  
  // Check for filename without leading dot (e.g., gitignore for .gitignore)
  const nameWithoutDot = normalizedName.startsWith('.') ? normalizedName.slice(1) : normalizedName;
  if (fileTypeIcons[nameWithoutDot]) {
    return fileTypeIcons[nameWithoutDot];
  }
  
  // Extract and check file extension
  const parts = normalizedName.split('.');
  if (parts.length > 1) {
    const extension = parts.pop();
    if (fileTypeIcons[extension]) {
      return fileTypeIcons[extension];
    }
    
    // Check for compound extensions (e.g., .config.js, .test.js)
    if (parts.length > 1) {
      const compoundExt = parts.slice(-1)[0] + '.' + extension;
      if (fileTypeIcons[compoundExt]) {
        return fileTypeIcons[compoundExt];
      }
    }
  }
  
  // Check for directory names (when no extension)
  if (!normalizedName.includes('.')) {
    if (fileTypeIcons[normalizedName]) {
      return fileTypeIcons[normalizedName];
    }
  }
  
  return fileTypeIcons.default;
};

/**
 * Helper function to get icon name string by file extension or filename
 * @param {string} filename - The filename or path
 * @returns {string} - The icon name for use with the Icon component
 */
export const getFileTypeIconName = (filename) => {
  const IconComponent = getFileTypeIcon(filename);
  
  // Find the component name in Lucide icons
  const lucideIconName = Object.entries({
    FileText, FileCode, FileImage, FileVideo, FileArchive, Folder, FolderOpen,
    Settings, Database, Globe, Palette, Terminal, Package, GitBranch, Lock, Key,
    FileJson, FileSpreadsheet, FilePdf, FileMusic, Code, Braces, Hash, Layers,
    Box, Coffee, Zap, Cpu, Smartphone, Monitor, Cloud, Server, HardDrive,
    FileX, FileCheck, FileWarning, Cog, Wrench, Puzzle, Shield, Eye, Image,
    Play, Music, Archive, BookOpen, FileType, Brackets, Binary, Workflow
  }).find(([, component]) => component === IconComponent);
  
  return lucideIconName ? lucideIconName[0] : 'FileText';
};

/**
 * Helper function to determine if a path represents a directory
 * @param {string} path - The file path
 * @param {boolean} isDirectory - Whether the path is explicitly a directory
 * @returns {React.Component} - The appropriate folder icon component
 */
export const getFolderIcon = (path, isDirectory = false, isOpen = false) => {
  if (!isDirectory) {
    return null;
  }
  
  if (isOpen) {
    return fileTypeIcons['folder-open'];
  }
  
  // Check for special directory names
  const dirName = path.split('/').pop().split('\\').pop().toLowerCase();
  return fileTypeIcons[dirName] || fileTypeIcons.folder;
};

/**
 * Get appropriate color for file type icons based on extension
 * @param {string} filename - The filename
 * @returns {string} - CSS color value
 */
export const getFileTypeColor = (filename) => {
  if (!filename) return 'var(--text-secondary)';
  
  const extension = filename.split('.').pop()?.toLowerCase();
  
  const colorMap = {
    // Programming languages
    'js': '#f7df1e',
    'jsx': '#61dafb',
    'ts': '#3178c6',
    'tsx': '#3178c6',
    'py': '#3776ab',
    'java': '#ed8b00',
    'cpp': '#00599c',
    'c': '#a8b9cc',
    'cs': '#239120',
    'php': '#777bb4',
    'rb': '#cc342d',
    'go': '#00add8',
    'rs': '#dea584',
    'swift': '#fa7343',
    'kt': '#7f52ff',
    
    // Web technologies
    'html': '#e34f26',
    'css': '#1572b6',
    'scss': '#cf649a',
    'sass': '#cf649a',
    'less': '#1d365d',
    'vue': '#4fc08d',
    'svelte': '#ff3e00',
    
    // Data formats
    'json': '#000000',
    'xml': '#0060ac',
    'yaml': '#cb171e',
    'yml': '#cb171e',
    
    // Media files
    'png': '#4caf50',
    'jpg': '#4caf50',
    'jpeg': '#4caf50',
    'gif': '#4caf50',
    'svg': '#ff9800',
    'mp4': '#2196f3',
    'mp3': '#9c27b0',
    
    // Archives
    'zip': '#795548',
    'rar': '#795548',
    'tar': '#795548',
    'gz': '#795548',
    
    // Default colors by category
    'folder': 'var(--color-primary)',
    'text': 'var(--text-secondary)',
    'code': 'var(--color-info)',
    'config': 'var(--color-warning)',
    'media': 'var(--color-success)',
    'archive': 'var(--text-muted)'
  };
  
  return colorMap[extension] || 'var(--text-secondary)';
};

export default fileTypeIcons;