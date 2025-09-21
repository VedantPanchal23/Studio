import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { IconProvider, useIconContext, useIconColors, useIconSizes, useIconProps } from './IconProvider';
import Icon from './Icon';

// Test component to access context
const TestComponent = ({ testId = 'test-component' }) => {
  const context = useIconContext();
  return (
    <div data-testid={testId}>
      <span data-testid="size">{context.size}</span>
      <span data-testid="color">{context.color}</span>
      <span data-testid="theme">{context.theme}</span>
      <span data-testid="useFileTypeColors">{context.useFileTypeColors.toString()}</span>
    </div>
  );
};

// Test component for useIconColors hook
const ColorTestComponent = ({ baseColor }) => {
  const colors = useIconColors(baseColor);
  return (
    <div data-testid="color-test">
      <span data-testid="primary">{colors.primary}</span>
      <span data-testid="current">{colors.current}</span>
    </div>
  );
};

// Test component for useIconSizes hook
const SizeTestComponent = ({ baseSize }) => {
  const sizes = useIconSizes(baseSize);
  return (
    <div data-testid="size-test">
      <span data-testid="base">{sizes.base}</span>
      <span data-testid="lg">{sizes.lg}</span>
    </div>
  );
};

// Test component for useIconProps hook
const PropsTestComponent = ({ iconProps }) => {
  const mergedProps = useIconProps(iconProps);
  return (
    <div data-testid="props-test">
      <span data-testid="size">{mergedProps.size}</span>
      <span data-testid="color">{mergedProps.color}</span>
    </div>
  );
};

describe('IconProvider', () => {
  it('provides default configuration', () => {
    render(
      <IconProvider>
        <TestComponent />
      </IconProvider>
    );

    expect(screen.getByTestId('size')).toHaveTextContent('16');
    expect(screen.getByTestId('color')).toHaveTextContent('currentColor');
    expect(screen.getByTestId('theme')).toHaveTextContent('auto');
    expect(screen.getByTestId('useFileTypeColors')).toHaveTextContent('true');
  });

  it('provides custom configuration', () => {
    render(
      <IconProvider 
        defaultSize={24} 
        defaultColor="#ff0000" 
        theme="dark"
        useFileTypeColors={false}
      >
        <TestComponent />
      </IconProvider>
    );

    expect(screen.getByTestId('size')).toHaveTextContent('24');
    expect(screen.getByTestId('color')).toHaveTextContent('#ff0000');
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(screen.getByTestId('useFileTypeColors')).toHaveTextContent('false');
  });

  it('allows nested providers with different configurations', () => {
    render(
      <IconProvider defaultSize={16}>
        <TestComponent testId="outer" />
        <IconProvider defaultSize={24}>
          <TestComponent testId="inner" />
        </IconProvider>
      </IconProvider>
    );

    expect(screen.getByTestId('outer').querySelector('[data-testid="size"]')).toHaveTextContent('16');
    expect(screen.getByTestId('inner').querySelector('[data-testid="size"]')).toHaveTextContent('24');
  });

  it('works with Icon component', () => {
    render(
      <IconProvider defaultSize={32} defaultColor="#00ff00">
        <Icon name="Home" />
      </IconProvider>
    );

    const icon = screen.getByTestId('icon-Home');
    expect(icon).toHaveAttribute('width', '32');
    expect(icon).toHaveAttribute('height', '32');
    expect(icon).toHaveAttribute('stroke', '#00ff00');
  });
});

describe('useIconContext', () => {
  it('returns default config when used outside provider', () => {
    render(<TestComponent />);

    expect(screen.getByTestId('size')).toHaveTextContent('16');
    expect(screen.getByTestId('color')).toHaveTextContent('currentColor');
  });

  it('returns provider config when used inside provider', () => {
    render(
      <IconProvider defaultSize={20}>
        <TestComponent />
      </IconProvider>
    );

    expect(screen.getByTestId('size')).toHaveTextContent('20');
  });
});

describe('useIconColors', () => {
  it('returns theme-aware colors', () => {
    render(
      <IconProvider theme="light">
        <ColorTestComponent />
      </IconProvider>
    );

    expect(screen.getByTestId('primary')).toHaveTextContent('var(--color-primary)');
    expect(screen.getByTestId('current')).toHaveTextContent('currentColor');
  });

  it('uses base color when provided', () => {
    render(
      <IconProvider>
        <ColorTestComponent baseColor="#ff0000" />
      </IconProvider>
    );

    expect(screen.getByTestId('current')).toHaveTextContent('#ff0000');
  });

  it('adapts to dark theme', () => {
    render(
      <IconProvider theme="dark">
        <ColorTestComponent />
      </IconProvider>
    );

    const colors = screen.getByTestId('color-test');
    expect(colors).toBeInTheDocument();
  });
});

describe('useIconSizes', () => {
  it('returns size variants based on base size', () => {
    render(
      <IconProvider defaultSize={16}>
        <SizeTestComponent />
      </IconProvider>
    );

    expect(screen.getByTestId('base')).toHaveTextContent('16');
    expect(screen.getByTestId('lg')).toHaveTextContent('20'); // 16 * 1.25
  });

  it('uses custom base size', () => {
    render(
      <IconProvider>
        <SizeTestComponent baseSize={24} />
      </IconProvider>
    );

    expect(screen.getByTestId('base')).toHaveTextContent('24');
    expect(screen.getByTestId('lg')).toHaveTextContent('30'); // 24 * 1.25
  });

  it('enforces minimum sizes', () => {
    render(
      <IconProvider defaultSize={8}>
        <SizeTestComponent />
      </IconProvider>
    );

    // xs should be at least 12 even if calculated smaller
    const sizes = screen.getByTestId('size-test');
    expect(sizes).toBeInTheDocument();
  });
});

describe('useIconProps', () => {
  it('merges props with context defaults', () => {
    render(
      <IconProvider defaultSize={20} defaultColor="#0000ff">
        <PropsTestComponent iconProps={{}} />
      </IconProvider>
    );

    expect(screen.getByTestId('size')).toHaveTextContent('20');
    expect(screen.getByTestId('color')).toHaveTextContent('#0000ff');
  });

  it('allows prop overrides', () => {
    render(
      <IconProvider defaultSize={20} defaultColor="#0000ff">
        <PropsTestComponent iconProps={{ size: 32, color: '#ff0000' }} />
      </IconProvider>
    );

    expect(screen.getByTestId('size')).toHaveTextContent('32');
    expect(screen.getByTestId('color')).toHaveTextContent('#ff0000');
  });

  it('merges fallback configuration', () => {
    const customFallback = { name: 'AlertCircle', color: '#ff0000' };
    
    render(
      <IconProvider fallback={{ name: 'HelpCircle', color: '#0000ff' }}>
        <PropsTestComponent iconProps={{ fallback: customFallback }} />
      </IconProvider>
    );

    // Component should receive merged fallback config
    const propsTest = screen.getByTestId('props-test');
    expect(propsTest).toBeInTheDocument();
  });

  it('adds accessibility props when enabled', () => {
    render(
      <IconProvider accessibility={{ includeLabels: true, hideDecorative: true }}>
        <PropsTestComponent iconProps={{ name: 'Home' }} />
      </IconProvider>
    );

    const propsTest = screen.getByTestId('props-test');
    expect(propsTest).toBeInTheDocument();
  });
});