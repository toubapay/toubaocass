import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { fetchProfileStats } from '../api/profile';
import type { ProfileStats, ProfileTripSummary } from '../api/types';
import { useMyLocation, type Coordinates } from '../hooks/useMyLocation';
import { colors, radius, spacing } from '../theme';
import { AnandoLiveMap } from './AnandoLiveMap';

const tileStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 2,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.md,
  backgroundColor: colors.surface,
  padding: spacing.md,
  textAlign: 'left' as const,
  cursor: 'pointer',
};

function StatTile({
  icon,
  label,
  value,
  onClick,
}: {
  icon: string;
  label: string;
  value: string | number;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} style={{ ...tileStyle, cursor: onClick ? 'pointer' : 'default' }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span style={{ fontSize: 20, fontWeight: 800, color: colors.text }}>{value}</span>
      <span style={{ fontSize: 12, color: colors.textMuted, fontWeight: 600 }}>{label}</span>
    </Tag>
  );
}

function TripRow({ icon, label, trip, emptyLabel, onClick }: { icon: string; label: string; trip: ProfileTripSummary | null; emptyLabel: string; onClick?: () => void }) {
  const Tag = trip && onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={trip ? onClick : undefined}
      style={{
        ...tileStyle,
        gridColumn: 'span 2',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        cursor: trip && onClick ? 'pointer' : 'default',
      }}
    >
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 12, color: colors.textMuted, fontWeight: 600 }}>{label}</span>
        {trip ? (
          <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {trip.origin_city} → {trip.destination_city} · {trip.departure_date}
          </span>
        ) : (
          <span style={{ display: 'block', fontSize: 14, color: colors.textMuted }}>{emptyLabel}</span>
        )}
      </span>
    </Tag>
  );
}

export function ProfileDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [showPosition, setShowPosition] = useState(false);
  const { loading: locating, error: locationError, requestLocation } = useMyLocation();

  useEffect(() => {
    fetchProfileStats().then(setStats).catch(() => setStats(null));
  }, []);

  const handleShowPosition = async () => {
    if (showPosition) {
      setShowPosition(false);
      return;
    }
    const coords = await requestLocation();
    if (coords) {
      setPosition(coords);
      setShowPosition(true);
    }
  };

  if (!stats) return null;

  return (
    <div style={{ marginBottom: spacing.lg }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: spacing.sm }}>
        <StatTile icon="🧭" label={t('profile.dashboard.trips')} value={stats.trips_count} />
        <StatTile icon="🎫" label={t('profile.dashboard.bookings')} value={stats.bookings_count} />
        <StatTile
          icon="🚗"
          label={t('profile.dashboard.myRides')}
          value={stats.anando_rides_count}
          onClick={() => navigate('/services/anando', { state: { initialTab: 'mine' } })}
        />
        <StatTile icon="👥" label={t('profile.dashboard.clients')} value={stats.anando_clients_count} />
        <StatTile icon="💰" label={t('profile.dashboard.earnings')} value={`${stats.earnings_total.toLocaleString()} FCFA`} />

        <TripRow
          icon="🟢"
          label={t('profile.dashboard.activeBooking')}
          trip={stats.active_booking}
          emptyLabel={t('profile.dashboard.noActiveBooking')}
          onClick={() => stats.active_booking && navigate(`/trips/${stats.active_booking.id}`)}
        />
        <TripRow
          icon="🕓"
          label={t('profile.dashboard.lastTrip')}
          trip={stats.last_trip}
          emptyLabel={t('profile.dashboard.noLastTrip')}
          onClick={() => stats.last_trip && navigate(`/trips/${stats.last_trip.id}`)}
        />

        <button onClick={handleShowPosition} style={{ ...tileStyle, gridColumn: 'span 2', flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <span style={{ fontSize: 22 }}>📍</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: 12, color: colors.textMuted, fontWeight: 600 }}>{t('profile.dashboard.myPosition')}</span>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: colors.text }}>
              {locating ? t('profile.dashboard.locating') : showPosition ? t('profile.dashboard.hidePosition') : t('profile.dashboard.showPosition')}
            </span>
          </span>
        </button>
      </div>

      {locationError && <p style={{ color: colors.danger, fontSize: 13, marginTop: spacing.sm }}>{locationError}</p>}

      {showPosition && position && (
        <div style={{ marginTop: spacing.sm }}>
          <AnandoLiveMap currentLatitude={position.latitude} currentLongitude={position.longitude} />
        </div>
      )}
    </div>
  );
}
