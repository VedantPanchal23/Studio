import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '../button';
import Icon from '../../Icon/Icon';
import styles from '../Button.module.css';

// Mock the Icon component
vi.mock('../../Icon/Icon', () => {
  const MockIcon = ({ name, className, ...props }) => (
    <svg 
      data-testid={`icon-${name}`} 
      className={className}
      {...props}
    >
      <title>{name}</title>
    </svg>
  );
  MockIcon.displayName = 'Icon';
  
  return {
    default: MockIcon
  };
});

describe('Button Component', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass(styles.button, styles.default, styles.medium);
  });

  it('applies variant classes correctly', () => {
    const { rerender } = render(<Button variant="secondary">Test</Button>);
    expect(screen.getByRole('button')).toHaveClass(styles.secondary);

    rerender(<Button variant="outline">Test</Button>);
    expect(screen.getByRole('button')).toHaveClass(styles.outline);

    rerender(<Button variant="ghost">Test</Button>);
    expect(screen.getByRole('button')).toHaveClass(styles.ghost);

    rerender(<Button variant="destructive">Test</Button>);
    expect(screen.getByRole('button')).toHaveClass(styles.destructive);

    rerender(<Button variant="success">Test</Button>);
    expect(screen.getByRole('button')).toHaveClass(styles.success);

    rerender(<Button variant="warning">Test</Button>);
    expect(screen.getByRole('button')).toHaveClass(styles.warning);
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<Button size="small">Test</Button>);
    expect(screen.getByRole('button')).toHaveClass(styles.small);

    rerender(<Button size="medium">Test</Button>);
    expect(screen.getByRole('button')).toHaveClass(styles.medium);

    rerender(<Button size="large">Test</Button>);
    expect(screen.getByRole('button')).toHaveClass(styles.large);
  });

  it('handles disabled state correctly', () => {
    render(<Button disabled>Disabled</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('handles loading state correctly', () => {
    render(<Button loading>Loading</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass(styles.loading);
  });

  it('applies fullWidth class when prop is true', () => {
    render(<Button fullWidth>Full Width</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass(styles.fullWidth);
  });

  it('applies iconOnly class when prop is true', () => {
    render(<Button iconOnly><Icon name="Home" /></Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass(styles.iconOnly);
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Test</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not trigger click when disabled', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick} disabled>Disabled</Button>);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('does not trigger click when loading', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick} loading>Loading</Button>);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders with Icon component and applies icon class', () => {
    render(
      <Button>
        <Icon name="Home" />
        Home
      </Button>
    );
    
    const icon = screen.getByTestId('icon-Home');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass(styles.icon);
  });

  it('renders multiple icons with proper classes', () => {
    render(
      <Button>
        <Icon name="Home" />
        <Icon name="Settings" />
        Button Text
      </Button>
    );
    
    const homeIcon = screen.getByTestId('icon-Home');
    const settingsIcon = screen.getByTestId('icon-Settings');
    
    expect(homeIcon).toHaveClass(styles.icon);
    expect(settingsIcon).toHaveClass(styles.icon);
  });

  it('forwards ref correctly', () => {
    const ref = vi.fn();
    render(<Button ref={ref}>Test</Button>);
    
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLButtonElement));
  });

  it('passes through additional props', () => {
    render(<Button data-testid="custom-button" type="submit">Test</Button>);
    
    const button = screen.getByTestId('custom-button');
    expect(button).toHaveAttribute('type', 'submit');
  });

  describe('CSS Module Classes', () => {
    it('applies base button class', () => {
      render(<Button>Test</Button>);
      expect(screen.getByRole('button')).toHaveClass(styles.button);
    });

    it('combines multiple classes correctly', () => {
      render(
        <Button 
          variant="outline" 
          size="large" 
          fullWidth 
          className="custom"
        >
          Test
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass(styles.button, styles.outline, styles.large, styles.fullWidth, 'custom');
    });

    it('filters out falsy classes', () => {
      render(<Button loading={false} fullWidth={false}>Test</Button>);
      
      const button = screen.getByRole('button');
      expect(button).not.toHaveClass(styles.loading, styles.fullWidth);
    });
  });

  describe('Accessibility', () => {
    it('maintains button semantics', () => {
      render(<Button>Accessible Button</Button>);
      
      const button = screen.getByRole('button', { name: /accessible button/i });
      expect(button).toBeInTheDocument();
    });

    it('supports aria attributes', () => {
      render(
        <Button aria-label="Custom label" aria-describedby="description">
          Button
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Custom label');
      expect(button).toHaveAttribute('aria-describedby', 'description');
    });
  });
});