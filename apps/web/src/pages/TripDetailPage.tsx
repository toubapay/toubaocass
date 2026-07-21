import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { bookTrip, updateBooking } from '../api/bookings';
import { extractErrorMessage } from '../api/client';
import { fetchTrip } from '../api/trips';
import type { PaymentMethod, Trip } from '../api/types';
import { fetchWallet } from '../api/wallet';
import { Button } from '../components/Button';
import { RouteMap } from '../components/RouteMap';
import { CenteredSpinner } from '../components/Spinner';
import { TripUrgencyBadge } from '../components/TripUrgencyBadge';
import { WalletIcon } from '../components/WalletIcon';
import { colors, radius, spacing } from '../theme';
import { formatDuration, hasDeparted } from '../utils/trip';

export function TripDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [seats, setSeats] = useState(1);
  const [booking, setBooking] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    fetchWallet().then((w) => setWalletBalance(w.balance)).catch(() => setWalletBalance(null));
  }, []);

  const load = () => {
    if (!id) return;
    setLoading(true);
    fetchTrip(Number(id))
      .then((fetched) => {
        setTrip(fetched);
        setSeats(fetched.my_booking?.seats_booked ?? 1);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const editing = trip?.my_booking != null;

  const handleBook = async () => {
    if (!trip) return;
    setBooking(true);
    try {
      if (editing) {
        await updateBooking(trip.my_booking!.id, seats);
        if (seats === 0) {
          alert(t('tripDetail.bookingCancelledAlert'));
          navigate('/bookings');
          return;
        }
        alert(t('tripDetail.bookingUpdatedAlert'));
        load();
      } else {
        await bookTrip(trip.id, seats, paymentMethod);
        alert(t('tripDetail.bookingConfirmedAlert', { count: seats }));
        navigate('/bookings');
      }
    } catch (err) {
      alert(extractErrorMessage(err));
      load();
    } finally {
      setBooking(false);
    }
  };

  if (loading || !trip) {
    return <CenteredSpinner />;
  }

  const tripDeparted = hasDeparted(trip);
  const isUnavailable = tripDeparted
    || (editing
      ? !['scheduled', 'full'].includes(trip.status)
      : trip.available_seats <= 0 || trip.status !== 'scheduled');
  const maxSeats = editing ? trip.available_seats + (trip.my_booking?.seats_booked ?? 0) : trip.available_seats;
  const insufficientWalletFunds =
    !editing && paymentMethod === 'wallet' && walletBalance !== null && walletBalance < trip.fare * seats;
  const hasPin = trip.departure_latitude !== null && trip.departure_longitude !== null;

  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    border: `1px solid ${colors.border}`,
  };
  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    margin: `0 0 ${spacing.xs}px`,
  };

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        style={{ border: 'none', background: 'none', color: colors.textMuted, fontSize: 22, cursor: 'pointer', padding: 0, marginBottom: spacing.sm }}
      >
        ←
      </button>

      <div style={{ display: 'flex', alignItems: 'center', marginTop: spacing.sm }}>
        <span style={{ fontSize: 24, fontWeight: 800, color: colors.text }}>{trip.origin_city?.name}</span>
        <span style={{ margin: `0 ${spacing.sm}px`, color: colors.textMuted, fontSize: 20 }}>→</span>
        <span style={{ fontSize: 24, fontWeight: 800, color: colors.text }}>{trip.destination_city?.name}</span>
      </div>
      <p style={{ color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg }}>
        {t('tripDetail.departureAt', { date: trip.departure_date, time: trip.departure_time })}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm }}>
        <TripUrgencyBadge trip={trip} />
        {!editing && !isUnavailable && (
          <button
            onClick={handleBook}
            disabled={booking || insufficientWalletFunds}
            style={{
              border: 'none',
              borderRadius: radius.sm,
              padding: `${spacing.xs}px ${spacing.md}px`,
              backgroundColor: colors.primary,
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              cursor: booking || insufficientWalletFunds ? 'default' : 'pointer',
              opacity: booking || insufficientWalletFunds ? 0.6 : 1,
              marginBottom: spacing.sm,
            }}
          >
            {booking ? '…' : t('tripDetail.reserveButton', { amount: (trip.fare * seats).toLocaleString() })}
          </button>
        )}
      </div>
      {editing && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: colors.success, margin: 0 }}>
            {t('tripDetail.bookedSeats', { count: trip.my_booking!.seats_booked })}
          </p>
          <button
            onClick={() =>
              navigate(`/chat/${trip.my_booking!.id}`, {
                state: {
                  title: trip.driver.name ?? t('common.driverFallback'),
                  subtitle: `${trip.origin_city?.name} → ${trip.destination_city?.name}`,
                },
              })
            }
            style={{
              border: `1px solid ${colors.primary}`,
              borderRadius: radius.sm,
              padding: `${spacing.xs}px ${spacing.md}px`,
              backgroundColor: 'transparent',
              color: colors.primary,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {t('tripDetail.chatWithDriver')}
          </button>
        </div>
      )}

      {trip.route_distance_km !== null && (
        <div style={cardStyle}>
          <p style={sectionTitleStyle}>{t('tripDetail.itinerary')}</p>
          <p style={{ fontSize: 18, color: colors.text, margin: 0 }}>
            🛣️ {trip.route_distance_km} km
            {trip.route_duration_minutes !== null && t('tripDetail.drivingDuration', { duration: formatDuration(trip.route_duration_minutes) })}
          </p>
          <div style={{ marginTop: spacing.sm }}>
            <RouteMap trip={trip} />
          </div>
        </div>
      )}

      {hasPin && (
        <div style={cardStyle}>
          <p style={sectionTitleStyle}>{t('tripDetail.departurePoint')}</p>
          {trip.departure_address && <p style={{ fontSize: 18, color: colors.text, margin: 0 }}>{trip.departure_address}</p>}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${trip.departure_latitude},${trip.departure_longitude}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: colors.primary, fontWeight: 700, fontSize: 14, marginTop: spacing.sm, display: 'inline-block' }}
          >
            {t('common.openInMaps')}
          </a>
        </div>
      )}

      <div style={cardStyle}>
        <p style={sectionTitleStyle}>{t('tripDetail.driverSection')}</p>
        <p style={{ fontSize: 18, color: colors.text, margin: 0 }}>{trip.driver.name ?? t('common.driverFallback')}</p>
        <p style={{ fontSize: 14, color: colors.textMuted, margin: '2px 0 0' }}>{t('tripDetail.ratingLabel', { rating: trip.driver.rating?.toFixed(1) ?? '5.0' })}</p>
        <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.sm }}>
          <a
            href={`tel:${trip.driver.phone}`}
            style={{
              flex: 1,
              textAlign: 'center',
              border: `1px solid ${colors.primary}`,
              borderRadius: radius.sm,
              padding: `${spacing.sm}px 0`,
              color: colors.primary,
              fontWeight: 700,
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            📞 {t('common.call')}
          </a>
          <a
            href={`sms:${trip.driver.phone}`}
            style={{
              flex: 1,
              textAlign: 'center',
              border: `1px solid ${colors.primary}`,
              borderRadius: radius.sm,
              padding: `${spacing.sm}px 0`,
              color: colors.primary,
              fontWeight: 700,
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            💬 {t('common.sms')}
          </a>
        </div>
      </div>

      <div style={cardStyle}>
        <p style={sectionTitleStyle}>{t('tripDetail.vehicle')}</p>
        <p style={{ fontSize: 18, color: colors.text, margin: 0 }}>
          {trip.car?.make} {trip.car?.model} · {trip.car?.color}
        </p>
        <p style={{ fontSize: 14, color: colors.textMuted, margin: '2px 0 0' }}>{trip.ride_type.toUpperCase()}</p>
      </div>

      <div style={cardStyle}>
        <p style={sectionTitleStyle}>{t('tripDetail.fare')}</p>
        <p style={{ fontSize: 22, fontWeight: 800, color: colors.primary, margin: 0 }}>{t('tripDetail.farePerSeat', { amount: trip.fare.toLocaleString() })}</p>
        <p style={{ fontSize: 14, color: colors.textMuted, margin: '2px 0 0' }}>
          {t('tripDetail.seatsRemaining', { available: trip.available_seats, total: trip.total_seats })}
        </p>
      </div>

      {trip.notes && (
        <div style={cardStyle}>
          <p style={sectionTitleStyle}>{t('tripDetail.notes')}</p>
          <p style={{ fontSize: 18, color: colors.text, margin: 0 }}>{trip.notes}</p>
        </div>
      )}

      {!editing && !isUnavailable && (
        <div style={{ marginBottom: spacing.lg }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: colors.text, display: 'block', marginBottom: spacing.sm }}>
            {t('tripDetail.paymentMethod')}
          </span>
          <div style={{ display: 'flex', gap: spacing.sm }}>
            <button
              onClick={() => setPaymentMethod('cash')}
              style={{
                flex: 1,
                border: `1.5px solid ${paymentMethod === 'cash' ? colors.primary : colors.border}`,
                borderRadius: radius.md,
                padding: spacing.sm,
                backgroundColor: paymentMethod === 'cash' ? colors.accentSoft : colors.surface,
                color: paymentMethod === 'cash' ? colors.primary : colors.textMuted,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              💵 {t('common.cash')}
            </button>
            <button
              onClick={() => setPaymentMethod('wallet')}
              style={{
                flex: 1,
                border: `1.5px solid ${paymentMethod === 'wallet' ? colors.primary : colors.border}`,
                borderRadius: radius.md,
                padding: spacing.sm,
                backgroundColor: paymentMethod === 'wallet' ? colors.accentSoft : colors.surface,
                color: paymentMethod === 'wallet' ? colors.primary : colors.textMuted,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <WalletIcon
                  size={15}
                  color={paymentMethod === 'wallet' ? colors.primary : colors.textMuted}
                  detailColor={paymentMethod === 'wallet' ? colors.accentSoft : colors.surface}
                />
                {t('tripDetail.walletWithBalance', { balance: walletBalance !== null ? `(${walletBalance.toLocaleString()} F)` : '' })}
              </span>
            </button>
          </div>
          {paymentMethod === 'wallet' && walletBalance !== null && walletBalance < trip.fare * seats && (
            <p style={{ fontSize: 12.5, color: colors.danger, marginTop: spacing.xs, marginBottom: 0 }}>
              {t('common.insufficientFunds')}{' '}
              <button
                onClick={() => navigate('/wallet')}
                style={{ border: 'none', background: 'none', color: colors.danger, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: 12.5 }}
              >
                {t('tripDetail.topUpLink')}
              </button>
            </p>
          )}
        </div>
      )}

      {isUnavailable ? (
        <p style={{ color: colors.danger, textAlign: 'center', marginBottom: spacing.md }}>
          {tripDeparted ? t('tripDetail.tripDeparted') : t('tripDetail.tripUnavailable')}
        </p>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: colors.text }}>
            {editing ? t('tripDetail.seatsCountEditing') : t('tripDetail.seatsCountBooking')}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <button
              onClick={() => setSeats((s) => Math.max(editing ? 0 : 1, s - 1))}
              style={{ width: 44, minHeight: 44, border: `1.5px solid ${colors.primary}`, borderRadius: radius.md, background: 'none', color: colors.primary, fontSize: 20, fontWeight: 700, cursor: 'pointer' }}
            >
              -
            </button>
            <span style={{ fontSize: 20, fontWeight: 700, color: colors.text, minWidth: 24, textAlign: 'center' }}>{seats}</span>
            <button
              onClick={() => setSeats((s) => Math.min(maxSeats, s + 1))}
              style={{ width: 44, minHeight: 44, border: `1.5px solid ${colors.primary}`, borderRadius: radius.md, background: 'none', color: colors.primary, fontSize: 20, fontWeight: 700, cursor: 'pointer' }}
            >
              +
            </button>
          </div>
        </div>
      )}

      {editing && seats === 0 && !isUnavailable && (
        <p style={{ fontSize: 13, color: colors.danger, marginTop: -spacing.md, marginBottom: spacing.md }}>
          {t('tripDetail.reduceToZeroWarning')}
        </p>
      )}

      <Button
        label={
          editing
            ? seats === 0
              ? t('tripDetail.cancelReservation')
              : t('tripDetail.saveForAmount', { amount: (trip.fare * seats).toLocaleString() })
            : t('tripDetail.bookForAmount', { amount: (trip.fare * seats).toLocaleString() })
        }
        onClick={handleBook}
        loading={booking}
        disabled={isUnavailable || insufficientWalletFunds}
        variant={editing && seats === 0 ? 'danger' : 'primary'}
      />
    </div>
  );
}
