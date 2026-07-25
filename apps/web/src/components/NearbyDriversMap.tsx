import { APIProvider, AdvancedMarker, Map } from '@vis.gl/react-google-maps';

import { colors, radius } from '../theme';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

interface NearbyDriver {
  latitude: number;
  longitude: number;
}

interface Props {
  pickupLatitude: number;
  pickupLongitude: number;
  drivers: NearbyDriver[];
}

function Dot({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <span
      style={{
        display: 'block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        border: '2px solid #fff',
        boxShadow: `0 0 0 2px ${color}`,
        animation: 'pulse 1.3s ease-in-out infinite',
      }}
    />
  );
}

/**
 * "Searching for a driver…" preview: the pickup point plus the current,
 * anonymized positions of online drivers nearby (no name/phone — they
 * haven't accepted anything yet). Refreshed by the caller on an interval,
 * same "recent position, not a live socket" honesty as AnandoLiveMap.
 */
export function NearbyDriversMap({ pickupLatitude, pickupLongitude, drivers }: Props) {
  const pickupPos = { lat: pickupLatitude, lng: pickupLongitude };

  const containerStyle = {
    height: 200,
    borderRadius: radius.md,
    overflow: 'hidden' as const,
    border: `1px solid ${colors.border}`,
    position: 'relative' as const,
    zIndex: 0,
    marginBottom: 16,
  };

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.surface }}>
        <span style={{ fontSize: 13, color: colors.textMuted }}>
          {pickupLatitude.toFixed(5)}, {pickupLongitude.toFixed(5)}
        </span>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <Map
          id="dem-legui-nearby-drivers-map"
          mapId="dem-legui-nearby-drivers-map"
          defaultCenter={pickupPos}
          defaultZoom={14}
          disableDefaultUI
          zoomControl
          style={{ width: '100%', height: '100%' }}
        >
          <AdvancedMarker position={pickupPos}>
            <Dot color={colors.accent} size={18} />
          </AdvancedMarker>
          {drivers.map((driver, index) => (
            <AdvancedMarker key={index} position={{ lat: driver.latitude, lng: driver.longitude }}>
              <span style={{ fontSize: 20 }}>🚕</span>
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}
