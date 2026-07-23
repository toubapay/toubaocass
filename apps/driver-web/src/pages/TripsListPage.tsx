import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { fetchMyTrips } from '../api/trips';
import type { Trip } from '../api/types';
import { AnandoAvailableToast } from '../components/AnandoAvailableToast';
import { Button } from '../components/Button';
import { CenteredSpinner } from '../components/Spinner';
import { useModuleStatus } from '../context/ModuleStatusContext';
import { colors, radius, spacing } from '../theme';

const STATUS_COLOR: Record<string, string> = {
  scheduled: colors.success,
  full: colors.accent,
  in_progress: colors.primary,
  completed: colors.textMuted,
  cancelled: colors.danger,
};

export function TripsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isModuleEnabled } = useModuleStatus();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchMyTrips()
      .then((res) => setTrips(res.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  if (loading) return <CenteredSpinner />;

  return (
    <div>
      {isModuleEnabled('anando') && <AnandoAvailableToast />}
      <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>{t('trips.listTitle')}</h1>

      {isModuleEnabled('instant_trips') && (
        <button
          onClick={() => navigate('/post-instant-trip')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            width: '100%',
            border: `1px solid ${colors.primary}`,
            borderRadius: radius.md,
            backgroundColor: colors.primary,
            padding: spacing.md,
            marginBottom: spacing.md,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{ fontSize: 24 }}>🚀</span>
          <span>
            <span style={{ display: 'block', fontSize: 16, fontWeight: 700, color: '#fff' }}>{t('trips.instantCardTitle')}</span>
            <span style={{ display: 'block', fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
              {t('trips.instantCardSubtitle')}
            </span>
          </span>
        </button>
      )}

      {isModuleEnabled('anando') && (
        <button
          onClick={() => navigate('/anando')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            width: '100%',
            border: `1px solid ${colors.accent}`,
            borderRadius: radius.md,
            backgroundColor: colors.accent,
            padding: spacing.md,
            marginBottom: spacing.md,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{ fontSize: 24 }}>🚗</span>
          <span>
            <span style={{ display: 'block', fontSize: 16, fontWeight: 700, color: '#fff' }}>{t('anando.title')}</span>
            <span style={{ display: 'block', fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
              {t('anando.subtitle')}
            </span>
          </span>
        </button>
      )}

      <button
        onClick={() => navigate('/post-trip')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          width: '100%',
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          backgroundColor: colors.accentSoft,
          padding: spacing.md,
          marginBottom: spacing.md,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 24 }}>🗺️</span>
        <span>
          <span style={{ display: 'block', fontSize: 16, fontWeight: 700, color: colors.text }}>{t('trips.mapCardTitle')}</span>
          <span style={{ display: 'block', fontSize: 14, color: colors.textMuted, marginTop: 2 }}>{t('trips.mapCardSubtitle')}</span>
        </span>
      </button>

      {trips.length === 0 ? (
        <p style={{ color: colors.textMuted, fontSize: 16, textAlign: 'center', margin: `${spacing.lg}px 0` }}>
          {t('trips.emptyList')}
        </p>
      ) : (
        trips.map((trip) => (
          <button
            key={trip.id}
            onClick={() => navigate(`/trips/${trip.id}`)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: spacing.md,
              marginBottom: spacing.md,
              border: `1px solid ${colors.border}`,
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: colors.text, flexShrink: 1, marginRight: spacing.sm }}>
                {trip.origin_city?.name} → {trip.destination_city?.name}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: STATUS_COLOR[trip.status] }}>
                {t(`common.tripStatus.${trip.status}`)}
              </span>
            </div>
            <p style={{ fontSize: 14, color: colors.textMuted, margin: `${spacing.xs}px 0 0` }}>
              {trip.departure_date} à {trip.departure_time} ·{' '}
              {t('trips.seatsRemaining', { available: trip.available_seats, total: trip.total_seats })}
            </p>
            <p style={{ fontSize: 16, fontWeight: 700, color: colors.primary, margin: `${spacing.xs}px 0 0` }}>
              {t('trips.farePerSeat', { fare: trip.fare.toLocaleString() })}
            </p>
          </button>
        ))
      )}

      <Button label={t('trips.publishNew')} onClick={() => navigate('/post-trip')} />
    </div>
  );
}
