import { createPortal } from 'react-dom';

import { colors, radius, spacing } from '../theme';
import { Button } from './Button';

export function SuccessModal({
  title,
  body,
  buttonLabel,
  onClose,
}: {
  title: string;
  body?: string;
  buttonLabel: string;
  onClose: () => void;
}) {
  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: spacing.lg,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.lg,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 999,
            backgroundColor: colors.successSoft,
            color: colors.success,
            fontSize: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: `0 auto ${spacing.md}px`,
          }}
        >
          ✓
        </div>
        <h2 style={{ fontSize: 19, fontWeight: 700, color: colors.text, margin: `0 0 ${spacing.xs}px` }}>{title}</h2>
        {body && <p style={{ fontSize: 14, color: colors.textMuted, margin: `0 0 ${spacing.lg}px` }}>{body}</p>}
        <Button label={buttonLabel} onClick={onClose} />
      </div>
    </div>,
    document.body,
  );
}
