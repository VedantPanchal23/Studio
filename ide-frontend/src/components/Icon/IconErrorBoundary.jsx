import { Component } from 'react';
import { HelpCircle } from 'lucide-react';

/**
 * Error boundary component for Icon components
 * Catches JavaScript errors in icon rendering and displays a fallback UI
 */
class IconErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error for debugging
    console.error('Icon Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI when an error occurs
      const { size = 16, className = '', color = 'var(--color-warning)' } = this.props;
      
      return (
        <HelpCircle 
          size={size}
          color={color}
          className={className}
          aria-label="Icon failed to load"
          data-testid="icon-error-fallback"
        />
      );
    }

    return this.props.children;
  }
}

export default IconErrorBoundary;