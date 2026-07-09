import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { cancelBooking, fetchMyBookings } from '../api/bookings';
import { extractErrorMessage } from '../api/client';
import type { Booking } from '../api/types';
import { CenteredSpinner } from '../components/Spinner';
import { colors, radius, spacing } from '../theme';

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmée',
  cancelled: 'Annulée',
};

export function MyBookingsPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchMyBookings()
      .then((res) => setBookings(res.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const handleCancel = async (booking: Booking) => {
    if (!confirm('Voulez-vous vraiment annuler cette réservation ?')) return;
    try {
      await cancelBooking(booking.id);
      load();
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  if (loading) return <CenteredSpinner />;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>Mes réservations</h1>

      {bookings.length === 0 ? (
        <div style={{ marginTop: spacing.xl, textAlign: 'center' }}>
          <p style={{ color: colors.textMuted, fontSize: 15 }}>Vous n'avez pas encore de réservation. Recherchez un trajet pour commencer.</p>
        </div>
      ) : (
        bookings.map((item) => (
          <div
            key={item.id}
            onClick={() => navigate(`/trips/${item.trip.id}`)}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: spacing.md,
              marginBottom: spacing.md,
              border: `1px solid ${colors.border}`,
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>
                {item.trip.origin_city?.name} → {item.trip.destination_city?.name}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: item.status === 'cancelled' ? colors.danger : colors.success }}>
                {STATUS_LABEL[item.status]}
              </span>
            </div>
            <p style={{ fontSize: 13, color: colors.textMuted, marginTop: spacing.xs, marginBottom: 0 }}>
              {item.trip.departure_date} à {item.trip.departure_time} · {item.seats_booked} place(s)
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: colors.primary, marginTop: spacing.xs, marginBottom: 0 }}>
              {item.fare_total.toLocaleString()} FCFA
            </p>

            {item.status === 'confirmed' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancel(item);
                }}
                style={{ border: 'none', background: 'none', color: colors.danger, fontWeight: 600, cursor: 'pointer', padding: 0, marginTop: spacing.sm, fontSize: 14 }}
              >
                Annuler la réservation
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
