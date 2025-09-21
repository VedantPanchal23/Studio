import { useState, useEffect } from 'react'
import { Modal, ModalFooter } from '../ui/Modal'
import { Input } from '../ui/input'
import { File, Folder } from 'lucide-react'

export function CreateItemModal({ 
  isOpen, 
  onClose, 
  type = 'file',
  onCreateFile,
  onCreateDirectory 
}) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setName('')
      setError('')
      setLoading(false)
    }
  }, [isOpen])

  const validateName = (fileName) => {
    if (!fileName || fileName.trim().length === 0) {
      return 'Name cannot be empty'
    }

    if (fileName.length > 255) {
      return 'Name too long (max 255 characters)'
    }

    // Check for invalid characters
    // eslint-disable-next-line no-control-regex
    const invalidChars = /[<>:"|?*\u0000-\u001F]/
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
    
    const trimmedName = name.trim()
    const validationError = validateName(trimmedName)
    
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError('')

    try {
      let success = false
      
      if (type === 'file') {
        success = await onCreateFile(trimmedName, '')
      } else {
        success = await onCreateDirectory(trimmedName)
      }

      if (success) {
        onClose()
      } else {
        setError(`Failed to create ${type}`)
      }
    } catch (err) {
      setError(err.message || `Failed to create ${type}`)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-2">
          {type === 'file' ? (
            <File className="w-5 h-5 text-slate-400" />
          ) : (
            <Folder className="w-5 h-5 text-blue-400" />
          )}
          <span>Create New {type === 'file' ? 'File' : 'Folder'}</span>
        </div>
      }
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={`${type === 'file' ? 'File' : 'Folder'} Name`}
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (error) setError('')
          }}
          onKeyDown={handleKeyDown}
          placeholder={type === 'file' ? 'example.js' : 'folder-name'}
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
            disabled={loading || !name.trim()}
          >
            {loading ? 'Creating...' : `Create ${type === 'file' ? 'File' : 'Folder'}`}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  )
}