import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { extractErrorMessage } from '../api/client';
import { fetchPublicTracking, type PublicTrackingPayload } from '../api/tracking';
import { AnandoLiveMap } from '../components/AnandoLiveMap';
import { CenteredSpinner } from '../components/Spinner';
import { colors, radius, spacing } from '../theme';

const POLL_INTERVAL_MS = 10000;

/**
 * Public, unauthenticated page opened from an SOS "share my live position"
 * link sent over WhatsApp/SMS — no login required. Reads the signed
 * expires/signature query params straight through to the backend on every
 * poll; the backend re-validates them on each request, so an expired or
 * tampered link simply starts failing mid-session.
 */
export function PublicTrackingPage() {
  const { t } = useTranslation();
  const { type, id } = useParams<{ type: string; id: string }>();
  const location = useLocation();
  const [payload, setPayload] = useState<PublicTrackingPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!type || !id) return;
    const query = location.search.startsWith('?') ? location.search.slice(1) : location.search;
    let cancelled = false;

    async function poll() {
      try {
        const data = await fetchPublicTracking(type!, id!, query);
        if (!cancelled) {
          setPayload(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(extractErrorMessage(err));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [type, id, location.search]);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: spacing.lg, minHeight: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg }}>
        <img src="/favicon.svg" alt="" width={28} height={28} />
        <span style={{ fontSize: 20, fontWeight: 800, color: colors.text }}>Intercity</span>
      </div>

      {isLoading && <CenteredSpinner />}

      {!isLoading && error && (
        <div
          style={{
            background: colors.dangerSoft,
            color: colors.danger,
            borderRadius: radius.md,
            padding: spacing.md,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {t('tracking.linkInvalid')}
        </div>
      )}

      {!isLoading && !error && payload && (
        <>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: colors.text, marginBottom: spacing.xs }}>
            {t('tracking.title')}
          </h1>
          {payload.trackable ? (
            <>
              <p style={{ fontSize: 14, color: colors.textMuted, marginBottom: spacing.md }}>
                {t('tracking.subtitleTrackable', { name: payload.person_name, destination: payload.destination_city })}
              </p>
              {payload.current_latitude != null && payload.current_longitude != null && (
                <AnandoLiveMap
                  currentLatitude={payload.current_latitude}
                  currentLongitude={payload.current_longitude}
                  updatedAt={payload.current_location_updated_at}
                />
              )}
            </>
          ) : (
            <p style={{ fontSize: 14, color: colors.textMuted }}>{t('tracking.notInProgress')}</p>
          )}
        </>
      )}
    </div>
  );
}
