import { forwardRef } from 'react';
import { getFileTypeIcon, getFileTypeIconName, getFileTypeColor, getFolderIcon } from './fileTypeIcons';
import { useIconContext } from './IconProvider';
import Icon from './Icon';
import styles from './Icon.module.css';

/**
 * FileTypeIcon component that automatically selects the appropriate icon based on file type
 * 
 * @param {Object} props - Component props
 * @param {string} props.filename - The filename or path
 * @param {boolean} [props.isDirectory=false] - Whether this represents a directory
 * @param {boolean} [props.isOpen=false] - Whether directory is open (for folder icons)
 * @param {number} [props.size=16] - Size of the icon in pixels
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {boolean} [props.useColor=true] - Whether to use file type specific colors
 * @param {string} [props.color] - Override color for the icon
 * @param {Object} [props.fallback] - Custom fallback configuration
 */
const FileTypeIcon = forwardRef(({ 
  filename,
  isDirectory = false,
  isOpen = false,
  size,
  className = '',
  useColor,
  color,
  fallback,
  ...props 
}, ref) => {
  // Get context configuration
  const context = useIconContext();
  
  // Use context defaults if props not provided
  const effectiveSize = size || context.size;
  const effectiveUseColor = useColor !== undefined ? useColor : context.useFileTypeColors;
  // Handle directory icons
  if (isDirectory) {
    const FolderIconComponent = getFolderIcon(filename, isDirectory, isOpen);
    if (FolderIconComponent) {
      const iconName = isOpen ? 'FolderOpen' : 'Folder';
      const iconColor = color || (effectiveUseColor ? 'var(--color-primary)' : 'currentColor');
      
      return (
        <Icon
          ref={ref}
          name={iconName}
          size={effectiveSize}
          color={iconColor}
          className={`${styles.fileTypeIcon} ${className}`}
          fallback={fallback || context.fallback}
          aria-label={`${isOpen ? 'Open' : 'Closed'} folder: ${filename}`}
          data-testid={`file-icon-${filename}-${isDirectory ? 'directory' : 'file'}`}
          {...props}
        />
      );
    }
  }
  
  // Handle file icons
  const iconName = getFileTypeIconName(filename);
  const iconColor = color || (effectiveUseColor ? getFileTypeColor(filename) : 'currentColor');
  
  return (
    <Icon
      ref={ref}
      name={iconName}
      size={effectiveSize}
      color={iconColor}
      className={`${styles.fileTypeIcon} ${className}`}
      fallback={fallback || context.fallback}
      aria-label={`File: ${filename}`}
      data-testid={`file-icon-${filename}-${isDirectory ? 'directory' : 'file'}`}
      {...props}
    />
  );
});

FileTypeIcon.displayName = 'FileTypeIcon';

export default FileTypeIcon;