import { colors } from '../theme';

interface Props {
  size?: number;
}

/**
 * A small car-in-a-circle badge with two staggered "radar ping" rings
 * expanding outward, looping forever — a lightweight stand-in for a
 * dispatch animation while a Dem Légui request is searching for a driver.
 * Purely decorative/local state (no data behind it), so it's safe to drop
 * next to any "searching…" label.
 */
export function SearchingCarIndicator({ size = 30 }: Props) {
  const ringStyle = (delay: string) =>
    ({
      position: 'absolute' as const,
      inset: 0,
      borderRadius: '50%',
      border: `2px solid ${colors.primary}`,
      animation: 'radar-ping 1.6s ease-out infinite',
      animationDelay: delay,
    });

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <span style={ringStyle('0s')} />
      <span style={ringStyle('0.8s')} />
      <div
        style={{
          position: 'relative',
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: colors.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.55,
        }}
      >
        🚕
      </div>
    </div>
  );
}
