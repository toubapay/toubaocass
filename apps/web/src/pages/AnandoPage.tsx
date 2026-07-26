import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import {
  completeAnandoRide,
  fetchMyAnandoBookings,
  fetchMyAnandoRides,
  fetchAnandoRides,
  postAnandoRide,
  startAnandoRide,
} from '../api/anando';
import { extractErrorMessage } from '../api/client';
import { fetchCities } from '../api/cities';
import type { AnandoRide, AnandoRideBooking, City } from '../api/types';
import { Button } from '../components/Button';
import { CityPicker } from '../components/CityPicker';
import { SearchingCarIndicator } from '../components/SearchingCarIndicator';
import { SuccessModal } from '../components/SuccessModal';
import { TextField } from '../components/TextField';
import { colors, radius, spacing } from '../theme';
import { isAnandoRideStale } from '../utils/anando';

const sectionTitleStyle = {
  fontSize: 13,
  fontWeight: 700,
  color: colors.textMuted,
  marginBottom: spacing.sm,
  textTransform: 'uppercase' as const,
};

function RideCard({ ride, onClick }: { ride: AnandoRide; onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        padding: spacing.md,
        backgroundColor: colors.surface,
        marginBottom: spacing.sm,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 17, fontWeight: 700, color: colors.text }}>
          {ride.origin_city?.name} → {ride.destination_city?.name}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 9px',
            borderRadius: 999,
            backgroundColor: ride.status === 'open' ? colors.successSoft : colors.accentSoft,
            color: ride.status === 'open' ? colors.success : colors.accent,
          }}
        >
          {t(`anando.status.${ride.status}`)}
        </span>
      </div>
      <p style={{ fontSize: 13.5, color: colors.textMuted, margin: '4px 0 0' }}>
        {ride.poster.name} · {t('anando.seatsAvailable', { count: ride.available_seats })}
      </p>
      {ride.departure_point && (
        <p style={{ fontSize: 13, color: colors.textMuted, margin: '2px 0 0' }}>📍 {ride.departure_point}</p>
      )}
      <p style={{ fontSize: 16, fontWeight: 700, color: colors.primary, margin: '6px 0 0' }}>
        {t('anando.pricePerSeatValue', { amount: ride.price_per_seat.toLocaleString() })}
      </p>
    </button>
  );
}

function BookingCard({ booking, onClick }: { booking: AnandoRideBooking; onClick: () => void }) {
  const { t } = useTranslation();
  const ride = booking.anando_ride;
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        padding: spacing.md,
        backgroundColor: colors.surface,
        marginBottom: spacing.sm,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 17, fontWeight: 700, color: colors.text }}>
          {ride.origin_city?.name} → {ride.destination_city?.name}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 9px',
            borderRadius: 999,
            backgroundColor: booking.status === 'confirmed' ? colors.accentSoft : colors.dangerSoft,
            color: booking.status === 'confirmed' ? colors.accent : colors.danger,
          }}
        >
          {t(`anando.bookingStatus.${booking.status}`)}
        </span>
      </div>
      <p style={{ fontSize: 13.5, color: colors.textMuted, margin: '4px 0 0' }}>
        {t('anando.seatsBooked', { count: booking.seats_booked })}
      </p>
      <p style={{ fontSize: 16, fontWeight: 700, color: colors.primary, margin: '6px 0 0' }}>
        {booking.price_total.toLocaleString()} FCFA
      </p>
    </button>
  );
}

type Tab = 'available' | 'mine';

interface AnandoLocationState {
  initialTab?: Tab;
}

const ACTIVE_RIDE_STATUSES = ['open', 'full', 'in_progress'];

export function AnandoPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const initialTab = (location.state as AnandoLocationState | null)?.initialTab;

  const [tab, setTab] = useState<Tab>(initialTab ?? 'available');
  const [cities, setCities] = useState<City[]>([]);
  const [rides, setRides] = useState<AnandoRide[]>([]);
  const [myRides, setMyRides] = useState<AnandoRide[]>([]);
  const [myBookings, setMyBookings] = useState<AnandoRideBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const [origin, setOrigin] = useState<City | null>(null);
  const [destination, setDestination] = useState<City | null>(null);
  const [departurePoint, setDeparturePoint] = useState('');
  const [pricePerSeat, setPricePerSeat] = useState('');
  const [seats, setSeats] = useState('3');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postedRideId, setPostedRideId] = useState<number | null>(null);
  const [rideActionLoading, setRideActionLoading] = useState(false);

  const activeRide = myRides.find((ride) => ACTIVE_RIDE_STATUSES.includes(ride.status) && !isAnandoRideStale(ride));

  const load = () => {
    Promise.all([fetchAnandoRides(), fetchMyAnandoRides(), fetchMyAnandoBookings()])
      .then(([available, mine, bookings]) => {
        setRides(available.data.filter((ride) => !isAnandoRideStale(ride)));
        setMyRides(mine.data);
        setMyBookings(bookings.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCities().then(setCities);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit =
    origin != null &&
    destination != null &&
    origin.id !== destination.id &&
    Number(pricePerSeat) > 0 &&
    Number(seats) > 0;

  const handleSubmit = async () => {
    if (!canSubmit || !origin || !destination) return;
    setPosting(true);
    setError(null);
    try {
      const ride = await postAnandoRide({
        origin_city_id: origin.id,
        destination_city_id: destination.id,
        departure_point: departurePoint.trim() || undefined,
        price_per_seat: Number(pricePerSeat),
        total_seats: Number(seats),
      });
      setOrigin(null);
      setDestination(null);
      setDeparturePoint('');
      setPricePerSeat('');
      setSeats('3');
      setPostedRideId(ride.id);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setPosting(false);
    }
  };

  const handleStartActiveRide = async () => {
    if (!activeRide) return;
    setRideActionLoading(true);
    setError(null);
    try {
      await startAnandoRide(activeRide.id);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setRideActionLoading(false);
    }
  };

  const handleCompleteActiveRide = async () => {
    if (!activeRide) return;
    setRideActionLoading(true);
    setError(null);
    try {
      await completeAnandoRide(activeRide.id);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setRideActionLoading(false);
    }
  };

  const tabButtonStyle = (active: boolean) => ({
    flex: 1,
    border: 'none',
    borderBottom: `2.5px solid ${active ? colors.primary : 'transparent'}`,
    borderRadius: 0,
    padding: `${spacing.sm}px 0`,
    backgroundColor: 'transparent',
    color: active ? colors.primary : colors.textMuted,
    fontWeight: 700,
    fontSize: 14.5,
    cursor: 'pointer',
  });

  return (
    <div>
      <button
        onClick={() => navigate('/services')}
        style={{ border: 'none', background: 'none', color: colors.textMuted, fontSize: 22, cursor: 'pointer', padding: 0, marginBottom: spacing.sm }}
      >
        ←
      </button>

      <h1 style={{ fontSize: 25, fontWeight: 700, color: colors.text, marginBottom: 2 }}>{t('anando.title')}</h1>
      <p style={{ fontSize: 14, color: colors.textMuted, marginTop: 0, marginBottom: spacing.lg }}>{t('anando.subtitle')}</p>

      {activeRide ? (
        <div
          style={{
            backgroundColor: colors.surface,
            border: `2px solid ${colors.primary}`,
            borderRadius: radius.md,
            padding: spacing.md,
            marginBottom: spacing.xl,
          }}
        >
          <p style={sectionTitleStyle}>{t('anando.activeRideTitle')}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: colors.text }}>
              {activeRide.origin_city?.name} → {activeRide.destination_city?.name}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: 999,
                backgroundColor: activeRide.status === 'open' ? colors.successSoft : colors.accentSoft,
                color: activeRide.status === 'open' ? colors.success : colors.accent,
              }}
            >
              {t(`anando.status.${activeRide.status}`)}
            </span>
          </div>
          <p style={{ fontSize: 14, color: colors.textMuted, margin: '4px 0 16px' }}>
            {t('anando.seatsProgress', { booked: activeRide.total_seats - activeRide.available_seats, total: activeRide.total_seats })}
            {' · '}
            {t('anando.seatsAvailable', { count: activeRide.available_seats })}
          </p>
          {error && <p style={{ color: colors.danger, fontSize: 13.5, marginBottom: spacing.sm }}>{error}</p>}
          <div style={{ display: 'flex', gap: spacing.sm }}>
            {['open', 'full'].includes(activeRide.status) && (
              <Button label={t('anando.startTrip')} onClick={handleStartActiveRide} loading={rideActionLoading} style={{ flex: 1 }} />
            )}
            {activeRide.status === 'in_progress' && (
              <Button label={t('anando.completeTrip')} onClick={handleCompleteActiveRide} loading={rideActionLoading} style={{ flex: 1 }} />
            )}
            <Button
              label={t('anando.viewDetails')}
              onClick={() => navigate(`/services/anando/${activeRide.id}`)}
              variant="outline"
              style={{ flex: 1 }}
            />
          </div>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            padding: spacing.md,
            marginBottom: spacing.xl,
          }}
        >
          <p style={sectionTitleStyle}>{t('anando.postTitle')}</p>
          <CityPicker label={t('anando.origin')} cities={cities} value={origin} onChange={setOrigin} placeholder={t('anando.originPlaceholder')} />
          <CityPicker
            label={t('anando.destination')}
            cities={cities}
            value={destination}
            onChange={setDestination}
            placeholder={t('anando.destinationPlaceholder')}
          />
          <TextField
            label={t('anando.departurePoint')}
            value={departurePoint}
            onChange={(e) => setDeparturePoint(e.target.value)}
            placeholder={t('anando.departurePointPlaceholder')}
          />
          <div style={{ display: 'flex', gap: spacing.sm }}>
            <div style={{ flex: 1 }}>
              <TextField
                label={t('anando.pricePerSeat')}
                type="number"
                inputMode="numeric"
                value={pricePerSeat}
                onChange={(e) => setPricePerSeat(e.target.value)}
                placeholder="1500"
              />
            </div>
            <div style={{ flex: 1 }}>
              <TextField label={t('anando.seats')} type="number" inputMode="numeric" value={seats} onChange={(e) => setSeats(e.target.value)} />
            </div>
          </div>
          {error && <p style={{ color: colors.danger, fontSize: 13.5, marginBottom: spacing.sm }}>{error}</p>}
          <Button label={t('anando.postSubmit')} onClick={handleSubmit} loading={posting} disabled={!canSubmit} />
        </div>
      )}

      <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}`, marginBottom: spacing.md }}>
        <button onClick={() => setTab('available')} style={tabButtonStyle(tab === 'available')}>
          {t('anando.tabs.available')}
        </button>
        <button onClick={() => setTab('mine')} style={tabButtonStyle(tab === 'mine')}>
          {t('anando.tabs.mine')}
        </button>
      </div>

      {tab === 'available' ? (
        <>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.sm, padding: '40px 0' }}>
              <SearchingCarIndicator size={40} icon="🚗" />
              <p style={{ color: colors.textMuted, margin: 0 }}>{t('anando.loading')}</p>
            </div>
          ) : rides.length === 0 ? (
            <p style={{ color: colors.textMuted, fontSize: 14 }}>{t('anando.empty')}</p>
          ) : (
            rides.map((ride) => <RideCard key={ride.id} ride={ride} onClick={() => navigate(`/services/anando/${ride.id}`)} />)
          )}
        </>
      ) : (
        <>
          <p style={sectionTitleStyle}>{t('anando.myRides')}</p>
          {myRides.length === 0 ? (
            <p style={{ color: colors.textMuted, fontSize: 14, marginBottom: spacing.lg }}>{t('anando.noMyRides')}</p>
          ) : (
            <div style={{ marginBottom: spacing.lg }}>
              {myRides.map((ride) => (
                <RideCard key={ride.id} ride={ride} onClick={() => navigate(`/services/anando/${ride.id}`)} />
              ))}
            </div>
          )}

          <p style={sectionTitleStyle}>{t('anando.myBookings')}</p>
          {myBookings.length === 0 ? (
            <p style={{ color: colors.textMuted, fontSize: 14 }}>{t('anando.noMyBookings')}</p>
          ) : (
            myBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} onClick={() => navigate(`/services/anando/${booking.anando_ride.id}`)} />
            ))
          )}
        </>
      )}

      {postedRideId != null && (
        <SuccessModal
          title={t('anando.postSuccessTitle')}
          body={t('anando.postSuccessBody')}
          buttonLabel={t('common.ok')}
          onClose={() => navigate(`/services/anando/${postedRideId}`)}
        />
      )}
    </div>
  );
}
