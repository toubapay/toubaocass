import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import {
  cancelAnandoRide,
  cancelAnandoRideBooking,
  completeAnandoRide,
  fetchAnandoRide,
  joinAnandoRide,
  rateAnandoRide,
  startAnandoRide,
  updateAnandoRideBooking,
  updateAnandoRideLocation,
} from '../api/anando';
import { extractErrorMessage } from '../api/client';
import type { AnandoRide, PaymentMethod } from '../api/types';
import { fetchWallet } from '../api/wallet';
import { AnandoLiveMap } from '../components/AnandoLiveMap';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { WalletIcon } from '../components/WalletIcon';
import { colors, radius, spacing } from '../theme';

const LIVE_LOCATION_INTERVAL_MS = 12000;

const sectionTitleStyle = {
  fontSize: 13,
  fontWeight: 700,
  color: colors.textMuted,
  marginBottom: spacing.xs,
  textTransform: 'uppercase' as const,
};

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: spacing.sm }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} ★`}
          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, fontSize: 26, lineHeight: 1, color: n <= value ? colors.primary : colors.border }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function RatingBox({
  rideId,
  rateeId,
  existing,
  onSubmitted,
}: {
  rideId: number;
  rateeId: number;
  existing?: { score: number; comment: string | null };
  onSubmitted: () => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(!existing);
  const [score, setScore] = useState(existing?.score ?? 5);
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!editing && existing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs }}>
        <span style={{ fontSize: 13.5, color: colors.text, fontWeight: 600 }}>{t('anando.alreadyRated', { score: existing.score })}</span>
        <button
          onClick={() => setEditing(true)}
          style={{ border: 'none', background: 'none', color: colors.primary, fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}
        >
          {t('anando.editReview')}
        </button>
      </div>
    );
  }

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await rateAnandoRide(rideId, { ratee_id: rateeId, score, comment: comment.trim() || undefined });
      setEditing(false);
      onSubmitted();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ marginTop: spacing.sm, paddingTop: spacing.sm, borderTop: `1px solid ${colors.border}` }}>
      <p style={{ fontSize: 12.5, fontWeight: 700, color: colors.textMuted, margin: `0 0 ${spacing.xs}px` }}>{t('anando.yourRating')}</p>
      <StarPicker value={score} onChange={setScore} />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t('anando.commentPlaceholder')}
        rows={2}
        style={{
          width: '100%',
          border: `1px solid ${colors.border}`,
          borderRadius: radius.sm,
          padding: spacing.sm,
          fontSize: 13.5,
          fontFamily: 'inherit',
          resize: 'vertical',
          marginBottom: spacing.sm,
        }}
      />
      {error && <p style={{ color: colors.danger, fontSize: 12.5, marginBottom: spacing.sm }}>{error}</p>}
      <Button label={t('anando.submitRating')} onClick={handleSubmit} loading={submitting} />
    </div>
  );
}

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
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);
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

  // While the ride is under way, every viewer (poster included) polls for
  // the latest reported position rather than holding a live connection —
  // same "recent position on an interval" honesty as the admin live map.
  useEffect(() => {
    if (ride?.status !== 'in_progress') return;
    const interval = setInterval(load, LIVE_LOCATION_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride?.status, id]);

  // Only the poster's own device reports its position — foreground-only,
  // while this page is open, no background tracking.
  useEffect(() => {
    if (!ride?.is_mine || ride.status !== 'in_progress') return;
    if (!('geolocation' in navigator)) return;

    const rideId = ride.id;
    const report = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateAnandoRideLocation(rideId, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: false, timeout: 10000 },
      );
    };
    report();
    const interval = setInterval(report, LIVE_LOCATION_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [ride?.is_mine, ride?.status, ride?.id]);

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

  const handleStart = async () => {
    setStarting(true);
    setError(null);
    try {
      await startAnandoRide(ride.id);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setStarting(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    setError(null);
    try {
      await completeAnandoRide(ride.id);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setCompleting(false);
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

      {ride.status === 'in_progress' && (
        ride.current_latitude != null && ride.current_longitude != null ? (
          <AnandoLiveMap
            currentLatitude={ride.current_latitude}
            currentLongitude={ride.current_longitude}
            destinationLatitude={ride.destination_city?.latitude}
            destinationLongitude={ride.destination_city?.longitude}
            destinationName={ride.destination_city?.name}
            updatedAt={ride.current_location_updated_at}
          />
        ) : (
          <p style={{ fontSize: 13.5, color: colors.textMuted, marginBottom: spacing.md }}>{t('anando.liveMapWaiting')}</p>
        )
      )}

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
        {ride.poster.anando_ratings_count > 0 && (
          <p style={{ fontSize: 13, color: colors.textMuted, margin: '4px 0 0' }}>
            ★ {ride.poster.anando_rating?.toFixed(1)} ({ride.poster.anando_ratings_count})
          </p>
        )}
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
                {ride.status === 'completed' && booking.status === 'confirmed' && (
                  <RatingBox
                    rideId={ride.id}
                    rateeId={booking.user.id}
                    existing={ride.my_ratings_given?.find((r) => r.ratee_id === booking.user.id)}
                    onSubmitted={load}
                  />
                )}
              </div>
            ))
          )}
          {['open', 'full'].includes(ride.status) && (
            <>
              <Button label={t('anando.startTrip')} onClick={handleStart} loading={starting} style={{ marginBottom: spacing.sm }} />
              <Button label={t('anando.cancelRide')} onClick={handleCancel} loading={cancelling} variant="danger" />
            </>
          )}
          {ride.status === 'in_progress' && (
            <Button label={t('anando.completeTrip')} onClick={handleComplete} loading={completing} />
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

          {!['cancelled', 'in_progress', 'completed'].includes(ride.status) && (
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

          {ride.status === 'completed' && myBooking.status === 'confirmed' && (
            <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.md }}>
              <p style={sectionTitleStyle}>{t('anando.rateSectionTitle')}</p>
              <RatingBox
                rideId={ride.id}
                rateeId={ride.poster.id}
                existing={ride.my_ratings_given?.find((r) => r.ratee_id === ride.poster.id)}
                onSubmitted={load}
              />
            </div>
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
