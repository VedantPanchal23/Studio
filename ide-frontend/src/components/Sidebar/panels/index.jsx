import React from 'react';

export function Search() {
    return (
        <div className="search-panel">
            <div style={{ padding: '16px' }}>
                <input
                    type="text"
                    placeholder="Search files..."
                    style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: 'var(--vscode-background)',
                        border: '1px solid var(--vscode-border)',
                        color: 'var(--vscode-foreground)',
                        borderRadius: '3px'
                    }}
                />
                <p style={{ fontSize: '12px', color: 'var(--vscode-input-placeholderForeground)', marginTop: '16px' }}>
                    Search functionality coming soon...
                </p>
            </div>
        </div>
    );
}

export function SourceControl() {
    return (
        <div className="source-control-panel">
            <div style={{ padding: '16px' }}>
                <p style={{ fontSize: '12px', color: 'var(--vscode-input-placeholderForeground)' }}>
                    Source control integration coming soon...
                </p>
            </div>
        </div>
    );
}

export function RunDebug() {
    return (
        <div className="run-debug-panel">
            <div style={{ padding: '16px' }}>
                <p style={{ fontSize: '12px', color: 'var(--vscode-input-placeholderForeground)' }}>
                    Run and debug features coming soon...
                </p>
            </div>
        </div>
    );
}

export function Extensions() {
    return (
        <div className="extensions-panel">
            <div style={{ padding: '16px' }}>
                <p style={{ fontSize: '12px', color: 'var(--vscode-input-placeholderForeground)' }}>
                    Extensions marketplace coming soon...
                </p>
            </div>
        </div>
    );
}