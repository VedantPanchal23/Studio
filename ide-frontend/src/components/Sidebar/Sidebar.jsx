import React from 'react';
import FileExplorer from '../FileExplorer/FileExplorer';
import { Search, SourceControl, RunDebug, Extensions } from './panels';
import './Sidebar.css';

const Sidebar = ({ activeView, workspaceId, onFileOpen, isCollapsed, onToggleCollapse }) => {
    const renderActivePanel = () => {
        switch (activeView) {
            case 'explorer':
                return <FileExplorer onFileOpen={onFileOpen} workspaceId={workspaceId} />;
            case 'search':
                return <Search />;
            case 'source-control':
                return <SourceControl />;
            case 'run':
                return <RunDebug />;
            case 'extensions':
                return <Extensions />;
            default:
                return <FileExplorer onFileOpen={onFileOpen} workspaceId={workspaceId} />;
        }
    };

    const getPanelTitle = () => {
        switch (activeView) {
            case 'explorer':
                return 'EXPLORER';
            case 'search':
                return 'SEARCH';
            case 'source-control':
                return 'SOURCE CONTROL';
            case 'run':
                return 'RUN AND DEBUG';
            case 'extensions':
                return 'EXTENSIONS';
            default:
                return 'EXPLORER';
        }
    };

    if (isCollapsed) {
        return null;
    }

    return (
        <div className="sidebar">
            <div className="sidebar__header">
                <h2 className="sidebar__title">{getPanelTitle()}</h2>
                <button
                    className="sidebar__collapse-btn"
                    onClick={onToggleCollapse}
                    aria-label="Collapse sidebar"
                >
                    ×
                </button>
            </div>
            <div className="sidebar__content">
                {renderActivePanel()}
            </div>
        </div>
    );
};

export default Sidebar;