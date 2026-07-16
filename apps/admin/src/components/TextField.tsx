import React from 'react';

import { colors, radius, spacing } from '../theme';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function TextField({ label, error, style, ...rest }: Props) {
  return (
    <div style={{ marginBottom: spacing.md }}>
      {label && (
        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: colors.text, marginBottom: spacing.xs }}>
          {label}
        </label>
      )}
      <input
        {...rest}
        style={{
          width: '100%',
          border: `1px solid ${error ? colors.danger : colors.border}`,
          borderRadius: radius.sm,
          padding: '10px 14px',
          fontSize: 15,
          color: colors.text,
          backgroundColor: colors.surface,
          ...style,
        }}
      />
      {error && <p style={{ color: colors.danger, fontSize: 13, marginTop: spacing.xs }}>{error}</p>}
    </div>
  );
}
