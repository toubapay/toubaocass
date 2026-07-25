import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { cancelDemLeguiRequest, fetchDemLeguiRequest, fetchDemLeguiTrip } from '../api/demLegui';
import { extractErrorMessage } from '../api/client';
import type { DemLeguiRequest, DemLeguiTrip } from '../api/types';
import { AnandoLiveMap } from '../components/AnandoLiveMap';
import { Button } from '../components/Button';
import { colors, radius, spacing } from '../theme';

const POLL_INTERVAL_MS = 8000;

const sectionTitleStyle = {
  fontSize: 13,
  fontWeight: 700,
  color: colors.textMuted,
  marginBottom: spacing.xs,
  textTransform: 'uppercase' as const,
};

const cardStyle = {
  backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.md,
  padding: spacing.md,
  marginBottom: spacing.md,
};

export function DemLeguiRequestDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [request, setRequest] = useState<DemLeguiRequest | null>(null);
  const [trip, setTrip] = useState<DemLeguiTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!id) return;
    fetchDemLeguiRequest(Number(id))
      .then((r) => {
        setRequest(r);
        if (r.dem_legui_trip_id) {
          fetchDemLeguiTrip(r.dem_legui_trip_id).then(setTrip).catch(() => setTrip(null));
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!request || ['cancelled', 'expired'].includes(request.status)) return;
    if (trip?.status === 'completed' || trip?.status === 'cancelled') return;
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.status, trip?.status, id]);

  if (loading || !request) {
    return <p style={{ color: colors.textMuted }}>{t('anando.loading')}</p>;
  }

  const canCancel = request.status === 'pending' || (request.status === 'matched' && trip?.status === 'open');

  const handleCancel = async () => {
    if (!window.confirm(t('demLegui.cancelConfirm') as string)) return;
    setCancelling(true);
    setError(null);
    try {
      await cancelDemLeguiRequest(request.id);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setCancelling(false);
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

      {trip?.status === 'in_progress' && (
        trip.current_latitude != null && trip.current_longitude != null ? (
          <AnandoLiveMap
            currentLatitude={trip.current_latitude}
            currentLongitude={trip.current_longitude}
            destinationLatitude={request.destination_city?.latitude}
            destinationLongitude={request.destination_city?.longitude}
            destinationName={request.destination_city?.name}
            updatedAt={trip.current_location_updated_at}
          />
        ) : (
          <p style={{ fontSize: 13.5, color: colors.textMuted, marginBottom: spacing.md }}>{t('demLegui.liveMapWaiting')}</p>
        )
      )}

      <h1 style={{ fontSize: 24, fontWeight: 800, color: colors.text, marginBottom: 2 }}>
        {t('demLegui.tripToLabel', { city: request.destination_city?.name })}
      </h1>
      <p style={{ fontSize: 14, color: colors.textMuted, marginTop: 0, marginBottom: spacing.md }}>
        {t(`demLegui.status.${request.status}`)}
      </p>

      {request.status === 'pending' && (
        <div style={cardStyle}>
          <p style={{ fontSize: 16, color: colors.text, margin: 0, fontWeight: 600 }}>{t('demLegui.searchingForDriver')}</p>
          <p style={{ fontSize: 13.5, color: colors.textMuted, margin: '4px 0 0' }}>{t('demLegui.searchingHint')}</p>
        </div>
      )}

      {trip && (
        <div style={cardStyle}>
          <p style={sectionTitleStyle}>{t('demLegui.yourDriver')}</p>
          <p style={{ fontSize: 17, color: colors.text, margin: 0 }}>{trip.driver.name}</p>
          <p style={{ fontSize: 14, color: colors.textMuted, margin: '2px 0 0' }}>{trip.driver.phone}</p>
          <p style={{ fontSize: 13, color: colors.textMuted, margin: '4px 0 0' }}>★ {trip.driver.rating.toFixed(1)}</p>
          {trip.car && (
            <p style={{ fontSize: 14, color: colors.textMuted, margin: '6px 0 0' }}>
              🚗 {trip.car.make} {trip.car.model} · {trip.car.plate_number}
            </p>
          )}
        </div>
      )}

      <div style={cardStyle}>
        <p style={sectionTitleStyle}>{t('demLegui.pickup')}</p>
        <p style={{ fontSize: 15, color: colors.text, margin: 0 }}>{request.pickup_address}</p>
      </div>

      <div style={cardStyle}>
        <p style={sectionTitleStyle}>{t('demLegui.fare')}</p>
        <p style={{ fontSize: 20, fontWeight: 800, color: colors.primary, margin: 0 }}>{request.fare_total.toLocaleString()} FCFA</p>
        <p style={{ fontSize: 13.5, color: colors.textMuted, margin: '2px 0 0' }}>
          {t('anando.seatsBooked', { count: request.seats_requested })}
        </p>
      </div>

      {error && <p style={{ color: colors.danger, fontSize: 14, marginBottom: spacing.md }}>{error}</p>}

      {canCancel && <Button label={t('demLegui.cancelRequest')} onClick={handleCancel} loading={cancelling} variant="danger" />}
    </div>
  );
}
