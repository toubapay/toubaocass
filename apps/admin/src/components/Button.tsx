import React from 'react';

import { colors, radius } from '../theme';

interface Props {
  label: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'outline' | 'danger';
  style?: React.CSSProperties;
}

export function Button({ label, onClick, type = 'button', disabled, loading, variant = 'primary', style }: Props) {
  const isDisabled = disabled || loading;

  const base: React.CSSProperties = {
    borderRadius: radius.sm,
    padding: '10px 18px',
    minHeight: 40,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    cursor: isDisabled ? 'default' : 'pointer',
    opacity: isDisabled ? 0.5 : 1,
    transition: 'opacity 0.15s ease',
    ...style,
  };

  const variantStyle: React.CSSProperties =
    variant === 'primary'
      ? { backgroundColor: colors.primary, color: '#fff' }
      : variant === 'danger'
        ? { backgroundColor: colors.danger, color: '#fff' }
        : { backgroundColor: 'transparent', color: colors.primary, border: `1.5px solid ${colors.primary}` };

  return (
    <button type={type} onClick={onClick} disabled={isDisabled} style={{ ...base, ...variantStyle }}>
      {loading ? '…' : label}
    </button>
  );
}
