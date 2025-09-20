// Component exports
// All React components will be exported from here for easy importing

export { default as App } from './App/App';
export { IDELayout } from './IDELayout/IDELayout';
export { Header } from './Header/Header';
export { default as FileExplorer } from './FileExplorer/FileExplorer';
export { EditorPanel } from './EditorPanel/EditorPanel';
export { Terminal } from './Terminal/Terminal';
export { default as CodeExecution } from './CodeExecution';

// Git Components
export * from './Git';

// UI Components
export { Button } from './ui/button';
export { Input } from './ui/input';
export { Modal, ModalFooter } from './ui/Modal';
export { ContextMenu, ContextMenuItem, ContextMenuSeparator } from './ui/ContextMenu';