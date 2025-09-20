import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export function ContextMenu({ 
  isOpen, 
  onClose, 
  position, 
  children,
  className = ''
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={menuRef}
      className={`fixed z-50 bg-slate-800 border border-slate-600 rounded-md shadow-lg py-1 min-w-[160px] ${className}`}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {children}
    </div>,
    document.body
  );
}

export function ContextMenuItem({ 
  onClick, 
  children, 
  disabled = false,
  icon = null,
  shortcut = null,
  className = ''
}) {
  return (
    <button
      className={`w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed flex items-center justify-between ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      <div className="flex items-center space-x-2">
        {icon && <span className="w-4 h-4">{icon}</span>}
        <span>{children}</span>
      </div>
      {shortcut && (
        <span className="text-xs text-slate-400">{shortcut}</span>
      )}
    </button>
  );
}

export function ContextMenuSeparator() {
  return <div className="border-t border-slate-600 my-1" />;
}