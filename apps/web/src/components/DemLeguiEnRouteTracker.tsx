import { useState } from 'react';
import { createPortal } from 'react-dom';
import { APIProvider, AdvancedMarker, Map, Polyline } from '@vis.gl/react-google-maps';
import { useTranslation } from 'react-i18next';

import type { DemLeguiRequest, DemLeguiTrip } from '../api/types';
import { colors, radius, spacing } from '../theme';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

function CarMarkerIcon() {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        backgroundColor: colors.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(19,26,23,0.35)',
        border: '2px solid #fff',
        fontSize: 18,
      }}
    >
      🚗
    </div>
  );
}

function PickupPinIcon() {
  return (
    <div style={{ fontSize: 30, lineHeight: 1, filter: 'drop-shadow(0 2px 3px rgba(19,26,23,0.35))' }}>📍</div>
  );
}

/**
 * Full-screen, Uber-style tracking view for the window between "driver
 * accepted my Dem Légui request" and "trip started" — i.e. trip.status ===
 * 'open'. Replaces the whole app chrome (header/bottom nav) with a
 * full-bleed map + bottom sheet, matching how every mainstream ride-hailing
 * app shows this specific moment, since that's what was asked for
 * literally ("use a screen like this"). Deliberately NOT reused for the
 * later "in_progress" (heading to destination) state — that one wasn't
 * part of the ask, and AnandoLiveMap (embedded, small) already covers it
 * adequately there and everywhere else it's used across the app.
 */
export function DemLeguiEnRouteTracker({
  request,
  trip,
  onClose,
  onChat,
  onCancel,
  cancelling,
}: {
  request: DemLeguiRequest;
  trip: DemLeguiTrip;
  onClose: () => void;
  onChat: () => void;
  onCancel: () => void;
  cancelling: boolean;
}) {
  const { t } = useTranslation();
  const [detailsOpen, setDetailsOpen] = useState(false);

  const driverLat = trip.driver.current_latitude;
  const driverLng = trip.driver.current_longitude;
  const hasDriverPosition = driverLat != null && driverLng != null;
  const driverPos = hasDriverPosition ? { lat: driverLat as number, lng: driverLng as number } : null;
  const pickupPos = { lat: request.pickup_latitude, lng: request.pickup_longitude };
  const hasArrived = trip.arrived_at != null;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, backgroundColor: colors.background }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        {GOOGLE_MAPS_API_KEY && driverPos ? (
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <Map
              id="dem-legui-en-route-map"
              mapId="dem-legui-en-route-map"
              defaultCenter={driverPos}
              defaultZoom={14}
              disableDefaultUI
              zoomControl
              style={{ width: '100%', height: '100%' }}
            >
              <Polyline path={[driverPos, pickupPos]} strokeColor={colors.primary} strokeWeight={4} strokeOpacity={0.85} />
              <AdvancedMarker position={driverPos}>
                <CarMarkerIcon />
              </AdvancedMarker>
              <AdvancedMarker position={pickupPos}>
                <PickupPinIcon />
              </AdvancedMarker>
            </Map>
          </APIProvider>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
            <span style={{ fontSize: 13.5, color: colors.textMuted }}>{t('demLegui.liveMapWaiting')}</span>
          </div>
        )}
      </div>

      <button
        onClick={onClose}
        aria-label={t('common.back') as string}
        style={{
          position: 'absolute',
          top: `calc(${spacing.md}px + env(safe-area-inset-top))`,
          left: spacing.md,
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: 'none',
          backgroundColor: colors.surface,
          color: colors.text,
          fontSize: 20,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(19,26,23,0.2)',
        }}
      >
        ←
      </button>

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.surface,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          padding: spacing.lg,
          paddingBottom: `calc(${spacing.lg}px + env(safe-area-inset-bottom))`,
          boxShadow: '0 -8px 24px rgba(19,26,23,0.16)',
          maxHeight: '55vh',
          overflowY: 'auto',
        }}
      >
        <button
          onClick={() => setDetailsOpen((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', padding: 0, cursor: 'pointer', marginBottom: spacing.md }}
        >
          <span style={{ fontSize: 21, fontWeight: 800, color: colors.text }}>
            {hasArrived ? `🚩 ${t('demLegui.driverArrivedBadge')}` : t('demLegui.etaMinutes', { minutes: request.eta_minutes ?? '…' })}
          </span>
          <span style={{ fontSize: 18, color: colors.textMuted, transform: detailsOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
            ›
          </span>
        </button>

        {detailsOpen && (
          <div style={{ backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', margin: `0 0 4px` }}>{t('demLegui.pickup')}</p>
            <p style={{ fontSize: 14, color: colors.text, margin: `0 0 ${spacing.sm}px` }}>{request.pickup_address}</p>
            <p style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', margin: `0 0 4px` }}>{t('demLegui.fare')}</p>
            <p style={{ fontSize: 16, fontWeight: 800, color: colors.primary, margin: 0 }}>{request.fare_total.toLocaleString()} FCFA</p>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            {trip.driver.photo_url ? (
              <img
                src={trip.driver.photo_url}
                alt=""
                style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  backgroundColor: colors.accentSoft,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  fontWeight: 700,
                  color: colors.primary,
                  flexShrink: 0,
                }}
              >
                {(trip.driver.name ?? '').trim().charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <div>
              <p style={{ fontSize: 17, fontWeight: 700, color: colors.text, margin: 0 }}>
                {trip.driver.name} <span style={{ fontWeight: 600, color: colors.textMuted }}>★{trip.driver.rating.toFixed(2)}</span>
              </p>
              {trip.car && (
                <p style={{ fontSize: 14, color: colors.textMuted, margin: '2px 0 0' }}>
                  {trip.car.color ? `${trip.car.color} ` : ''}
                  {trip.car.make} {trip.car.model}
                </p>
              )}
            </div>
          </div>
          {trip.car?.photo_url ? (
            <img src={trip.car.photo_url} alt="" style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: radius.sm }} />
          ) : (
            <span style={{ fontSize: 34 }}>🚗</span>
          )}
        </div>

        {trip.car && (
          <div
            style={{
              display: 'inline-block',
              border: `1.5px solid ${colors.text}`,
              borderRadius: radius.sm,
              padding: '4px 12px',
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: 1,
              color: colors.text,
              marginBottom: spacing.md,
            }}
          >
            {trip.car.plate_number}
          </div>
        )}

        <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.sm }}>
          <a
            href={`tel:${trip.driver.phone}`}
            style={{
              flex: 1,
              textAlign: 'center',
              textDecoration: 'none',
              border: 'none',
              borderRadius: radius.sm,
              padding: `${spacing.sm}px 0`,
              backgroundColor: colors.success,
              color: '#fff',
              fontWeight: 700,
              fontSize: 14.5,
            }}
          >
            📞 {t('demLegui.call')}
          </a>
          <button
            onClick={onChat}
            style={{
              flex: 1,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.sm,
              padding: `${spacing.sm}px 0`,
              backgroundColor: colors.background,
              color: colors.text,
              fontWeight: 700,
              fontSize: 14.5,
              cursor: 'pointer',
            }}
          >
            💬 {t('demLegui.chat')}
          </button>
        </div>

        <button
          onClick={onCancel}
          disabled={cancelling}
          style={{
            width: '100%',
            border: 'none',
            background: 'none',
            color: colors.danger,
            fontWeight: 600,
            fontSize: 13.5,
            padding: `${spacing.xs}px 0`,
            cursor: cancelling ? 'default' : 'pointer',
            opacity: cancelling ? 0.6 : 1,
          }}
        >
          {t('demLegui.cancelRequest')}
        </button>
      </div>
    </div>,
    document.body,
  );
}
