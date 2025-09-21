import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
  SelectSeparator,
  SelectGroup
} from '../select';
import styles from '../Select.module.css';

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Check: ({ className, ...props }) => (
    <svg data-testid="check-icon" className={className} {...props}>
      <title>Check</title>
    </svg>
  ),
  ChevronDown: ({ className, ...props }) => (
    <svg data-testid="chevron-down-icon" className={className} {...props}>
      <title>ChevronDown</title>
    </svg>
  ),
  ChevronUp: ({ className, ...props }) => (
    <svg data-testid="chevron-up-icon" className={className} {...props}>
      <title>ChevronUp</title>
    </svg>
  ),
}));

describe('Select Components', () => {
  describe('SelectTrigger', () => {
    it('renders with default props', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select option" />
          </SelectTrigger>
        </Select>
      );
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveClass(styles.trigger);
    });

    it('applies size classes correctly', () => {
      const { rerender } = render(
        <Select>
          <SelectTrigger size="small">
            <SelectValue />
          </SelectTrigger>
        </Select>
      );
      expect(screen.getByRole('combobox')).toHaveClass(styles.triggerSmall);

      rerender(
        <Select>
          <SelectTrigger size="default">
            <SelectValue />
          </SelectTrigger>
        </Select>
      );
      expect(screen.getByRole('combobox')).not.toHaveClass(styles.triggerSmall, styles.triggerLarge);

      rerender(
        <Select>
          <SelectTrigger size="large">
            <SelectValue />
          </SelectTrigger>
        </Select>
      );
      expect(screen.getByRole('combobox')).toHaveClass(styles.triggerLarge);
    });

    it('applies error class when error prop is true', () => {
      render(
        <Select>
          <SelectTrigger error={true}>
            <SelectValue />
          </SelectTrigger>
        </Select>
      );
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveClass(styles.triggerError);
    });

    it('applies custom className', () => {
      render(
        <Select>
          <SelectTrigger className="custom-trigger">
            <SelectValue />
          </SelectTrigger>
        </Select>
      );
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveClass('custom-trigger');
    });

    it('renders chevron down icon', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
        </Select>
      );
      
      const icon = screen.getByTestId('chevron-down-icon');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass(styles.triggerIcon);
    });

    it('handles disabled state', () => {
      render(
        <Select>
          <SelectTrigger disabled>
            <SelectValue />
          </SelectTrigger>
        </Select>
      );
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeDisabled();
    });
  });

  describe('CSS Module Classes', () => {
    it('combines multiple classes correctly on trigger', () => {
      render(
        <Select>
          <SelectTrigger size="large" error={true} className="custom">
            <SelectValue />
          </SelectTrigger>
        </Select>
      );
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveClass(styles.trigger, styles.triggerLarge, styles.triggerError, 'custom');
    });

    it('filters out falsy classes', () => {
      render(
        <Select>
          <SelectTrigger size="default" error={false}>
            <SelectValue />
          </SelectTrigger>
        </Select>
      );
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).not.toHaveClass(styles.triggerSmall, styles.triggerLarge, styles.triggerError);
    });
  });

  describe('Accessibility', () => {
    it('maintains combobox semantics', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
        </Select>
      );
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeInTheDocument();
    });

    it('supports aria attributes', () => {
      render(
        <Select>
          <SelectTrigger aria-label="Custom select" aria-describedby="description">
            <SelectValue />
          </SelectTrigger>
        </Select>
      );
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveAttribute('aria-label', 'Custom select');
      expect(trigger).toHaveAttribute('aria-describedby', 'description');
    });
  });

  describe('Error Handling', () => {
    it('applies error styles when error is true', () => {
      render(
        <Select>
          <SelectTrigger error={true}>
            <SelectValue />
          </SelectTrigger>
        </Select>
      );
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveClass(styles.triggerError);
    });

    it('does not apply error styles when error is false', () => {
      render(
        <Select>
          <SelectTrigger error={false}>
            <SelectValue />
          </SelectTrigger>
        </Select>
      );
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).not.toHaveClass(styles.triggerError);
    });
  });
});