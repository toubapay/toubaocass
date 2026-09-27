import { colors, spacing } from '../theme';
import { openNavigation } from '../utils/navigation';

/**
 * Small floating button pinned to the right edge of the screen, vertically
 * centered — always reachable regardless of scroll position, without
 * covering the bottom nav bar (ChatFab's spot) or the top header. Opens
 * Google Maps turn-by-turn navigation (voice guidance, live traffic,
 * rerouting) to the given point; the caller decides what that point is
 * (pickup vs. destination, by trip phase) and simply doesn't render this
 * when no coordinate is available yet.
 */
export function NavigateFab({ latitude, longitude, label }: { latitude: number; longitude: number; label: string }) {
  return (
    <button
      onClick={() => openNavigation(latitude, longitude)}
      aria-label={label}
      title={label}
      style={{
        position: 'fixed',
        top: '50%',
        right: 0,
        transform: 'translateY(-50%)',
        zIndex: 150,
        width: 44,
        height: 44,
        borderRadius: '50% 0 0 50%',
        border: 'none',
        borderRight: 'none',
        backgroundColor: colors.primary,
        color: '#fff',
        fontSize: 20,
        lineHeight: 1,
        boxShadow: '-3px 3px 12px rgba(19, 26, 23, 0.28)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingRight: spacing.xs,
      }}
    >
      🧭
    </button>
  );
}
