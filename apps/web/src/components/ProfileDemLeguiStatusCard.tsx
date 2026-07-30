import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { fetchDemLeguiTrip, fetchMyActiveDemLeguiRequest } from '../api/demLegui';
import type { DemLeguiRequest, DemLeguiTrip } from '../api/types';
import { colors, radius, spacing } from '../theme';
import { AnandoLiveMap } from './AnandoLiveMap';
import { SearchingCarIndicator } from './SearchingCarIndicator';

/**
 * Profile-page card for the rider's own active Dem Légui request — shows
 * the same phases as the request detail page (searching, driver on the
 * way with ETA, trip in progress with live tracking) plus a direct chat
 * shortcut, without requiring a trip into the module to check.
 */
export function ProfileDemLeguiStatusCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [request, setRequest] = useState<DemLeguiRequest | null>(null);
  const [trip, setTrip] = useState<DemLeguiTrip | null>(null);

  useEffect(() => {
    fetchMyActiveDemLeguiRequest()
      .then((r) => {
        setRequest(r);
        if (r?.dem_legui_trip_id) {
          fetchDemLeguiTrip(r.dem_legui_trip_id).then(setTrip).catch(() => setTrip(null));
        }
      })
      .catch(() => setRequest(null));
  }, []);

  const driverPosition = trip
    ? trip.status === 'in_progress'
      ? { lat: trip.current_latitude, lng: trip.current_longitude }
      : { lat: trip.driver.current_latitude, lng: trip.driver.current_longitude }
    : null;

  return (
    <div
      onClick={request ? () => navigate(`/services/dem-legui/${request.id}`) : undefined}
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        backgroundColor: colors.surface,
        padding: spacing.md,
        marginBottom: spacing.sm,
        cursor: request ? 'pointer' : 'default',
      }}
    >
      <span style={{ display: 'block', fontSize: 12, color: colors.textMuted, fontWeight: 600, marginBottom: 4 }}>
        🚕 {t('profile.dashboard.myDemLeguiTrip')}
      </span>

      {!request ? (
        <span style={{ display: 'block', fontSize: 14, color: colors.textMuted }}>{t('profile.dashboard.noActiveDemLeguiTrip')}</span>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: colors.text }}>
              {t('demLegui.tripToLabel', { city: request.destination_city?.name ?? '—' })}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, flexShrink: 0 }}>
              {request.status === 'pending' && <SearchingCarIndicator size={20} />}
              <span style={{ fontSize: 12, fontWeight: 700, color: colors.primary }}>
                {request.status === 'pending'
                  ? t('demLegui.searchingBadge')
                  : trip?.status === 'in_progress'
                    ? t('demLegui.inProgressBadge')
                    : trip?.arrived_at != null
                      ? t('demLegui.driverArrivedBadge')
                      : t('demLegui.driverArrivingBadge')}
              </span>
            </span>
          </div>

          {trip && request.eta_minutes != null && trip.status !== 'in_progress' && (
            <p style={{ fontSize: 13.5, fontWeight: 700, color: colors.primary, margin: `${spacing.xs}px 0 0` }}>
              ⏱ {t('demLegui.etaMinutes', { minutes: request.eta_minutes })}
            </p>
          )}

          {trip && driverPosition?.lat != null && driverPosition?.lng != null && (
            <div style={{ marginTop: spacing.sm }} onClick={(e) => e.stopPropagation()}>
              <AnandoLiveMap currentLatitude={driverPosition.lat} currentLongitude={driverPosition.lng} />
            </div>
          )}

          {trip && (
            <div style={{ marginTop: spacing.sm }} onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => navigate(`/services/dem-legui/${request.id}/chat`)}
                style={{
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.sm,
                  padding: `${spacing.xs}px ${spacing.md}px`,
                  backgroundColor: colors.background,
                  color: colors.text,
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: 'pointer',
                }}
              >
                💬 {t('demLegui.chat')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
