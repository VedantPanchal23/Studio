import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import FileTypeIcon from './FileTypeIcon';
import { getFileTypeIcon, getFileTypeIconName, getFileTypeColor } from './fileTypeIcons';

describe('FileTypeIcon Component', () => {
  it('renders correct icon for JavaScript files', () => {
    render(<FileTypeIcon filename="app.js" />);
    const icon = screen.getByTestId('file-icon-app.js-file');
    expect(icon).toBeInTheDocument();
  });

  it('renders correct icon for TypeScript files', () => {
    render(<FileTypeIcon filename="component.tsx" />);
    const icon = screen.getByTestId('file-icon-component.tsx-file');
    expect(icon).toBeInTheDocument();
  });

  it('renders folder icon for directories', () => {
    render(<FileTypeIcon filename="src" isDirectory={true} />);
    const icon = screen.getByTestId('file-icon-src-directory');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('aria-label', 'Closed folder: src');
  });

  it('renders open folder icon when directory is open', () => {
    render(<FileTypeIcon filename="components" isDirectory={true} isOpen={true} />);
    const icon = screen.getByTestId('file-icon-components-directory');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('aria-label', 'Open folder: components');
  });

  it('applies custom size', () => {
    render(<FileTypeIcon filename="test.py" size={24} />);
    const icon = screen.getByTestId('file-icon-test.py-file');
    expect(icon).toHaveAttribute('width', '24');
    expect(icon).toHaveAttribute('height', '24');
  });

  it('uses file type specific colors when useColor is true', () => {
    render(<FileTypeIcon filename="style.css" useColor={true} />);
    const icon = screen.getByTestId('file-icon-style.css-file');
    expect(icon).toBeInTheDocument();
  });

  it('uses currentColor when useColor is false', () => {
    render(<FileTypeIcon filename="style.css" useColor={false} />);
    const icon = screen.getByTestId('file-icon-style.css-file');
    expect(icon).toHaveAttribute('stroke', 'currentColor');
  });

  it('allows color override', () => {
    render(<FileTypeIcon filename="test.js" color="#ff0000" />);
    const icon = screen.getByTestId('file-icon-test.js-file');
    expect(icon).toHaveAttribute('stroke', '#ff0000');
  });

  it('handles files without extensions', () => {
    render(<FileTypeIcon filename="README" />);
    const icon = screen.getByTestId('file-icon-README-file');
    expect(icon).toBeInTheDocument();
  });

  it('handles special filenames like package.json', () => {
    render(<FileTypeIcon filename="package.json" />);
    const icon = screen.getByTestId('file-icon-package.json-file');
    expect(icon).toBeInTheDocument();
  });

  it('handles dotfiles like .gitignore', () => {
    render(<FileTypeIcon filename=".gitignore" />);
    const icon = screen.getByTestId('file-icon-.gitignore-file');
    expect(icon).toBeInTheDocument();
  });

  it('applies additional className', () => {
    render(<FileTypeIcon filename="test.js" className="custom-class" />);
    const icon = screen.getByTestId('file-icon-test.js-file');
    expect(icon).toHaveClass('custom-class');
  });
});

describe('fileTypeIcons utilities', () => {
  describe('getFileTypeIcon', () => {
    it('returns correct icon for JavaScript files', () => {
      const icon = getFileTypeIcon('app.js');
      expect(icon).toBeDefined();
    });

    it('returns correct icon for package.json', () => {
      const icon = getFileTypeIcon('package.json');
      expect(icon).toBeDefined();
    });

    it('returns correct icon for .gitignore', () => {
      const icon = getFileTypeIcon('.gitignore');
      expect(icon).toBeDefined();
    });

    it('returns default icon for unknown extensions', () => {
      const icon = getFileTypeIcon('unknown.xyz');
      expect(icon).toBeDefined();
    });

    it('handles null/undefined filenames', () => {
      expect(getFileTypeIcon(null)).toBeDefined();
      expect(getFileTypeIcon(undefined)).toBeDefined();
      expect(getFileTypeIcon('')).toBeDefined();
    });

    it('handles filenames with paths', () => {
      const icon = getFileTypeIcon('/path/to/file.js');
      expect(icon).toBeDefined();
    });

    it('handles Windows-style paths', () => {
      const icon = getFileTypeIcon('C:\\path\\to\\file.js');
      expect(icon).toBeDefined();
    });
  });

  describe('getFileTypeIconName', () => {
    it('returns string icon name for JavaScript files', () => {
      const iconName = getFileTypeIconName('app.js');
      expect(typeof iconName).toBe('string');
      expect(iconName).toBeTruthy();
    });

    it('returns default icon name for unknown files', () => {
      const iconName = getFileTypeIconName('unknown.xyz');
      expect(iconName).toBe('FileText');
    });
  });

  describe('getFileTypeColor', () => {
    it('returns color for JavaScript files', () => {
      const color = getFileTypeColor('app.js');
      expect(typeof color).toBe('string');
      expect(color).toBeTruthy();
    });

    it('returns default color for unknown extensions', () => {
      const color = getFileTypeColor('unknown.xyz');
      expect(color).toBe('var(--text-secondary)');
    });

    it('handles null/undefined filenames', () => {
      expect(getFileTypeColor(null)).toBe('var(--text-secondary)');
      expect(getFileTypeColor(undefined)).toBe('var(--text-secondary)');
      expect(getFileTypeColor('')).toBe('var(--text-secondary)');
    });
  });
});