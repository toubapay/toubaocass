import { colors } from '../theme';

interface Props {
  size?: number;
  icon?: string;
}

/**
 * A small icon-in-a-circle badge with two staggered "radar ping" rings
 * expanding outward, looping forever — a lightweight "live/trending" accent
 * (e.g. next to the Anando available-rides listing). Purely decorative/
 * local state (no data behind it), so it's safe to drop anywhere.
 */
export function SearchingCarIndicator({ size = 30, icon = '🚕' }: Props) {
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
        {icon}
      </div>
    </div>
  );
}
