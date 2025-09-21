import { AlertTriangle, Save, X } from 'lucide-react'
import styles from './UnsavedChangesDialog.module.css'

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
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <AlertTriangle className={styles.warningIcon} />
          <h3 className={styles.title}>Unsaved Changes</h3>
        </div>
        
        <p className={styles.content}>
          Do you want to save the changes you made to <strong className={styles.fileName}>{fileName}</strong>?
          <br />
          <span className={styles.subText}>
            Your changes will be lost if you don't save them before {actionText[action]}.
          </span>
        </p>
        
        <div className={styles.actions}>
          <button
            onClick={onCancel}
            className={`${styles.button} ${styles.cancelButton}`}
          >
            Cancel
          </button>
          <button
            onClick={onDiscard}
            className={`${styles.button} ${styles.discardButton}`}
          >
            <X className={styles.buttonIcon} />
            <span>Don't Save</span>
          </button>
          <button
            onClick={onSave}
            className={`${styles.button} ${styles.saveButton}`}
          >
            <Save className={styles.buttonIcon} />
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  )
}