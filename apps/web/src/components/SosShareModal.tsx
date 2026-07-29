import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { extractErrorMessage } from '../api/client';
import { fetchShareLink } from '../api/tracking';
import { colors, radius, spacing } from '../theme';
import { Button } from './Button';
import { CenteredSpinner } from './Spinner';

export type ShareableRideKind = 'trips' | 'anando-rides' | 'dem-legui/trips';

/**
 * SOS "share my live position" bottom sheet — generates the 24h signed
 * tracking link then hands it straight to WhatsApp/SMS with a pre-filled
 * message, so family members get a real page (not raw JSON) without
 * needing an account. Only meant to be rendered while the ride is
 * in_progress; the caller controls that visibility.
 */
export function SosShareModal({
  kind,
  rideId,
  onClose,
}: {
  kind: ShareableRideKind;
  rideId: number | string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchShareLink(kind, rideId)
      .then((link) => {
        if (!cancelled) setUrl(link);
      })
      .catch((err) => {
        if (!cancelled) setError(extractErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [kind, rideId]);

  const message = url ? t('tracking.sosMessage', { url }) : '';

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 420,
          backgroundColor: colors.surface,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          padding: spacing.lg,
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.text, margin: `0 0 ${spacing.xs}px` }}>
          {t('tracking.sosSheetTitle')}
        </h2>
        <p style={{ fontSize: 14, color: colors.textMuted, margin: `0 0 ${spacing.md}px` }}>
          {t('tracking.sosSheetSubtitle')}
        </p>

        {!url && !error && <CenteredSpinner />}
        {error && <p style={{ fontSize: 13, color: colors.danger, marginBottom: spacing.md }}>{error}</p>}

        {url && (
          <>
            <div style={{ marginBottom: spacing.sm }}>
              <Button
                label={t('tracking.sosWhatsapp')}
                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener')}
              />
            </div>
            <div style={{ marginBottom: spacing.sm }}>
              <Button
                label={t('tracking.sosSms')}
                variant="outline"
                onClick={() => {
                  window.location.href = `sms:?body=${encodeURIComponent(message)}`;
                }}
              />
            </div>
          </>
        )}

        <Button label={t('common.close')} onClick={onClose} variant="outline" />
      </div>
    </div>,
    document.body,
  );
}
