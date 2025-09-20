import { forwardRef } from 'react';
import styles from './Textarea.module.css';

export const Textarea = forwardRef(({ 
  className = '', 
  error = null,
  label = null,
  size = 'default',
  resize = 'vertical',
  id,
  ...props 
}, ref) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  
  const textareaClasses = [
    styles.textarea,
    error ? styles.textareaError : '',
    size === 'small' ? styles.textareaSmall : '',
    size === 'large' ? styles.textareaLarge : '',
    resize === 'none' ? styles.resizeNone : '',
    resize === 'horizontal' ? styles.resizeHorizontal : '',
    resize === 'both' ? styles.resizeBoth : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.container}>
      {label && (
        <label className={styles.label} htmlFor={textareaId}>
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={textareaClasses}
        ref={ref}
        {...props}
      />
      {error && (
        <p className={styles.errorMessage}>{error}</p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';