import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { fetchMyCars } from '../api/cars';
import { fetchCities } from '../api/cities';
import { extractErrorMessage } from '../api/client';
import { createInstantTrip } from '../api/trips';
import type { Car, City, RideType } from '../api/types';
import { Button } from '../components/Button';
import { CityPicker } from '../components/CityPicker';
import { CenteredSpinner } from '../components/Spinner';
import { TextField } from '../components/TextField';
import { useAuth } from '../context/AuthContext';
import { useMyLocation } from '../hooks/useMyLocation';
import { colors, radius, spacing } from '../theme';

const RIDE_TYPES: RideType[] = ['standard', 'comfort', 'xl'];

export function PostInstantTripPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cars, setCars] = useState<Car[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [carId, setCarId] = useState<number | null>(null);
  const [origin, setOrigin] = useState<City | null>(null);
  const [destination, setDestination] = useState<City | null>(null);
  const [departureLat, setDepartureLat] = useState<number | null>(null);
  const [departureLng, setDepartureLng] = useState<number | null>(null);
  const [departureAddress, setDepartureAddress] = useState('');
  const [fare, setFare] = useState('');
  const [rideType, setRideType] = useState<RideType>('standard');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState(false);

  const { loading: locating, requestLocation } = useMyLocation();

  useEffect(() => {
    Promise.all([fetchMyCars(), fetchCities()])
      .then(([carsRes, citiesRes]) => {
        setCars(carsRes);
        setCities(citiesRes);
        if (carsRes.length) setCarId(carsRes[0].id);
      })
      .finally(() => setLoadingData(false));
  }, []);

  const kycApproved = user?.driver_profile?.kyc_status === 'approved';
  const canSubmit = kycApproved && carId && origin && destination && origin.id !== destination.id && Number(fare) > 0;

  const handleUseMyLocation = async () => {
    const coords = await requestLocation();
    if (coords) {
      setDepartureLat(coords.latitude);
      setDepartureLng(coords.longitude);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !carId || !origin || !destination) return;

    setError(undefined);
    setLoading(true);
    try {
      await createInstantTrip({
        car_id: carId,
        origin_city_id: origin.id,
        destination_city_id: destination.id,
        departure_latitude: departureLat ?? undefined,
        departure_longitude: departureLng ?? undefined,
        departure_address: departureAddress.trim() || undefined,
        fare: Number(fare),
        ride_type: rideType,
        notes: notes.trim() || undefined,
      });
      setSuccess(true);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) return <CenteredSpinner />;

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: `${spacing.sm}px ${spacing.md}px`,
    borderRadius: radius.lg,
    border: `1px solid ${active ? colors.primary : colors.border}`,
    backgroundColor: active ? colors.primary : colors.surface,
    color: active ? '#fff' : colors.text,
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
  });

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        style={{ border: 'none', background: 'none', color: colors.textMuted, fontSize: 22, cursor: 'pointer', padding: 0, marginBottom: spacing.sm }}
      >
        ←
      </button>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, marginBottom: spacing.xs }}>{t('trips.postInstant.title')}</h1>
      <p style={{ fontSize: 14, color: colors.textMuted, marginBottom: spacing.md }}>{t('trips.postInstant.subtitle')}</p>

      {success ? (
        <div
          style={{
            backgroundColor: colors.successSoft,
            border: `1px solid ${colors.success}`,
            borderRadius: radius.md,
            padding: spacing.lg,
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 18, fontWeight: 700, color: colors.success, margin: `0 0 ${spacing.xs}px` }}>
            {t('trips.postInstant.successTitle')}
          </p>
          <p style={{ fontSize: 14, color: colors.text, margin: `0 0 ${spacing.md}px` }}>{t('trips.postInstant.successBody')}</p>
          <Button label={t('common.ok')} onClick={() => navigate('/')} />
        </div>
      ) : !kycApproved ? (
        <p style={{ color: colors.textMuted, fontSize: 16 }}>{t('trips.post.kycNotice')}</p>
      ) : cars.length === 0 ? (
        <p style={{ color: colors.textMuted, fontSize: 16 }}>{t('trips.post.noCarsNotice')}</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: colors.text, marginBottom: spacing.xs }}>
            {t('trips.post.vehicleLabel')}
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
            {cars.map((car) => (
              <button type="button" key={car.id} style={chipStyle(carId === car.id)} onClick={() => setCarId(car.id)}>
                {car.make} {car.model} ({car.seats})
              </button>
            ))}
          </div>

          <CityPicker label={t('trips.post.originLabel')} cities={cities} value={origin} onChange={setOrigin} placeholder={t('trips.post.originPlaceholder')} />
          <CityPicker
            label={t('trips.post.destinationLabel')}
            cities={cities}
            value={destination}
            onChange={setDestination}
            placeholder={t('trips.post.destinationPlaceholder')}
          />

          <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: colors.text, marginBottom: spacing.xs }}>
            {t('trips.post.meetingPointLabel')}
          </label>
          <button
            type="button"
            onClick={handleUseMyLocation}
            style={{
              display: 'block',
              width: '100%',
              border: `1px solid ${colors.border}`,
              borderRadius: radius.sm,
              padding: '10px 12px',
              backgroundColor: colors.background,
              color: colors.primary,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              marginBottom: spacing.sm,
              textAlign: 'left',
            }}
          >
            {locating
              ? '…'
              : departureLat != null
                ? `📍 ${departureLat.toFixed(4)}, ${departureLng!.toFixed(4)}`
                : '📍 Utiliser ma position'}
          </button>
          <TextField
            label={t('trips.post.meetingPointDescLabel')}
            placeholder={t('trips.post.meetingPointPlaceholder')}
            value={departureAddress}
            onChange={(e) => setDepartureAddress(e.target.value)}
          />

          <TextField
            label={t('trips.post.fareLabel')}
            type="number"
            value={fare}
            onChange={(e) => setFare(e.target.value)}
            error={error}
          />

          <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: colors.text, marginBottom: spacing.xs }}>
            {t('trips.post.rideTypeLabel')}
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
            {RIDE_TYPES.map((rt) => (
              <button type="button" key={rt} style={chipStyle(rideType === rt)} onClick={() => setRideType(rt)}>
                {t(`common.rideType.${rt}`)}
              </button>
            ))}
          </div>

          <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: colors.text, marginBottom: spacing.xs }}>
            {t('trips.post.notesLabel')}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              border: `1px solid ${colors.border}`,
              borderRadius: radius.sm,
              padding: spacing.sm,
              fontSize: 15,
              color: colors.text,
              backgroundColor: colors.surface,
              marginBottom: spacing.md,
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />

          <Button label={t('trips.postInstant.submit')} type="submit" disabled={!canSubmit} loading={loading} />
        </form>
      )}
    </div>
  );
}
