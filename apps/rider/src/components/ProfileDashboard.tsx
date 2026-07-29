import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { fetchMyAnandoRides } from '../api/anando';
import { fetchMyActiveDemLeguiRequest } from '../api/demLegui';
import { fetchProfileStats } from '../api/profile';
import { AnandoRide, DemLeguiRequest, ProfileStats, ProfileTripSummary } from '../api/types';
import { Coordinates, useMyLocation } from '../hooks/useMyLocation';
import { colors, radius, spacing } from '../theme';
import { isAnandoRideStale } from '../utils/anando';
import { AnandoLiveMap } from './AnandoLiveMap';

const ANANDO_ACTIVE_RIDE_STATUSES = ['open', 'full', 'in_progress'];

function StatTile({ icon, label, value, onPress }: { icon: string; label: string; value: string | number; onPress?: () => void }) {
  return (
    <Pressable style={styles.tile} onPress={onPress} disabled={!onPress}>
      <Text style={styles.tileIcon}>{icon}</Text>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </Pressable>
  );
}

function TripRow({
  icon,
  label,
  trip,
  emptyLabel,
  onPress,
}: {
  icon: string;
  label: string;
  trip: ProfileTripSummary | null;
  emptyLabel: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={[styles.tile, styles.tripRow]} onPress={trip ? onPress : undefined} disabled={!trip}>
      <Text style={styles.tileIcon}>{icon}</Text>
      <View style={styles.tripRowText}>
        <Text style={styles.tileLabel}>{label}</Text>
        {trip ? (
          <Text style={styles.tripRowValue} numberOfLines={1}>
            {trip.origin_city} → {trip.destination_city} · {trip.departure_date}
          </Text>
        ) : (
          <Text style={styles.tripRowEmpty}>{emptyLabel}</Text>
        )}
      </View>
    </Pressable>
  );
}

function ModuleTripRow({
  icon,
  label,
  routeText,
  statusText,
  emptyLabel,
  onPress,
}: {
  icon: string;
  label: string;
  routeText: string | null;
  statusText: string | null;
  emptyLabel: string;
  onPress?: () => void;
}) {
  const hasTrip = routeText != null;
  return (
    <Pressable style={[styles.tile, styles.tripRow]} onPress={hasTrip ? onPress : undefined} disabled={!hasTrip}>
      <Text style={styles.tileIcon}>{icon}</Text>
      <View style={styles.tripRowText}>
        <Text style={styles.tileLabel}>{label}</Text>
        {hasTrip ? (
          <Text style={styles.tripRowValue} numberOfLines={1}>
            {routeText} · {statusText}
          </Text>
        ) : (
          <Text style={styles.tripRowEmpty}>{emptyLabel}</Text>
        )}
      </View>
    </Pressable>
  );
}

export function ProfileDashboard() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [anandoActiveRide, setAnandoActiveRide] = useState<AnandoRide | null>(null);
  const [demLeguiActiveRequest, setDemLeguiActiveRequest] = useState<DemLeguiRequest | null>(null);
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [showPosition, setShowPosition] = useState(false);
  const { loading: locating, error: locationError, requestLocation } = useMyLocation();

  useEffect(() => {
    fetchProfileStats().then(setStats).catch(() => setStats(null));
    fetchMyAnandoRides()
      .then((res) => setAnandoActiveRide(res.data.find((ride) => ANANDO_ACTIVE_RIDE_STATUSES.includes(ride.status) && !isAnandoRideStale(ride)) ?? null))
      .catch(() => setAnandoActiveRide(null));
    fetchMyActiveDemLeguiRequest()
      .then(setDemLeguiActiveRequest)
      .catch(() => setDemLeguiActiveRequest(null));
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
    <View style={styles.container}>
      <View style={styles.grid}>
        <StatTile icon="🧭" label={t('profile.dashboard.trips')} value={stats.trips_count} />
        <StatTile icon="🎫" label={t('profile.dashboard.bookings')} value={stats.bookings_count} />
        <StatTile
          icon="🚗"
          label={t('profile.dashboard.myRides')}
          value={stats.anando_rides_count}
          onPress={() => navigation.navigate('ServicesTab', { screen: 'Anando', params: { initialTab: 'mine' } })}
        />
        <StatTile icon="👥" label={t('profile.dashboard.clients')} value={stats.anando_clients_count} />
        <StatTile icon="💰" label={t('profile.dashboard.earnings')} value={`${stats.earnings_total.toLocaleString()} FCFA`} />

        <TripRow
          icon="🟢"
          label={t('profile.dashboard.activeBooking')}
          trip={stats.active_booking}
          emptyLabel={t('profile.dashboard.noActiveBooking')}
          onPress={() =>
            stats.active_booking &&
            navigation.navigate('HomeTab', { screen: 'TripDetail', params: { tripId: stats.active_booking.id } })
          }
        />
        <TripRow
          icon="🕓"
          label={t('profile.dashboard.lastTrip')}
          trip={stats.last_trip}
          emptyLabel={t('profile.dashboard.noLastTrip')}
          onPress={() =>
            stats.last_trip &&
            navigation.navigate('HomeTab', { screen: 'TripDetail', params: { tripId: stats.last_trip.id } })
          }
        />

        <ModuleTripRow
          icon="🚗"
          label={t('profile.dashboard.myAnandoTrip')}
          routeText={anandoActiveRide ? `${anandoActiveRide.origin_city?.name} → ${anandoActiveRide.destination_city?.name}` : null}
          statusText={anandoActiveRide ? t(`anando.status.${anandoActiveRide.status}`) : null}
          emptyLabel={t('profile.dashboard.noActiveAnandoTrip')}
          onPress={() =>
            anandoActiveRide &&
            navigation.navigate('ServicesTab', { screen: 'AnandoRideDetail', params: { rideId: anandoActiveRide.id } })
          }
        />
        <ModuleTripRow
          icon="🚕"
          label={t('profile.dashboard.myDemLeguiTrip')}
          routeText={demLeguiActiveRequest ? t('demLegui.tripToLabel', { city: demLeguiActiveRequest.destination_city?.name ?? '—' }) : null}
          statusText={demLeguiActiveRequest ? t(`demLegui.status.${demLeguiActiveRequest.status}`) : null}
          emptyLabel={t('profile.dashboard.noActiveDemLeguiTrip')}
          onPress={() =>
            demLeguiActiveRequest &&
            navigation.navigate('ServicesTab', { screen: 'DemLeguiRequestDetail', params: { requestId: demLeguiActiveRequest.id } })
          }
        />

        <Pressable style={[styles.tile, styles.tripRow]} onPress={handleShowPosition}>
          <Text style={styles.tileIcon}>📍</Text>
          <View style={styles.tripRowText}>
            <Text style={styles.tileLabel}>{t('profile.dashboard.myPosition')}</Text>
            <Text style={styles.tripRowValue}>
              {locating
                ? t('profile.dashboard.locating')
                : showPosition
                  ? t('profile.dashboard.hidePosition')
                  : t('profile.dashboard.showPosition')}
            </Text>
          </View>
        </Pressable>
      </View>

      {locationError ? <Text style={styles.error}>{locationError}</Text> : null}

      {showPosition && position ? (
        <View style={styles.mapWrapper}>
          <AnandoLiveMap currentLatitude={position.latitude} currentLongitude={position.longitude} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: '47%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  tileIcon: { fontSize: 22, marginBottom: 2 },
  tileValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  tileLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  tripRow: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tripRowText: { flex: 1 },
  tripRowValue: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 2 },
  tripRowEmpty: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.sm },
  mapWrapper: { marginTop: spacing.sm },
});
