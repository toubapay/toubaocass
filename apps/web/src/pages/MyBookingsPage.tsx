import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { cancelBooking, fetchMyBookings } from '../api/bookings';
import { extractErrorMessage } from '../api/client';
import type { Booking, Trip } from '../api/types';
import { BookingQuickActionModal } from '../components/BookingQuickActionModal';
import { CenteredSpinner } from '../components/Spinner';
import { colors, radius, spacing } from '../theme';

export function MyBookingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [modifyingBookingId, setModifyingBookingId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchMyBookings()
      .then((res) => setBookings(res.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const handleCancel = async (booking: Booking) => {
    if (!confirm(t('myBookings.cancelConfirm'))) return;
    try {
      await cancelBooking(booking.id);
      load();
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  const handleTripUpdated = (bookingId: number, updatedTrip: Trip) => {
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id !== bookingId) return b;
        if (updatedTrip.my_booking) {
          return {
            ...b,
            trip: updatedTrip,
            seats_booked: updatedTrip.my_booking.seats_booked,
            fare_total: updatedTrip.my_booking.fare_total,
            status: updatedTrip.my_booking.status,
          };
        }
        return { ...b, status: 'cancelled' };
      }),
    );
  };

  if (loading) return <CenteredSpinner />;

  const modifyingBooking = bookings.find((b) => b.id === modifyingBookingId);

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>{t('myBookings.title')}</h1>

      {bookings.length === 0 ? (
        <div style={{ marginTop: spacing.xl, textAlign: 'center' }}>
          <p style={{ color: colors.textMuted, fontSize: 16 }}>{t('myBookings.empty')}</p>
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
              <span style={{ fontSize: 18, fontWeight: 700, color: colors.text }}>
                {item.trip.origin_city?.name} → {item.trip.destination_city?.name}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: item.status === 'cancelled' ? colors.danger : colors.success }}>
                {item.status === 'cancelled' ? t('myBookings.statusCancelled') : t('myBookings.statusConfirmed')}
              </span>
            </div>
            <p style={{ fontSize: 14, color: colors.textMuted, marginTop: spacing.xs, marginBottom: 0 }}>
              {t('myBookings.departureAt', { date: item.trip.departure_date, time: item.trip.departure_time, seats: item.seats_booked })}
            </p>
            <p style={{ fontSize: 16, fontWeight: 700, color: colors.primary, marginTop: spacing.xs, marginBottom: 0 }}>
              {item.fare_total.toLocaleString()} FCFA
            </p>

            {item.status === 'confirmed' && (
              <div style={{ display: 'flex', gap: spacing.md, marginTop: spacing.sm, flexWrap: 'wrap' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/chat/${item.id}`, {
                      state: {
                        title: item.trip.driver.name ?? t('common.driverFallback'),
                        subtitle: `${item.trip.origin_city?.name} → ${item.trip.destination_city?.name}`,
                      },
                    });
                  }}
                  style={{ border: 'none', background: 'none', color: colors.primary, fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 15 }}
                >
                  {t('myBookings.chat')}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setModifyingBookingId(item.id);
                  }}
                  style={{ border: 'none', background: 'none', color: colors.primary, fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 15 }}
                >
                  {t('myBookings.modify')}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancel(item);
                  }}
                  style={{ border: 'none', background: 'none', color: colors.danger, fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 15 }}
                >
                  {t('myBookings.cancel')}
                </button>
              </div>
            )}
          </div>
        ))
      )}

      {modifyingBooking && (
        <BookingQuickActionModal
          trip={{
            ...modifyingBooking.trip,
            my_booking: {
              id: modifyingBooking.id,
              seats_booked: modifyingBooking.seats_booked,
              fare_total: modifyingBooking.fare_total,
              status: modifyingBooking.status,
            },
          }}
          onClose={() => setModifyingBookingId(null)}
          onSuccess={(updatedTrip) => {
            handleTripUpdated(modifyingBooking.id, updatedTrip);
            setModifyingBookingId(null);
          }}
        />
      )}
    </div>
  );
}
