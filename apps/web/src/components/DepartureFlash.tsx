import { colors, radius, spacing } from '../theme';

export function DepartureFlash() {
  return (
    <span
      style={{
        display: 'inline-block',
        backgroundColor: colors.dangerSoft,
        color: colors.danger,
        borderRadius: radius.sm,
        padding: `3px ${spacing.sm}px`,
        fontSize: 12.5,
        fontWeight: 700,
        marginTop: spacing.xs,
        animation: 'pulse 1.3s ease-in-out infinite',
      }}
    >
      ⚡ Départ imminent
    </span>
  );
}
