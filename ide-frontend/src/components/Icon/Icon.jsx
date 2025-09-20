import { forwardRef } from 'react';
import * as LucideIcons from 'lucide-react';
import IconErrorBoundary from './IconErrorBoundary';
import { useIconProps } from './IconProvider';
import styles from './Icon.module.css';

/**
 * Icon component using Lucide React
 * Provides a consistent interface for all icons in the application
 * 
 * @param {Object} props - Component props
 * @param {string} props.name - Name of the Lucide icon
 * @param {number} [props.size=16] - Size of the icon in pixels
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {number} [props.strokeWidth=2] - Stroke width of the icon
 * @param {string} [props.color='currentColor'] - Color of the icon
 * @param {string} [props.fileType] - File type for file-specific icons
 * @param {Object} [props.fallback] - Custom fallback icon configuration
 * @param {boolean} [props.aria-hidden] - Hide from screen readers
 * @param {string} [props.aria-label] - Accessible label for the icon
 */
/**
 * Core Icon component without error boundary
 */
const BaseIcon = forwardRef((initialProps, ref) => {
  // Merge props with context defaults
  const {
    name, 
    size,
    className = '', 
    strokeWidth,
    color,
    fileType,
    fallback,
    'aria-hidden': ariaHidden,
    'aria-label': ariaLabel,
    _colors,
    _sizes,
    ...props 
  } = useIconProps(initialProps);
  
  // Validate size prop
  const validSize = typeof size === 'number' && size > 0 ? size : 16;
  
  // Validate strokeWidth prop
  const validStrokeWidth = typeof strokeWidth === 'number' && strokeWidth > 0 ? strokeWidth : 2;
  
  // Get the icon component from Lucide
  const LucideIcon = LucideIcons[name];
  
  // Fallback handling with error boundary-like behavior
  if (!LucideIcon) {
    console.warn(`Icon "${name}" not found in Lucide React. Using fallback icon "${fallback.name}".`);
    
    const FallbackIcon = LucideIcons[fallback.name] || LucideIcons.HelpCircle;
    
    return (
      <FallbackIcon 
        ref={ref}
        size={validSize}
        strokeWidth={validStrokeWidth}
        color={fallback.color || color}
        className={`${styles.icon} ${styles.fallback} ${className}`}
        aria-hidden={ariaHidden}
        aria-label={ariaLabel || `Fallback icon for ${name}`}
        data-testid={`icon-fallback-${name}`}
        {...props}
      />
    );
  }
  
  return (
    <LucideIcon 
      ref={ref}
      size={validSize}
      strokeWidth={validStrokeWidth}
      color={color}
      className={`${styles.icon} ${className}`}
      aria-hidden={ariaHidden}
      aria-label={ariaLabel}
      data-testid={`icon-${name}`}
      {...props}
    />
  );
});

BaseIcon.displayName = 'BaseIcon';

/**
 * Icon component with error boundary protection
 */
const Icon = forwardRef((props, ref) => {
  return (
    <IconErrorBoundary size={props.size} className={props.className} color={props.color}>
      <BaseIcon ref={ref} {...props} />
    </IconErrorBoundary>
  );
});

Icon.displayName = 'Icon';

export default Icon;