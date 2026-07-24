import { useEffect, useRef } from 'react';
import { APIProvider, AdvancedMarker, Map, Polyline, useMap } from '@vis.gl/react-google-maps';
import { useTranslation } from 'react-i18next';

import { colors, radius } from '../theme';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

interface Props {
  currentLatitude: number;
  currentLongitude: number;
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
  destinationName?: string | null;
  updatedAt?: string | null;
}

function Dot({ color, pulse }: { color: string; pulse: boolean }) {
  return (
    <span
      style={{
        display: 'block',
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: color,
        border: '2px solid #fff',
        boxShadow: `0 0 0 2px ${color}`,
        animation: pulse ? 'pulse 1.3s ease-in-out infinite' : undefined,
      }}
    />
  );
}

// Pans the map to the poster's latest position on prop change, keeping
// whatever zoom level the viewer has chosen — skips the very first render
// since the map already opens centered there via defaultCenter.
function Recenter({ position }: { position: { lat: number; lng: number } }) {
  const map = useMap('anando-live-map');
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    map?.panTo(position);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position.lat, position.lng]);

  return null;
}

/**
 * Preview map for an in-progress Anando ride: the poster's last reported
 * position (pulsing dot), plus a dashed line to the destination city if we
 * know its coordinates. Position comes from polling the ride (see the ride
 * detail page), not a live socket, so the camera re-centers on prop change
 * rather than animating a continuous track. The map itself stays
 * zoomable/pannable so the viewer can inspect the surrounding area.
 */
export function AnandoLiveMap({
  currentLatitude,
  currentLongitude,
  destinationLatitude,
  destinationLongitude,
  destinationName,
  updatedAt,
}: Props) {
  const { t } = useTranslation();
  const hasDestination = destinationLatitude != null && destinationLongitude != null;
  const currentPos = { lat: currentLatitude, lng: currentLongitude };
  const destPos = hasDestination ? { lat: destinationLatitude as number, lng: destinationLongitude as number } : null;

  const containerStyle = {
    height: 200,
    borderRadius: radius.md,
    overflow: 'hidden' as const,
    border: `1px solid ${colors.border}`,
    position: 'relative' as const,
    zIndex: 0,
    marginBottom: 16,
  };

  const badge = updatedAt && (
    <div
      style={{
        position: 'absolute',
        bottom: 8,
        left: 8,
        background: 'rgba(19,26,23,0.75)',
        color: '#fff',
        borderRadius: 999,
        padding: '4px 10px',
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {t('anando.liveMapUpdated', { time: new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })}
    </div>
  );

  if (!GOOGLE_MAPS_API_KEY) {
    // No Google Maps API key configured — fall back to plain coordinates
    // rather than showing a broken/blank map.
    return (
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.surface }}>
        <span style={{ fontSize: 13, color: colors.textMuted }}>
          {currentLatitude.toFixed(5)}, {currentLongitude.toFixed(5)}
        </span>
        {badge}
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <Map
          id="anando-live-map"
          mapId="anando-live-map"
          defaultCenter={currentPos}
          defaultZoom={13}
          disableDefaultUI
          zoomControl
          style={{ width: '100%', height: '100%' }}
        >
          <Recenter position={currentPos} />
          {destPos && (
            <Polyline path={[currentPos, destPos]} strokeColor={colors.primary} strokeWeight={3} strokeOpacity={0.9} />
          )}
          <AdvancedMarker position={currentPos} title={t('anando.liveMapCurrentPosition')}>
            <Dot color={colors.primary} pulse />
          </AdvancedMarker>
          {destPos && (
            <AdvancedMarker position={destPos} title={destinationName ?? undefined}>
              <Dot color={colors.accent} pulse={false} />
            </AdvancedMarker>
          )}
        </Map>
      </APIProvider>
      {badge}
    </div>
  );
}
