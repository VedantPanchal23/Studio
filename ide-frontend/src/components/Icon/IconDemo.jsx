import { useState } from 'react';
import { IconProvider, Icon, FileTypeIcon, useIconContext, useIconColors } from './index';

/**
 * Demo component showing various icon usage patterns
 */
const IconExamples = () => {
  const context = useIconContext();
  const colors = useIconColors();
  
  return (
    <div style={{ padding: '20px', fontFamily: 'var(--font-family-sans)' }}>
      <h3>Current Icon Context</h3>
      <pre style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: '4px' }}>
        {JSON.stringify(context, null, 2)}
      </pre>
      
      <h3>Basic Icons</h3>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
        <Icon name="Home" />
        <Icon name="Settings" size={20} />
        <Icon name="User" size={24} color={colors.primary} />
        <Icon name="Search" size={16} color={colors.success} />
      </div>
      
      <h3>File Type Icons</h3>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
        <FileTypeIcon filename="app.js" />
        <FileTypeIcon filename="component.tsx" />
        <FileTypeIcon filename="style.css" />
        <FileTypeIcon filename="package.json" />
        <FileTypeIcon filename="README.md" />
        <FileTypeIcon filename=".gitignore" />
      </div>
      
      <h3>Directory Icons</h3>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
        <FileTypeIcon filename="src" isDirectory={true} />
        <FileTypeIcon filename="components" isDirectory={true} isOpen={true} />
        <FileTypeIcon filename="node_modules" isDirectory={true} />
        <FileTypeIcon filename="dist" isDirectory={true} />
      </div>
      
      <h3>Themed Colors</h3>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
        <Icon name="AlertCircle" color={colors.danger} />
        <Icon name="CheckCircle" color={colors.success} />
        <Icon name="Info" color={colors.info} />
        <Icon name="AlertTriangle" color={colors.warning} />
      </div>
      
      <h3>Different Sizes</h3>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
        <Icon name="Star" size={12} />
        <Icon name="Star" size={16} />
        <Icon name="Star" size={20} />
        <Icon name="Star" size={24} />
        <Icon name="Star" size={32} />
      </div>
      
      <h3>Fallback Icons</h3>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
        <Icon name="NonExistentIcon" />
        <Icon name="AnotherFakeIcon" fallback={{ name: 'AlertCircle', color: colors.danger }} />
      </div>
    </div>
  );
};

/**
 * Main demo component with provider configuration
 */
const IconDemo = () => {
  const [theme, setTheme] = useState('auto');
  const [size, setSize] = useState(16);
  const [useFileTypeColors, setUseFileTypeColors] = useState(true);
  
  return (
    <div style={{ padding: '20px' }}>
      <h2>Icon System Demo</h2>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <label>
          Theme:
          <select value={theme} onChange={(e) => setTheme(e.target.value)} style={{ marginLeft: '5px' }}>
            <option value="auto">Auto</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        
        <label>
          Default Size:
          <input 
            type="range" 
            min="12" 
            max="32" 
            value={size} 
            onChange={(e) => setSize(Number(e.target.value))}
            style={{ marginLeft: '5px' }}
          />
          <span style={{ marginLeft: '5px' }}>{size}px</span>
        </label>
        
        <label>
          <input 
            type="checkbox" 
            checked={useFileTypeColors} 
            onChange={(e) => setUseFileTypeColors(e.target.checked)}
          />
          Use File Type Colors
        </label>
      </div>
      
      <IconProvider 
        defaultSize={size}
        theme={theme}
        useFileTypeColors={useFileTypeColors}
        accessibility={{
          includeLabels: true,
          hideDecorative: false
        }}
      >
        <IconExamples />
      </IconProvider>
      
      <hr style={{ margin: '40px 0' }} />
      
      <h3>Nested Provider Example</h3>
      <IconProvider defaultSize={16} theme="light">
        <div style={{ padding: '10px', border: '1px solid #ccc', marginBottom: '10px' }}>
          <p>Outer Provider (16px, light theme):</p>
          <Icon name="Sun" /> <FileTypeIcon filename="app.js" />
        </div>
        
        <IconProvider defaultSize={24} theme="dark" defaultColor="#ff6b6b">
          <div style={{ padding: '10px', border: '1px solid #666', background: '#333', color: '#fff' }}>
            <p>Inner Provider (24px, dark theme, red color):</p>
            <Icon name="Moon" /> <FileTypeIcon filename="app.js" />
          </div>
        </IconProvider>
      </IconProvider>
    </div>
  );
};

export default IconDemo;