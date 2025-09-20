import React, { useState } from 'react';
import { X } from 'lucide-react';
import { EditorPanel } from '../EditorPanel/EditorPanel';
import useEditorStore from '../../store/editorStore';
import './EditorArea.css';

const EditorArea = () => {
    const { tabs, activeTabId, setActiveTab, closeTab } = useEditorStore();

    const handleTabClick = (tabId) => {
        setActiveTab(tabId);
    };

    const handleTabClose = (e, tabId) => {
        e.stopPropagation();
        closeTab(tabId);
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

    if (!tabs || tabs.length === 0) {
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
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        className={`editor-tab ${activeTabId === tab.id ? 'editor-tab--active' : ''
                            }`}
                        onClick={() => handleTabClick(tab.id)}
                    >
                        <span className="editor-tab__icon">
                            {getFileIcon(tab.name)}
                        </span>
                        <span className="editor-tab__title">
                            {tab.name}
                        </span>
                        <button
                            className="editor-tab__close"
                            onClick={(e) => handleTabClose(e, tab.id)}
                            aria-label={`Close ${tab.name}`}
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