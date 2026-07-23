import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { cancelAnandoRide, cancelAnandoRideBooking, fetchAnandoRide, joinAnandoRide, updateAnandoRideBooking } from '../api/anando';
import { extractErrorMessage } from '../api/client';
import type { AnandoRide, PaymentMethod } from '../api/types';
import { fetchWallet } from '../api/wallet';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { WalletIcon } from '../components/WalletIcon';
import { colors, radius, spacing } from '../theme';

const sectionTitleStyle = {
  fontSize: 13,
  fontWeight: 700,
  color: colors.textMuted,
  marginBottom: spacing.xs,
  textTransform: 'uppercase' as const,
};

export function AnandoRideDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [ride, setRide] = useState<AnandoRide | null>(null);
  const [loading, setLoading] = useState(true);
  const [seats, setSeats] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [joining, setJoining] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modifySeats, setModifySeats] = useState('1');
  const [modifying, setModifying] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState(false);

  const load = () => {
    if (!id) return;
    fetchAnandoRide(Number(id))
      .then(setRide)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    fetchWallet().then((w) => setWalletBalance(w.balance)).catch(() => setWalletBalance(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (ride?.my_booking) {
      setModifySeats(String(ride.my_booking.seats_booked));
    }
  }, [ride?.my_booking?.id, ride?.my_booking?.seats_booked]);

  if (loading || !ride) {
    return <p style={{ color: colors.textMuted }}>{t('anando.loading')}</p>;
  }

  const priceTotal = ride.price_per_seat * (Number(seats) || 0);
  const insufficientWalletFunds = paymentMethod === 'wallet' && walletBalance !== null && walletBalance < priceTotal;
  const canJoin = ride.is_joinable && Number(seats) > 0 && Number(seats) <= ride.available_seats && !ride.is_mine;

  const handleJoin = async () => {
    if (!canJoin) return;
    setJoining(true);
    setError(null);
    try {
      await joinAnandoRide(ride.id, { seats: Number(seats), payment_method: paymentMethod });
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setJoining(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm(t('anando.cancelConfirm') as string)) return;
    setCancelling(true);
    try {
      await cancelAnandoRide(ride.id);
      navigate('/anando');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  const myBooking = ride.my_booking;
  const maxModifySeats = myBooking ? ride.available_seats + myBooking.seats_booked : 0;
  const canModify = myBooking != null && Number(modifySeats) > 0 && Number(modifySeats) <= maxModifySeats;

  const handleModify = async () => {
    if (!myBooking || !canModify) return;
    setModifying(true);
    setError(null);
    try {
      await updateAnandoRideBooking(myBooking.id, Number(modifySeats));
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setModifying(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!myBooking) return;
    if (!window.confirm(t('anando.cancelBookingConfirm') as string)) return;
    setCancellingBooking(true);
    try {
      await cancelAnandoRideBooking(myBooking.id);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setCancellingBooking(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        style={{ border: 'none', background: 'none', color: colors.textMuted, fontSize: 22, cursor: 'pointer', padding: 0, marginBottom: spacing.sm }}
      >
        ←
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: 2 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: colors.text, margin: 0 }}>
          {ride.origin_city?.name} → {ride.destination_city?.name}
        </h1>
      </div>
      <p style={{ fontSize: 14, color: colors.textMuted, marginTop: 0, marginBottom: spacing.md }}>
        {t(`anando.status.${ride.status}`)} · {t('anando.seatsAvailable', { count: ride.available_seats })}
      </p>

      <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md }}>
        <p style={sectionTitleStyle}>{t('anando.poster')}</p>
        <p style={{ fontSize: 17, color: colors.text, margin: 0 }}>{ride.poster.name}</p>
        <p style={{ fontSize: 14, color: colors.textMuted, margin: '2px 0 0' }}>{ride.poster.phone}</p>
        {ride.vehicle_info && <p style={{ fontSize: 14, color: colors.textMuted, margin: '4px 0 0' }}>🚗 {ride.vehicle_info}</p>}
      </div>

      {ride.departure_point && (
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md }}>
          <p style={sectionTitleStyle}>{t('anando.departurePoint')}</p>
          <p style={{ fontSize: 16, color: colors.text, margin: 0 }}>{ride.departure_point}</p>
        </div>
      )}

      <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg }}>
        <p style={sectionTitleStyle}>{t('anando.price')}</p>
        <p style={{ fontSize: 22, fontWeight: 800, color: colors.primary, margin: 0 }}>
          {t('anando.pricePerSeatValue', { amount: ride.price_per_seat.toLocaleString() })}
        </p>
        {ride.notes && <p style={{ fontSize: 14, color: colors.textMuted, margin: '6px 0 0' }}>{ride.notes}</p>}
      </div>

      {ride.is_mine ? (
        <>
          <p style={sectionTitleStyle}>{t('anando.passengers', { count: ride.bookings?.length ?? 0 })}</p>
          {(ride.bookings ?? []).length === 0 ? (
            <p style={{ color: colors.textMuted, fontSize: 14, marginBottom: spacing.lg }}>{t('anando.noPassengers')}</p>
          ) : (
            ride.bookings!.map((booking) => (
              <div key={booking.id} style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm }}>
                <p style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: 0 }}>{booking.user.name}</p>
                <p style={{ fontSize: 13.5, color: colors.textMuted, margin: '2px 0 0' }}>
                  {booking.user.phone} · {t('anando.seatsBooked', { count: booking.seats_booked })}
                </p>
              </div>
            ))
          )}
          {['open', 'full'].includes(ride.status) && (
            <Button label={t('anando.cancelRide')} onClick={handleCancel} loading={cancelling} variant="danger" style={{ marginTop: spacing.sm }} />
          )}
        </>
      ) : myBooking ? (
        <>
          <p style={sectionTitleStyle}>{t('anando.myBookingTitle')}</p>
          <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: colors.text, margin: 0 }}>
              {t('anando.seatsBooked', { count: myBooking.seats_booked })}
            </p>
            <p style={{ fontSize: 14, color: colors.textMuted, margin: '4px 0 0' }}>
              {myBooking.price_total.toLocaleString()} FCFA · {myBooking.payment_method === 'wallet' ? t('common.wallet') : t('common.cash')}
            </p>
          </div>

          {ride.status !== 'cancelled' && (
            <>
              <p style={sectionTitleStyle}>{t('anando.modifyBooking')}</p>
              <TextField
                label={t('anando.seatsToJoin')}
                type="number"
                inputMode="numeric"
                min={1}
                max={maxModifySeats}
                value={modifySeats}
                onChange={(e) => setModifySeats(e.target.value)}
              />

              {error && <p style={{ color: colors.danger, fontSize: 14, marginBottom: spacing.md }}>{error}</p>}

              <Button
                label={t('anando.modifySubmit')}
                onClick={handleModify}
                loading={modifying}
                disabled={!canModify || Number(modifySeats) === myBooking.seats_booked}
                style={{ marginBottom: spacing.sm }}
              />
              <Button label={t('anando.cancelBooking')} onClick={handleCancelBooking} loading={cancellingBooking} variant="danger" />
            </>
          )}
        </>
      ) : (
        <>
          <p style={sectionTitleStyle}>{t('anando.joinTitle')}</p>
          <TextField
            label={t('anando.seatsToJoin')}
            type="number"
            inputMode="numeric"
            min={1}
            max={ride.available_seats}
            value={seats}
            onChange={(e) => setSeats(e.target.value)}
          />

          <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.sm }}>
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
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <WalletIcon size={15} color={paymentMethod === 'wallet' ? colors.primary : colors.textMuted} detailColor={paymentMethod === 'wallet' ? colors.accentSoft : colors.surface} />
                {t('common.wallet')}
              </span>
            </button>
          </div>

          {insufficientWalletFunds && (
            <p style={{ fontSize: 12.5, color: colors.danger, marginBottom: spacing.sm }}>{t('common.insufficientFunds')}</p>
          )}

          {error && <p style={{ color: colors.danger, fontSize: 14, marginBottom: spacing.md }}>{error}</p>}

          <Button
            label={t('anando.joinSubmit', { amount: priceTotal.toLocaleString() })}
            onClick={handleJoin}
            loading={joining}
            disabled={!canJoin || insufficientWalletFunds}
          />
        </>
      )}
    </div>
  );
}
