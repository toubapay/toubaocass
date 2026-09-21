import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { fetchMyDemLeguiRequests } from '../api/demLegui';
import type { DemLeguiRequest } from '../api/types';
import { CenteredSpinner } from '../components/Spinner';
import { colors, radius, spacing } from '../theme';

const STATUS_COLOR: Record<string, string> = {
  pending: colors.textMuted,
  matched: colors.accent,
  cancelled: colors.danger,
  expired: colors.danger,
};

/**
 * Dedicated Dem Légui request history — split out of MyRideBookingsPage
 * (which now only covers Anando) so it's reachable as its own clearly
 * labeled entry point from Profile, mirroring driver-web's "Historique
 * Dem Légui" page.
 */
export function DemLeguiHistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<DemLeguiRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyDemLeguiRequests()
      .then((res) => setRequests(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <CenteredSpinner />;

  return (
    <div>
      <button
        onClick={() => navigate('/profile')}
        style={{ border: 'none', background: 'none', color: colors.textMuted, fontSize: 22, cursor: 'pointer', padding: 0, marginBottom: spacing.sm }}
      >
        ←
      </button>

      <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>{t('demLeguiHistory.title')}</h1>

      {requests.length === 0 ? (
        <p style={{ color: colors.textMuted, fontSize: 14 }}>{t('demLeguiHistory.empty')}</p>
      ) : (
        requests.map((request) => (
          <div
            key={request.id}
            onClick={() => navigate(`/services/dem-legui/${request.id}`)}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: spacing.md,
              marginBottom: spacing.sm,
              border: `1px solid ${colors.border}`,
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>
                {t('demLegui.tripToLabel', { city: request.destination_city?.name ?? '—' })}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_COLOR[request.status] }}>
                {t(`demLegui.status.${request.status}`)}
              </span>
            </div>
            <p style={{ fontSize: 13.5, color: colors.textMuted, margin: `${spacing.xs}px 0 0` }}>{request.pickup_address}</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: colors.primary, margin: `${spacing.xs}px 0 0` }}>
              {request.fare_total.toLocaleString()} FCFA
            </p>
            {request.trip_status === 'completed' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/services/dem-legui/${request.id}`);
                }}
                style={{ border: 'none', background: 'none', color: colors.primary, fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 15, marginTop: spacing.sm }}
              >
                {t('rating.rateButton')}
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
