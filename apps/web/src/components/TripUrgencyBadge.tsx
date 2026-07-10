import type { Trip } from '../api/types';
import { colors, radius, spacing } from '../theme';
import { isUrgent } from '../utils/trip';

/**
 * Always-visible trip-detail badge: calm green when the trip still has
 * seats, pulsing red when departure is imminent or only one seat remains.
 */
export function TripUrgencyBadge({ trip }: { trip: Trip }) {
  if (trip.status !== 'scheduled' || trip.available_seats <= 0) return null;

  const urgent = isUrgent(trip);

  return (
    <span
      style={{
        display: 'inline-block',
        backgroundColor: urgent ? colors.dangerSoft : colors.successSoft,
        color: urgent ? colors.danger : colors.success,
        borderRadius: radius.sm,
        padding: `3px ${spacing.sm}px`,
        fontSize: 11.5,
        fontWeight: 700,
        marginTop: spacing.xs,
        marginBottom: spacing.sm,
        animation: urgent ? 'pulse 1.3s ease-in-out infinite' : 'none',
      }}
    >
      {urgent ? '⚡ Départ imminent' : '🟢 Places disponibles'}
    </span>
  );
}
