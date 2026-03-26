import React from 'react';
import styles from './Button.module.css';

const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className = '',
  ...props
}) => {
  const baseClasses = styles.button;
  const variantClasses = styles[variant] || styles.primary;
  const sizeClasses = styles[size] || styles.medium;
  const loadingClasses = loading ? styles.loading : '';
  const disabledClasses = disabled ? styles.disabled : '';

  const combinedClasses = [
    baseClasses,
    variantClasses,
    sizeClasses,
    loadingClasses,
    disabledClasses,
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={combinedClasses}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className={styles.spinner} />}
      {children}
    </button>
  );
};

export default Button;
