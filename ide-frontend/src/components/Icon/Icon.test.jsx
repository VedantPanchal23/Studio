import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Icon from './Icon';
import IconErrorBoundary from './IconErrorBoundary';

describe('Icon Component', () => {
  it('renders a valid Lucide icon', () => {
    render(<Icon name="Home" />);
    const icon = screen.getByTestId('icon-Home');
    expect(icon).toBeInTheDocument();
    expect(icon.tagName).toBe('svg');
  });

  it('renders fallback icon for invalid icon name', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<Icon name="NonExistentIcon" />);
    
    const icon = screen.getByTestId('icon-fallback-NonExistentIcon');
    expect(icon).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Icon "NonExistentIcon" not found in Lucide React. Using fallback icon "HelpCircle".'
    );
    
    consoleSpy.mockRestore();
  });

  it('applies custom size and className', () => {
    render(<Icon name="Settings" size={24} className="custom-class" />);
    const icon = screen.getByTestId('icon-Settings');
    
    expect(icon).toHaveAttribute('width', '24');
    expect(icon).toHaveAttribute('height', '24');
    expect(icon).toHaveClass('custom-class');
  });

  it('validates and corrects invalid size prop', () => {
    render(<Icon name="Home" size={-5} />);
    const icon = screen.getByTestId('icon-Home');
    
    expect(icon).toHaveAttribute('width', '16'); // Should default to 16
    expect(icon).toHaveAttribute('height', '16');
  });

  it('validates and corrects invalid strokeWidth prop', () => {
    render(<Icon name="Home" strokeWidth={-2} />);
    const icon = screen.getByTestId('icon-Home');
    
    expect(icon).toHaveAttribute('stroke-width', '2'); // Should default to 2
  });

  it('applies custom color', () => {
    render(<Icon name="Home" color="#ff0000" />);
    const icon = screen.getByTestId('icon-Home');
    
    // Check that the SVG has stroke set to the color
    expect(icon).toHaveAttribute('stroke', '#ff0000');
  });

  it('supports accessibility attributes', () => {
    render(<Icon name="Home" aria-label="Home icon" aria-hidden="false" />);
    const icon = screen.getByTestId('icon-Home');
    
    expect(icon).toHaveAttribute('aria-label', 'Home icon');
    expect(icon).toHaveAttribute('aria-hidden', 'false');
  });

  it('applies fallback styling for missing icons', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<Icon name="NonExistentIcon" />);
    
    const icon = screen.getByTestId('icon-fallback-NonExistentIcon');
    // Check for CSS Modules generated class name pattern
    expect(icon).toHaveAttribute('class');
    expect(icon.getAttribute('class')).toMatch(/fallback/);
    
    consoleSpy.mockRestore();
  });

  it('supports custom fallback configuration', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const customFallback = { name: 'AlertCircle', color: '#ff0000' };
    
    render(<Icon name="NonExistentIcon" fallback={customFallback} />);
    
    const icon = screen.getByTestId('icon-fallback-NonExistentIcon');
    expect(icon).toHaveAttribute('stroke', '#ff0000');
    
    consoleSpy.mockRestore();
  });
});

describe('IconErrorBoundary Component', () => {
  it('renders children when no error occurs', () => {
    render(
      <IconErrorBoundary>
        <div data-testid="child-content">Test content</div>
      </IconErrorBoundary>
    );
    
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('renders fallback UI when error occurs', () => {
    // Mock console.error to avoid noise in test output
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const ThrowError = () => {
      throw new Error('Test error');
    };
    
    render(
      <IconErrorBoundary size={20} className="error-icon">
        <ThrowError />
      </IconErrorBoundary>
    );
    
    const fallbackIcon = screen.getByTestId('icon-error-fallback');
    expect(fallbackIcon).toBeInTheDocument();
    expect(fallbackIcon).toHaveAttribute('width', '20');
    expect(fallbackIcon).toHaveClass('error-icon');
    
    consoleErrorSpy.mockRestore();
  });
});