import { useState } from 'react'
import { AlertTriangle, Save, X } from 'lucide-react'

export function UnsavedChangesDialog({ 
  isOpen, 
  fileName, 
  action = 'close',
  onSave, 
  onDiscard, 
  onCancel 
}) {
  if (!isOpen) return null

  const actionText = {
    close: 'closing',
    switch: 'switching files',
    open: 'opening a new file'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center space-x-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-orange-400" />
          <h3 className="text-lg font-medium text-slate-200">Unsaved Changes</h3>
        </div>
        
        <p className="text-slate-300 mb-6">
          Do you want to save the changes you made to <strong>{fileName}</strong>?
          <br />
          <span className="text-sm text-slate-400 mt-2 block">
            Your changes will be lost if you don't save them before {actionText[action]}.
          </span>
        </p>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-slate-300 hover:text-slate-100 hover:bg-slate-700 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onDiscard}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors flex items-center space-x-2"
          >
            <X className="w-4 h-4" />
            <span>Don't Save</span>
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  )
}