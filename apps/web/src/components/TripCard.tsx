import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Trip } from '../api/types';
import { colors, radius, spacing } from '../theme';
import { bookingFillState, FILL_STATE_LABEL, formatDuration, RIDE_TYPE_LABEL } from '../utils/trip';
import { BookingQuickActionModal } from './BookingQuickActionModal';
import { TripUrgencyBadge } from './TripUrgencyBadge';

const FILL_STATE_STYLE: Record<string, { bg: string; fg: string }> = {
  open: { bg: colors.successSoft, fg: colors.success },
  filling: { bg: colors.accentSoft, fg: colors.accent },
  full: { bg: colors.dangerSoft, fg: colors.danger },
};

export function TripCard({ trip, onTripUpdated }: { trip: Trip; onTripUpdated?: (trip: Trip) => void }) {
  const navigate = useNavigate();
  const fillState = bookingFillState(trip);
  const fillStyle = FILL_STATE_STYLE[fillState];
  const [showQuickAction, setShowQuickAction] = useState(false);
  const booked = trip.my_booking != null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/trips/${trip.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') navigate(`/trips/${trip.id}`);
      }}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: spacing.md,
        marginBottom: spacing.md,
        border: `1px solid ${colors.border}`,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xs }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: colors.text }}>{trip.origin_city?.name}</span>
          <span style={{ margin: `0 ${spacing.sm}px`, color: colors.textMuted }}>→</span>
          <span style={{ fontSize: 17, fontWeight: 700, color: colors.text }}>{trip.destination_city?.name}</span>
        </div>
        <span
          style={{
            borderRadius: 999,
            padding: '3px 8px',
            marginLeft: spacing.sm,
            backgroundColor: fillStyle.bg,
            color: fillStyle.fg,
            fontSize: 11,
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {FILL_STATE_LABEL[fillState]}
        </span>
      </div>

      {trip.route_distance_km !== null && (
        <p style={{ fontSize: 12, color: colors.textMuted, margin: `0 0 ${spacing.xs}px` }}>
          🛣️ {trip.route_distance_km} km
          {trip.route_duration_minutes !== null && ` · ~${formatDuration(trip.route_duration_minutes)}`}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', marginBottom: spacing.sm, fontSize: 13, color: colors.textMuted }}>
        <span>{trip.departure_date}</span>
        <span style={{ margin: `0 ${spacing.xs}px` }}>•</span>
        <span>{trip.departure_time}</span>
        <span style={{ margin: `0 ${spacing.xs}px` }}>•</span>
        <span>{RIDE_TYPE_LABEL[trip.ride_type] ?? trip.ride_type}</span>
        {trip.distance_km !== undefined && (
          <>
            <span style={{ margin: `0 ${spacing.xs}px` }}>•</span>
            <span style={{ color: colors.accent, fontWeight: 700 }}>
              {trip.distance_km < 1 ? 'à < 1 km' : `à ${trip.distance_km} km`}
            </span>
          </>
        )}
      </div>
      {trip.departure_address && (
        <p style={{ fontSize: 12, color: colors.textMuted, margin: `2px 0 ${spacing.xs}px` }}>📍 {trip.departure_address}</p>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, color: colors.text }}>
          {trip.driver.name ?? 'Conducteur'} · {trip.car?.make} {trip.car?.model}
        </span>
        <span style={{ fontSize: 16, fontWeight: 700, color: colors.primary }}>{trip.fare.toLocaleString()} FCFA</span>
      </div>

      <p style={{ fontSize: 12, color: colors.textMuted, marginTop: spacing.xs, marginBottom: 0, fontWeight: 600 }}>
        {trip.available_seats} place(s) disponible(s) sur {trip.total_seats}
      </p>

      <TripUrgencyBadge trip={trip} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm }}>
        {booked ? (
          <span style={{ fontSize: 12, fontWeight: 700, color: colors.success }}>
            ✓ Réservé · {trip.my_booking!.seats_booked} place(s)
          </span>
        ) : (
          <span />
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowQuickAction(true);
          }}
          style={{
            border: `1.5px solid ${colors.primary}`,
            borderRadius: radius.sm,
            padding: '8px 16px',
            backgroundColor: booked ? 'transparent' : colors.primary,
            color: booked ? colors.primary : '#fff',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {booked ? 'Modifier' : 'Réserver'}
        </button>
      </div>

      {showQuickAction && (
        <BookingQuickActionModal
          trip={trip}
          onClose={() => setShowQuickAction(false)}
          onSuccess={(updatedTrip) => onTripUpdated?.(updatedTrip)}
        />
      )}
    </div>
  );
}
