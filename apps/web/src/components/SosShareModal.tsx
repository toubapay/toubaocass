import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { extractErrorMessage } from '../api/client';
import { fetchShareLink, sendSosAlert } from '../api/tracking';
import { colors, radius, spacing } from '../theme';
import { Button } from './Button';
import { CenteredSpinner } from './Spinner';

export type ShareableRideKind = 'trips' | 'anando-rides' | 'dem-legui/trips' | 'deliveries';

/**
 * SOS "share my live position" bottom sheet — generates the 24h signed
 * tracking link then hands it straight to WhatsApp/SMS with a pre-filled
 * message, so family members get a real page (not raw JSON) without
 * needing an account. Only meant to be rendered while the ride is
 * in_progress; the caller controls that visibility. The title/subtitle/
 * message i18n keys can be overridden (e.g. for delivery tracking, where
 * "share my position" doesn't fit — it's the courier's position, shared by
 * the sender).
 */
export function SosShareModal({
  kind,
  rideId,
  onClose,
  titleKey = 'tracking.sosSheetTitle',
  subtitleKey = 'tracking.sosSheetSubtitle',
  messageKey = 'tracking.sosMessage',
}: {
  kind: ShareableRideKind;
  rideId: number | string;
  onClose: () => void;
  titleKey?: string;
  subtitleKey?: string;
  messageKey?: string;
}) {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendingAlert, setSendingAlert] = useState(false);
  const [alertSent, setAlertSent] = useState(false);

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

  const message = url ? t(messageKey, { url }) : '';

  const handleSendAlert = () => {
    if (!window.confirm(t('tracking.sosAlertConfirm') as string)) return;
    setSendingAlert(true);
    const send = (latitude?: number, longitude?: number) =>
      sendSosAlert(kind, rideId, latitude, longitude)
        .then(() => setAlertSent(true))
        .catch((err) => setError(extractErrorMessage(err)))
        .finally(() => setSendingAlert(false));

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => send(position.coords.latitude, position.coords.longitude),
        () => send(),
        { enableHighAccuracy: false, timeout: 5000 },
      );
    } else {
      send();
    }
  };

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
          {t(titleKey)}
        </h2>
        <p style={{ fontSize: 14, color: colors.textMuted, margin: `0 0 ${spacing.md}px` }}>
          {t(subtitleKey)}
        </p>

        {!url && !error && <CenteredSpinner />}
        {error && <p style={{ fontSize: 13, color: colors.danger, marginBottom: spacing.md }}>{error}</p>}

        {alertSent && (
          <p style={{ fontSize: 13.5, fontWeight: 700, color: colors.success, marginBottom: spacing.md }}>
            ✓ {t('tracking.sosAlertSent')}
          </p>
        )}

        <div style={{ marginBottom: spacing.md }}>
          <Button
            label={`🆘 ${t('tracking.sosAlertAdmin')}`}
            onClick={handleSendAlert}
            loading={sendingAlert}
            disabled={alertSent}
            variant="danger"
          />
        </div>

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
