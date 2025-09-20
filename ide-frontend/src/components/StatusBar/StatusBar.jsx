import React from 'react';
import {
    GitBranch,
    AlertCircle,
    CheckCircle,
    Info,
    Bell
} from 'lucide-react';
import useEditorStore from '../../store/editorStore';
import './StatusBar.css';

const StatusBar = () => {
    const { activeFile, cursorPosition } = useEditorStore();

    const getLanguageFromFile = (filePath) => {
        if (!filePath) return 'Plain Text';
        const ext = filePath.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'js':
                return 'JavaScript';
            case 'jsx':
                return 'JavaScript React';
            case 'ts':
                return 'TypeScript';
            case 'tsx':
                return 'TypeScript React';
            case 'css':
                return 'CSS';
            case 'html':
                return 'HTML';
            case 'json':
                return 'JSON';
            case 'md':
                return 'Markdown';
            case 'py':
                return 'Python';
            case 'java':
                return 'Java';
            case 'cpp':
            case 'c':
                return 'C++';
            case 'go':
                return 'Go';
            case 'rs':
                return 'Rust';
            default:
                return 'Plain Text';
        }
    };

    return (
        <div className="status-bar">
            <div className="status-bar__left">
                <div className="status-bar__item">
                    <GitBranch size={14} />
                    <span>main</span>
                </div>

                <div className="status-bar__item status-bar__problems">
                    <AlertCircle size={14} />
                    <span>0</span>
                </div>

                <div className="status-bar__item status-bar__problems">
                    <Info size={14} />
                    <span>0</span>
                </div>
            </div>

            <div className="status-bar__center">
                {/* Center items can go here */}
            </div>

            <div className="status-bar__right">
                <div className="status-bar__item">
                    <span>Spaces: 2</span>
                </div>

                <div className="status-bar__item">
                    <span>UTF-8</span>
                </div>

                <div className="status-bar__item">
                    <span>LF</span>
                </div>

                <div className="status-bar__item status-bar__language">
                    <span>{getLanguageFromFile(activeFile)}</span>
                </div>

                {cursorPosition && (
                    <div className="status-bar__item">
                        <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
                    </div>
                )}

                <div className="status-bar__item">
                    <Bell size={14} />
                </div>
            </div>
        </div>
    );
};

export default StatusBar;