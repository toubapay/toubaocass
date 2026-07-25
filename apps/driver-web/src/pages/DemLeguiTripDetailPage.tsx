import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { extractErrorMessage } from '../api/client';
import { completeDemLeguiTrip, fetchDemLeguiTrip, startDemLeguiTrip, updateDemLeguiTripLocation } from '../api/demLegui';
import type { DemLeguiTrip } from '../api/types';
import { AnandoLiveMap } from '../components/AnandoLiveMap';
import { Button } from '../components/Button';
import { CenteredSpinner } from '../components/Spinner';
import { colors, radius, spacing } from '../theme';

const LIVE_LOCATION_INTERVAL_MS = 12000;

const sectionTitleStyle = {
  fontSize: 13,
  fontWeight: 700,
  color: colors.textMuted,
  marginBottom: spacing.xs,
  textTransform: 'uppercase' as const,
};

export function DemLeguiTripDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [trip, setTrip] = useState<DemLeguiTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!id) return;
    fetchDemLeguiTrip(Number(id))
      .then(setTrip)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (trip?.status !== 'in_progress') return;
    const interval = setInterval(load, LIVE_LOCATION_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.status, id]);

  useEffect(() => {
    if (trip?.status !== 'in_progress' || !('geolocation' in navigator)) return;
    const tripId = trip.id;

    const report = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateDemLeguiTripLocation(tripId, position.coords.latitude, position.coords.longitude).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: false, timeout: 10000 },
      );
    };

    report();
    const interval = setInterval(report, LIVE_LOCATION_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [trip?.status, trip?.id]);

  if (loading || !trip) {
    return <CenteredSpinner />;
  }

  const handleStart = async () => {
    setStarting(true);
    setError(null);
    try {
      setTrip(await startDemLeguiTrip(trip.id));
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setStarting(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    setError(null);
    try {
      setTrip(await completeDemLeguiTrip(trip.id));
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setCompleting(false);
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

      {trip.status === 'in_progress' && (
        trip.current_latitude != null && trip.current_longitude != null ? (
          <AnandoLiveMap
            currentLatitude={trip.current_latitude}
            currentLongitude={trip.current_longitude}
            destinationLatitude={trip.destination_city?.latitude}
            destinationLongitude={trip.destination_city?.longitude}
            destinationName={trip.destination_city?.name}
            updatedAt={trip.current_location_updated_at}
          />
        ) : (
          <p style={{ fontSize: 13.5, color: colors.textMuted, marginBottom: spacing.md }}>{t('demLegui.liveMapWaiting')}</p>
        )
      )}

      <h1 style={{ fontSize: 24, fontWeight: 800, color: colors.text, marginBottom: 2 }}>
        {t('demLegui.tripToLabel', { city: trip.destination_city?.name })}
      </h1>
      <p style={{ fontSize: 14, color: colors.textMuted, marginTop: 0, marginBottom: spacing.md }}>
        {t(`demLegui.tripStatus.${trip.status}`)} · {t('demLegui.seatsRemaining', { available: trip.available_seats, total: trip.total_seats })}
      </p>

      <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md }}>
        <p style={sectionTitleStyle}>{t('demLegui.passengers', { count: trip.requests?.length ?? 0 })}</p>
        {(trip.requests ?? []).length === 0 ? (
          <p style={{ color: colors.textMuted, fontSize: 14, margin: 0 }}>{t('demLegui.noPassengersYet')}</p>
        ) : (
          trip.requests!.map((r) => (
            <div key={r.id} style={{ marginBottom: spacing.sm, paddingBottom: spacing.sm, borderBottom: `1px solid ${colors.border}` }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: colors.text, margin: 0 }}>{r.rider.name}</p>
              <p style={{ fontSize: 13.5, color: colors.textMuted, margin: '2px 0 0' }}>
                {r.rider.phone} · 📍 {r.pickup_address}
              </p>
              <p style={{ fontSize: 13.5, color: colors.textMuted, margin: '2px 0 0' }}>{t('anando.seatsBooked', { count: r.seats_requested })}</p>
              <button
                onClick={() => navigate(`/dem-legui/requests/${r.id}/chat`)}
                style={{
                  marginTop: spacing.xs,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.sm,
                  padding: `4px ${spacing.sm}px`,
                  backgroundColor: colors.surface,
                  color: colors.text,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                💬 {t('demLegui.chat')}
              </button>
            </div>
          ))
        )}
      </div>

      {error && <p style={{ color: colors.danger, fontSize: 14, marginBottom: spacing.md }}>{error}</p>}

      {trip.status === 'open' && (
        <Button label={t('demLegui.findMorePassengers')} onClick={() => navigate('/dem-legui')} style={{ marginBottom: spacing.sm }} />
      )}
      {trip.status === 'open' && <Button label={t('anando.startTrip')} onClick={handleStart} loading={starting} style={{ marginBottom: spacing.sm }} />}
      {trip.status === 'in_progress' && <Button label={t('anando.completeTrip')} onClick={handleComplete} loading={completing} />}
    </div>
  );
}
