import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Textarea } from '../textarea';
import styles from '../Textarea.module.css';

describe('Textarea Component', () => {
  it('renders with default props', () => {
    render(<Textarea placeholder="Enter description" />);
    
    const textarea = screen.getByPlaceholderText('Enter description');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveClass(styles.textarea);
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('renders with label when provided', () => {
    render(<Textarea label="Description" placeholder="Enter description" />);
    
    const label = screen.getByText('Description');
    const textarea = screen.getByPlaceholderText('Enter description');
    
    expect(label).toBeInTheDocument();
    expect(label).toHaveClass(styles.label);
    expect(textarea).toBeInTheDocument();
  });

  it('displays error message when error prop is provided', () => {
    const errorMessage = 'Description is required';
    render(<Textarea error={errorMessage} />);
    
    const textarea = screen.getByRole('textbox');
    const error = screen.getByText(errorMessage);
    
    expect(textarea).toHaveClass(styles.textareaError);
    expect(error).toBeInTheDocument();
    expect(error).toHaveClass(styles.errorMessage);
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<Textarea size="small" />);
    expect(screen.getByRole('textbox')).toHaveClass(styles.textareaSmall);

    rerender(<Textarea size="default" />);
    expect(screen.getByRole('textbox')).not.toHaveClass(styles.textareaSmall, styles.textareaLarge);

    rerender(<Textarea size="large" />);
    expect(screen.getByRole('textbox')).toHaveClass(styles.textareaLarge);
  });

  it('applies resize classes correctly', () => {
    const { rerender } = render(<Textarea resize="none" />);
    expect(screen.getByRole('textbox')).toHaveClass(styles.resizeNone);

    rerender(<Textarea resize="horizontal" />);
    expect(screen.getByRole('textbox')).toHaveClass(styles.resizeHorizontal);

    rerender(<Textarea resize="both" />);
    expect(screen.getByRole('textbox')).toHaveClass(styles.resizeBoth);

    rerender(<Textarea resize="vertical" />);
    expect(screen.getByRole('textbox')).not.toHaveClass(styles.resizeNone, styles.resizeHorizontal, styles.resizeBoth);
  });

  it('handles disabled state correctly', () => {
    render(<Textarea disabled placeholder="Disabled textarea" />);
    
    const textarea = screen.getByPlaceholderText('Disabled textarea');
    expect(textarea).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<Textarea className="custom-textarea" />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('custom-textarea');
  });

  it('handles value changes', () => {
    const handleChange = vi.fn();
    render(<Textarea onChange={handleChange} />);
    
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'test description' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(textarea).toHaveValue('test description');
  });

  it('handles focus and blur events', () => {
    const handleFocus = vi.fn();
    const handleBlur = vi.fn();
    render(<Textarea onFocus={handleFocus} onBlur={handleBlur} />);
    
    const textarea = screen.getByRole('textbox');
    
    fireEvent.focus(textarea);
    expect(handleFocus).toHaveBeenCalledTimes(1);
    
    fireEvent.blur(textarea);
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });

  it('forwards ref correctly', () => {
    const ref = vi.fn();
    render(<Textarea ref={ref} />);
    
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLTextAreaElement));
  });

  it('passes through additional props', () => {
    render(<Textarea data-testid="custom-textarea" rows={5} cols={30} />);
    
    const textarea = screen.getByTestId('custom-textarea');
    expect(textarea).toHaveAttribute('rows', '5');
    expect(textarea).toHaveAttribute('cols', '30');
  });

  describe('CSS Module Classes', () => {
    it('applies container class to wrapper', () => {
      const { container } = render(<Textarea />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass(styles.container);
    });

    it('combines multiple classes correctly', () => {
      render(
        <Textarea 
          size="large" 
          resize="none" 
          error="Error message" 
          className="custom" 
        />
      );
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass(
        styles.textarea, 
        styles.textareaLarge, 
        styles.resizeNone, 
        styles.textareaError, 
        'custom'
      );
    });

    it('filters out falsy classes', () => {
      render(<Textarea size="default" resize="vertical" error={null} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).not.toHaveClass(
        styles.textareaSmall, 
        styles.textareaLarge, 
        styles.resizeNone, 
        styles.resizeHorizontal, 
        styles.resizeBoth, 
        styles.textareaError
      );
    });
  });

  describe('Accessibility', () => {
    it('maintains textarea semantics', () => {
      render(<Textarea placeholder="Accessible textarea" />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
    });

    it('supports aria attributes', () => {
      render(
        <Textarea 
          aria-label="Custom label" 
          aria-describedby="description"
          aria-required="true"
        />
      );
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-label', 'Custom label');
      expect(textarea).toHaveAttribute('aria-describedby', 'description');
      expect(textarea).toHaveAttribute('aria-required', 'true');
    });

    it('associates label with textarea correctly', () => {
      render(<Textarea label="Comments" />);
      
      const textarea = screen.getByRole('textbox', { name: /comments/i });
      expect(textarea).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('applies error styles when error is present', () => {
      render(<Textarea error="Invalid input" />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass(styles.textareaError);
    });

    it('does not apply error styles when error is null or empty', () => {
      const { rerender } = render(<Textarea error={null} />);
      expect(screen.getByRole('textbox')).not.toHaveClass(styles.textareaError);

      rerender(<Textarea error="" />);
      expect(screen.getByRole('textbox')).not.toHaveClass(styles.textareaError);
    });

    it('displays error message with correct styling', () => {
      const errorMessage = 'Field is required';
      render(<Textarea error={errorMessage} />);
      
      const error = screen.getByText(errorMessage);
      expect(error).toHaveClass(styles.errorMessage);
    });
  });

  describe('Resize Behavior', () => {
    it('applies default vertical resize', () => {
      render(<Textarea />);
      
      const textarea = screen.getByRole('textbox');
      // Default should not have any resize classes (vertical is default CSS behavior)
      expect(textarea).not.toHaveClass(styles.resizeNone, styles.resizeHorizontal, styles.resizeBoth);
    });

    it('prevents resize when resize="none"', () => {
      render(<Textarea resize="none" />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass(styles.resizeNone);
    });

    it('allows horizontal resize when resize="horizontal"', () => {
      render(<Textarea resize="horizontal" />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass(styles.resizeHorizontal);
    });

    it('allows both directions when resize="both"', () => {
      render(<Textarea resize="both" />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass(styles.resizeBoth);
    });
  });
});