import { createContext, useContext, useMemo } from 'react';

/**
 * Default icon configuration
 */
const defaultIconConfig = {
  size: 16,
  strokeWidth: 2,
  color: 'currentColor',
  useFileTypeColors: true,
  theme: 'auto', // 'light' | 'dark' | 'auto'
  fallback: {
    name: 'HelpCircle',
    color: 'var(--color-warning)'
  },
  accessibility: {
    includeLabels: true,
    hideDecorative: true
  }
};

/**
 * Icon context for providing default icon configuration
 */
const IconContext = createContext(defaultIconConfig);

/**
 * IconProvider component that provides default icon configuration to all child components
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {number} [props.defaultSize=16] - Default size for all icons
 * @param {number} [props.defaultStrokeWidth=2] - Default stroke width for all icons
 * @param {string} [props.defaultColor='currentColor'] - Default color for all icons
 * @param {boolean} [props.useFileTypeColors=true] - Whether to use file type specific colors
 * @param {string} [props.theme='auto'] - Theme preference: 'light', 'dark', or 'auto'
 * @param {Object} [props.fallback] - Default fallback configuration
 * @param {Object} [props.accessibility] - Accessibility configuration
 * @param {boolean} [props.accessibility.includeLabels=true] - Whether to include aria-labels
 * @param {boolean} [props.accessibility.hideDecorative=true] - Whether to hide decorative icons from screen readers
 */
export const IconProvider = ({ 
  children, 
  defaultSize = 16,
  defaultStrokeWidth = 2,
  defaultColor = 'currentColor',
  useFileTypeColors = true,
  theme = 'auto',
  fallback = defaultIconConfig.fallback,
  accessibility = defaultIconConfig.accessibility,
  ...customConfig
}) => {
  const contextValue = useMemo(() => ({
    size: defaultSize,
    strokeWidth: defaultStrokeWidth,
    color: defaultColor,
    useFileTypeColors,
    theme,
    fallback: {
      ...defaultIconConfig.fallback,
      ...fallback
    },
    accessibility: {
      ...defaultIconConfig.accessibility,
      ...accessibility
    },
    ...customConfig
  }), [
    defaultSize,
    defaultStrokeWidth,
    defaultColor,
    useFileTypeColors,
    theme,
    fallback,
    accessibility,
    customConfig
  ]);

  return (
    <IconContext.Provider value={contextValue}>
      {children}
    </IconContext.Provider>
  );
};

/**
 * Hook to access icon context configuration
 * @returns {Object} Icon configuration from context
 */
export const useIconContext = () => {
  const context = useContext(IconContext);
  
  if (!context) {
    console.warn('useIconContext must be used within an IconProvider. Using default configuration.');
    return defaultIconConfig;
  }
  
  return context;
};

/**
 * Hook to get theme-aware icon colors
 * @param {string} [baseColor] - Base color to use
 * @returns {Object} Theme-aware color configuration
 */
export const useIconColors = (baseColor) => {
  const { theme, color: defaultColor } = useIconContext();
  
  return useMemo(() => {
    const effectiveColor = baseColor || defaultColor;
    
    // Theme-aware color variations
    const colors = {
      primary: 'var(--color-primary)',
      secondary: 'var(--color-secondary)',
      success: 'var(--color-success)',
      danger: 'var(--color-danger)',
      warning: 'var(--color-warning)',
      info: 'var(--color-info)',
      muted: 'var(--text-muted)',
      text: 'var(--text-primary)',
      textSecondary: 'var(--text-secondary)',
      background: 'var(--bg-primary)',
      border: 'var(--border-primary)',
      current: effectiveColor
    };
    
    // Add theme-specific variations if needed
    if (theme === 'dark') {
      colors.accent = 'var(--bg-accent)';
      colors.highlight = '#ffffff';
    } else if (theme === 'light') {
      colors.accent = 'var(--bg-secondary)';
      colors.highlight = '#000000';
    } else {
      // Auto theme - use CSS custom properties that adapt
      colors.accent = 'var(--bg-accent)';
      colors.highlight = 'var(--text-primary)';
    }
    
    return colors;
  }, [baseColor, defaultColor, theme]);
};

/**
 * Hook to get icon size variants based on context
 * @param {number} [baseSize] - Base size to use
 * @returns {Object} Size variants
 */
export const useIconSizes = (baseSize) => {
  const { size: defaultSize } = useIconContext();
  
  return useMemo(() => {
    const effectiveSize = baseSize || defaultSize;
    
    return {
      xs: Math.max(effectiveSize * 0.75, 12),
      sm: Math.max(effectiveSize * 0.875, 14),
      base: effectiveSize,
      lg: effectiveSize * 1.25,
      xl: effectiveSize * 1.5,
      '2xl': effectiveSize * 2
    };
  }, [baseSize, defaultSize]);
};

/**
 * Hook to merge icon props with context defaults
 * @param {Object} props - Icon props to merge
 * @returns {Object} Merged props with context defaults
 */
export const useIconProps = (props = {}) => {
  const context = useIconContext();
  const colors = useIconColors(props.color);
  const sizes = useIconSizes(props.size);
  
  return useMemo(() => {
    const mergedProps = {
      size: props.size || context.size,
      strokeWidth: props.strokeWidth || context.strokeWidth,
      color: props.color || context.color,
      fallback: {
        ...context.fallback,
        ...props.fallback
      },
      ...props
    };
    
    // Add accessibility props if enabled
    if (context.accessibility.includeLabels && !props['aria-label'] && !props['aria-hidden']) {
      if (context.accessibility.hideDecorative && !props.name) {
        mergedProps['aria-hidden'] = true;
      }
    }
    
    // Add theme-aware colors
    mergedProps._colors = colors;
    mergedProps._sizes = sizes;
    
    return mergedProps;
  }, [props, context, colors, sizes]);
};

/**
 * Higher-order component to wrap components with IconProvider
 * @param {React.Component} Component - Component to wrap
 * @param {Object} [defaultConfig] - Default icon configuration
 * @returns {React.Component} Wrapped component
 */
export const withIconProvider = (Component, defaultConfig = {}) => {
  const WrappedComponent = (props) => (
    <IconProvider {...defaultConfig}>
      <Component {...props} />
    </IconProvider>
  );
  
  WrappedComponent.displayName = `withIconProvider(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

export default IconProvider;