import { useState, useEffect } from 'react'
import { Modal, ModalFooter } from '../ui/Modal'
import { Input } from '../ui/input'
import { File, Folder, Edit } from 'lucide-react'

export function RenameModal({ 
  isOpen, 
  onClose, 
  item,
  onRename 
}) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Set initial name when modal opens
  useEffect(() => {
    if (isOpen && item) {
      setName(item.name)
      setError('')
      setLoading(false)
    }
  }, [isOpen, item])

  const validateName = (fileName) => {
    if (!fileName || fileName.trim().length === 0) {
      return 'Name cannot be empty'
    }

    if (fileName.length > 255) {
      return 'Name too long (max 255 characters)'
    }

    // Check for invalid characters
    const invalidChars = /[<>:"|?*\u0000-\u001f]/
    if (invalidChars.test(fileName)) {
      return 'Name contains invalid characters'
    }

    // Check for reserved names (Windows)
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i
    if (reservedNames.test(fileName)) {
      return 'Name is reserved and cannot be used'
    }

    // Check for leading/trailing spaces or dots
    if (fileName !== fileName.trim()) {
      return 'Name cannot start or end with spaces'
    }

    if (fileName.endsWith('.')) {
      return 'Name cannot end with a dot'
    }

    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!item) return

    const trimmedName = name.trim()
    
    // Check if name actually changed
    if (trimmedName === item.name) {
      onClose()
      return
    }

    const validationError = validateName(trimmedName)
    
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError('')

    try {
      // Calculate new path
      const pathParts = item.path.split('/')
      pathParts[pathParts.length - 1] = trimmedName
      const newPath = pathParts.join('/')

      const success = await onRename(item.path, newPath)

      if (success) {
        onClose()
      } else {
        setError('Failed to rename item')
      }
    } catch (err) {
      setError(err.message || 'Failed to rename item')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!item) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-2">
          <Edit className="w-5 h-5 text-slate-400" />
          <span>Rename {item.type === 'directory' ? 'Folder' : 'File'}</span>
        </div>
      }
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center space-x-2 p-3 bg-slate-700 rounded">
          {item.type === 'directory' ? (
            <Folder className="w-5 h-5 text-blue-400" />
          ) : (
            <File className="w-5 h-5 text-slate-400" />
          )}
          <span className="text-sm text-slate-300">{item.path}</span>
        </div>

        <Input
          label="New Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (error) setError('')
          }}
          onKeyDown={handleKeyDown}
          error={error}
          autoFocus
          disabled={loading}
        />

        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-slate-200 disabled:opacity-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || !name.trim() || name.trim() === item.name}
          >
            {loading ? 'Renaming...' : 'Rename'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  )
}