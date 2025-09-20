import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Input } from '../input';
import styles from '../Input.module.css';

describe('Input Component', () => {
  it('renders with default props', () => {
    render(<Input placeholder="Enter text" />);
    
    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass(styles.input);
    expect(input).toHaveAttribute('type', 'text');
  });

  it('renders with label when provided', () => {
    render(<Input label="Username" placeholder="Enter username" />);
    
    const label = screen.getByText('Username');
    const input = screen.getByPlaceholderText('Enter username');
    
    expect(label).toBeInTheDocument();
    expect(label).toHaveClass(styles.label);
    expect(input).toBeInTheDocument();
  });

  it('displays error message when error prop is provided', () => {
    const errorMessage = 'This field is required';
    render(<Input error={errorMessage} />);
    
    const input = screen.getByRole('textbox');
    const error = screen.getByText(errorMessage);
    
    expect(input).toHaveClass(styles.inputError);
    expect(error).toBeInTheDocument();
    expect(error).toHaveClass(styles.errorMessage);
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<Input size="small" />);
    expect(screen.getByRole('textbox')).toHaveClass(styles.inputSmall);

    rerender(<Input size="default" />);
    expect(screen.getByRole('textbox')).not.toHaveClass(styles.inputSmall, styles.inputLarge);

    rerender(<Input size="large" />);
    expect(screen.getByRole('textbox')).toHaveClass(styles.inputLarge);
  });

  it('handles different input types', () => {
    const { rerender } = render(<Input type="email" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');

    rerender(<Input type="password" />);
    expect(screen.getByDisplayValue('')).toHaveAttribute('type', 'password');

    rerender(<Input type="number" />);
    expect(screen.getByRole('spinbutton')).toHaveAttribute('type', 'number');
  });

  it('handles disabled state correctly', () => {
    render(<Input disabled placeholder="Disabled input" />);
    
    const input = screen.getByPlaceholderText('Disabled input');
    expect(input).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<Input className="custom-input" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-input');
  });

  it('handles value changes', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test value' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue('test value');
  });

  it('handles focus and blur events', () => {
    const handleFocus = vi.fn();
    const handleBlur = vi.fn();
    render(<Input onFocus={handleFocus} onBlur={handleBlur} />);
    
    const input = screen.getByRole('textbox');
    
    fireEvent.focus(input);
    expect(handleFocus).toHaveBeenCalledTimes(1);
    
    fireEvent.blur(input);
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });

  it('forwards ref correctly', () => {
    const ref = vi.fn();
    render(<Input ref={ref} />);
    
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLInputElement));
  });

  it('passes through additional props', () => {
    render(<Input data-testid="custom-input" maxLength={10} />);
    
    const input = screen.getByTestId('custom-input');
    expect(input).toHaveAttribute('maxLength', '10');
  });

  describe('CSS Module Classes', () => {
    it('applies container class to wrapper', () => {
      const { container } = render(<Input />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass(styles.container);
    });

    it('combines multiple classes correctly', () => {
      render(<Input size="large" error="Error message" className="custom" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass(styles.input, styles.inputLarge, styles.inputError, 'custom');
    });

    it('filters out falsy classes', () => {
      render(<Input size="default" error={null} />);
      
      const input = screen.getByRole('textbox');
      expect(input).not.toHaveClass(styles.inputSmall, styles.inputLarge, styles.inputError);
    });
  });

  describe('Accessibility', () => {
    it('maintains input semantics', () => {
      render(<Input placeholder="Accessible input" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('supports aria attributes', () => {
      render(
        <Input 
          aria-label="Custom label" 
          aria-describedby="description"
          aria-required="true"
        />
      );
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-label', 'Custom label');
      expect(input).toHaveAttribute('aria-describedby', 'description');
      expect(input).toHaveAttribute('aria-required', 'true');
    });

    it('associates label with input correctly', () => {
      render(<Input label="Email Address" />);
      
      const input = screen.getByRole('textbox', { name: /email address/i });
      expect(input).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('applies error styles when error is present', () => {
      render(<Input error="Invalid input" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass(styles.inputError);
    });

    it('does not apply error styles when error is null or empty', () => {
      const { rerender } = render(<Input error={null} />);
      expect(screen.getByRole('textbox')).not.toHaveClass(styles.inputError);

      rerender(<Input error="" />);
      expect(screen.getByRole('textbox')).not.toHaveClass(styles.inputError);
    });

    it('displays error message with correct styling', () => {
      const errorMessage = 'Field is required';
      render(<Input error={errorMessage} />);
      
      const error = screen.getByText(errorMessage);
      expect(error).toHaveClass(styles.errorMessage);
    });
  });
});