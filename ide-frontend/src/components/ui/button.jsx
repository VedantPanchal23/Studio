import { forwardRef, cloneElement, isValidElement } from 'react';
import styles from './Button.module.css';

export const Button = forwardRef(({ 
  className = '', 
  variant = 'default',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  iconOnly = false,
  children,
  ...props 
}, ref) => {
  // Build CSS classes
  const buttonClasses = [
    styles.button,
    styles[variant],
    styles[size],
    loading && styles.loading,
    fullWidth && styles.fullWidth,
    iconOnly && styles.iconOnly,
    className
  ].filter(Boolean).join(' ');

  // Process children to add icon class
  const processedChildren = Array.isArray(children) 
    ? children.map((child, index) => {
        if (isValidElement(child) && child.type?.displayName === 'Icon') {
          return cloneElement(child, { 
            key: index,
            className: `${child.props.className || ''} ${styles.icon}`.trim()
          });
        }
        return child;
      })
    : isValidElement(children) && children.type?.displayName === 'Icon'
      ? cloneElement(children, { 
          className: `${children.props.className || ''} ${styles.icon}`.trim()
        })
      : children;

  return (
    <button
      className={buttonClasses}
      disabled={disabled || loading}
      ref={ref}
      {...props}
    >
      {processedChildren}
    </button>
  );
});

Button.displayName = 'Button';

// Export variant and size options for external use
export const buttonVariants = {
  default: 'default',
  secondary: 'secondary', 
  outline: 'outline',
  ghost: 'ghost',
  destructive: 'destructive',
  success: 'success',
  warning: 'warning'
};

export const buttonSizes = {
  small: 'small',
  medium: 'medium',
  large: 'large'
};