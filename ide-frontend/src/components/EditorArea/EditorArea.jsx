import React, { useState } from 'react';
import { X } from 'lucide-react';
import { EditorPanel } from '../EditorPanel/EditorPanel';
import useEditorStore from '../../store/editorStore';
import './EditorArea.css';

const EditorArea = () => {
    const { openFiles, activeFile, setActiveFile, closeFile } = useEditorStore();

    const handleTabClick = (filePath) => {
        setActiveFile(filePath);
    };

    const handleTabClose = (e, filePath) => {
        e.stopPropagation();
        closeFile(filePath);
    };

    const getFileIcon = (fileName) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'js':
            case 'jsx':
                return '📄';
            case 'ts':
            case 'tsx':
                return '📘';
            case 'css':
                return '🎨';
            case 'html':
                return '🌐';
            case 'json':
                return '📋';
            case 'md':
                return '📝';
            case 'py':
                return '🐍';
            case 'java':
                return '☕';
            case 'cpp':
            case 'c':
                return '⚙️';
            case 'go':
                return '🚀';
            case 'rs':
                return '🦀';
            default:
                return '📄';
        }
    };

    const getFileName = (filePath) => {
        return filePath.split('/').pop() || filePath;
    };

    if (openFiles.length === 0) {
        return (
            <div className="editor-area">
                <div className="editor-welcome">
                    <h2>Welcome to VS Code</h2>
                    <p>Open a file from the Explorer to get started</p>
                </div>
            </div>
        );
    }

    return (
        <div className="editor-area">
            <div className="editor-tabs">
                {openFiles.map((file) => (
                    <div
                        key={file.path}
                        className={`editor-tab ${activeFile === file.path ? 'editor-tab--active' : ''
                            }`}
                        onClick={() => handleTabClick(file.path)}
                    >
                        <span className="editor-tab__icon">
                            {getFileIcon(getFileName(file.path))}
                        </span>
                        <span className="editor-tab__title">
                            {getFileName(file.path)}
                        </span>
                        <button
                            className="editor-tab__close"
                            onClick={(e) => handleTabClose(e, file.path)}
                            aria-label={`Close ${getFileName(file.path)}`}
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}
            </div>
            <div className="editor-content">
                <EditorPanel />
            </div>
        </div>
    );
};

export default EditorArea;