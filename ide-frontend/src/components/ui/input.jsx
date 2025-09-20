import { forwardRef } from 'react';
import styles from './Input.module.css';

export const Input = forwardRef(({ 
  className = '', 
  type = 'text',
  error = null,
  label = null,
  size = 'default',
  id,
  ...props 
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  const inputClasses = [
    styles.input,
    error ? styles.inputError : '',
    size === 'small' ? styles.inputSmall : '',
    size === 'large' ? styles.inputLarge : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.container}>
      {label && (
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={inputClasses}
        ref={ref}
        {...props}
      />
      {error && (
        <p className={styles.errorMessage}>{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';