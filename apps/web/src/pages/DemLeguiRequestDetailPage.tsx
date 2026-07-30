import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { cancelDemLeguiRequest, fetchDemLeguiRequest, fetchDemLeguiTrip, fetchNearbyDemLeguiDrivers } from '../api/demLegui';
import { extractErrorMessage } from '../api/client';
import type { DemLeguiRequest, DemLeguiTrip } from '../api/types';
import type { NearbyDriver } from '../api/demLegui';
import { AnandoLiveMap } from '../components/AnandoLiveMap';
import { Button } from '../components/Button';
import { NearbyDriversMap } from '../components/NearbyDriversMap';
import { SearchingCarIndicator } from '../components/SearchingCarIndicator';
import { SosShareModal } from '../components/SosShareModal';
import { colors, radius, spacing } from '../theme';

const POLL_INTERVAL_MS = 8000;
const NEARBY_DRIVERS_POLL_INTERVAL_MS = 5000;

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
  const [nearbyDrivers, setNearbyDrivers] = useState<NearbyDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justMatched, setJustMatched] = useState(false);
  const [showSos, setShowSos] = useState(false);
  const hadTripRef = useRef(false);

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

  useEffect(() => {
    if (!trip && hadTripRef.current === false) return;
    if (trip && !hadTripRef.current) {
      hadTripRef.current = true;
      setJustMatched(true);
      const timeout = setTimeout(() => setJustMatched(false), 8000);
      return () => clearTimeout(timeout);
    }
  }, [trip]);

  useEffect(() => {
    if (!id || request?.status !== 'pending') return;
    const loadNearby = () => fetchNearbyDemLeguiDrivers(Number(id)).then(setNearbyDrivers).catch(() => {});
    loadNearby();
    const interval = setInterval(loadNearby, NEARBY_DRIVERS_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [id, request?.status]);

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

  const driverPosition = trip
    ? trip.status === 'in_progress'
      ? { lat: trip.current_latitude, lng: trip.current_longitude, updatedAt: trip.current_location_updated_at }
      : { lat: trip.driver.current_latitude, lng: trip.driver.current_longitude, updatedAt: trip.driver.last_seen_at }
    : null;

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        style={{ border: 'none', background: 'none', color: colors.textMuted, fontSize: 22, cursor: 'pointer', padding: 0, marginBottom: spacing.sm }}
      >
        ←
      </button>

      {justMatched && (
        <div
          style={{
            backgroundColor: colors.success,
            color: '#fff',
            borderRadius: radius.md,
            padding: spacing.md,
            marginBottom: spacing.md,
          }}
        >
          <p style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{t('demLegui.matchedBannerTitle')}</p>
          <p style={{ fontSize: 13.5, margin: '2px 0 0', opacity: 0.9 }}>
            {t('demLegui.matchedBannerSubtitle', { name: trip?.driver.name })}
          </p>
        </div>
      )}

      {request.status === 'pending' && (
        <NearbyDriversMap
          pickupLatitude={request.pickup_latitude}
          pickupLongitude={request.pickup_longitude}
          drivers={nearbyDrivers}
        />
      )}

      {trip && driverPosition && (
        driverPosition.lat != null && driverPosition.lng != null ? (
          <AnandoLiveMap
            currentLatitude={driverPosition.lat}
            currentLongitude={driverPosition.lng}
            destinationLatitude={trip.status === 'in_progress' ? request.destination_city?.latitude : request.pickup_latitude}
            destinationLongitude={trip.status === 'in_progress' ? request.destination_city?.longitude : request.pickup_longitude}
            destinationName={trip.status === 'in_progress' ? request.destination_city?.name : request.pickup_address}
            updatedAt={driverPosition.updatedAt}
          />
        ) : (
          <p style={{ fontSize: 13.5, color: colors.textMuted, marginBottom: spacing.md }}>{t('demLegui.liveMapWaiting')}</p>
        )
      )}

      {trip?.status === 'in_progress' && (
        <div style={{ marginBottom: spacing.md }}>
          <Button label={`🆘 ${t('tracking.sosButton')}`} onClick={() => setShowSos(true)} variant="outline" />
        </div>
      )}
      {showSos && trip && <SosShareModal kind="dem-legui/trips" rideId={trip.id} onClose={() => setShowSos(false)} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: colors.text, margin: 0 }}>
          {t('demLegui.tripToLabel', { city: request.destination_city?.name })}
        </h1>
        {request.status === 'pending' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, flexShrink: 0 }}>
            <SearchingCarIndicator size={28} />
            <span style={{ fontSize: 12, fontWeight: 700, color: colors.primary }}>{t('demLegui.searchingBadge')}</span>
          </div>
        )}
      </div>
      <p style={{ fontSize: 14, color: colors.textMuted, marginTop: 2, marginBottom: spacing.md }}>
        {t(`demLegui.status.${request.status}`)}
      </p>

      {trip?.arrived_at != null && trip.status === 'open' && (
        <p style={{ fontSize: 13.5, fontWeight: 700, color: colors.primary, marginTop: -4, marginBottom: spacing.md }}>
          🚩 {t('demLegui.driverArrivedBadge')}
        </p>
      )}

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
          {request.eta_minutes != null && (
            <p style={{ fontSize: 15, fontWeight: 700, color: colors.primary, margin: '8px 0 0' }}>
              ⏱ {t('demLegui.etaMinutes', { minutes: request.eta_minutes })}
            </p>
          )}

          <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md }}>
            <a
              href={`tel:${trip.driver.phone}`}
              style={{
                flex: 1,
                textAlign: 'center',
                textDecoration: 'none',
                border: 'none',
                borderRadius: radius.sm,
                padding: `${spacing.sm}px ${spacing.md}px`,
                backgroundColor: colors.primary,
                color: '#fff',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              📞 {t('demLegui.call')}
            </a>
            <button
              onClick={() => navigate(`/services/dem-legui/${request.id}/chat`)}
              style={{
                flex: 1,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.sm,
                padding: `${spacing.sm}px ${spacing.md}px`,
                backgroundColor: colors.surface,
                color: colors.text,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              💬 {t('demLegui.chat')}
            </button>
          </div>
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
