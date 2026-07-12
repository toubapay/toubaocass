import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { fetchCities } from '../api/cities';
import { searchTrips } from '../api/trips';
import type { City, Trip } from '../api/types';
import { fetchWallet } from '../api/wallet';
import { CenteredSpinner } from '../components/Spinner';
import { CityPicker } from '../components/CityPicker';
import { TripCard } from '../components/TripCard';
import { TripsMap } from '../components/TripsMap';
import { WalletIcon } from '../components/WalletIcon';
import { useMyLocation } from '../hooks/useMyLocation';
import type { Coordinates } from '../hooks/useMyLocation';
import { colors, radius, spacing } from '../theme';

const NEARBY_RADIUS_KM = 25;

export function HomePage() {
  const navigate = useNavigate();
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [origin, setOrigin] = useState<City | null>(null);
  const [destination, setDestination] = useState<City | null>(null);
  const [date, setDate] = useState('');
  const [seats, setSeats] = useState(1);
  const [nearMe, setNearMe] = useState<Coordinates | null>(null);

  const { loading: locating, error: locationError, requestLocation } = useMyLocation();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [citySearch, setCitySearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchCities().then(setCities).catch(() => setCities([]));
  }, []);

  useEffect(() => {
    fetchWallet().then((w) => setWalletBalance(w.balance)).catch(() => setWalletBalance(null));
  }, []);

  const hasFilters = origin || destination || date || nearMe;
  const invalidRoute = origin && destination && origin.id === destination.id;

  const load = useCallback(
    (pageToLoad: number) => {
      if (invalidRoute) return;
      setLoading(true);
      setError(undefined);
      searchTrips({
        origin_city_id: origin?.id,
        destination_city_id: destination?.id,
        date: date || undefined,
        seats,
        lat: nearMe?.latitude,
        lng: nearMe?.longitude,
        radius_km: nearMe ? NEARBY_RADIUS_KM : undefined,
        page: pageToLoad,
      })
        .then((res) => {
          setTrips(res.data);
          setLastPage(res.meta?.last_page ?? 1);
          setTotal(res.meta?.total ?? res.data.length);
        })
        .catch(() => setError('Impossible de charger les trajets. Réessayez.'))
        .finally(() => setLoading(false));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [origin, destination, date, seats, nearMe, invalidRoute],
  );

  // Any filter change starts back over at page 1 — a page number from a
  // previous filter combination has no guaranteed meaning under a new one.
  useEffect(() => {
    setPage(1);
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, date, seats, nearMe]);

  const goToPage = (nextPage: number) => {
    setPage(nextPage);
    load(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setOrigin(null);
    setDestination(null);
    setDate('');
    setNearMe(null);
  };

  const query = citySearch.trim().toLowerCase();
  const visibleTrips = query
    ? trips.filter((trip) => `${trip.origin_city?.name ?? ''} ${trip.destination_city?.name ?? ''}`.toLowerCase().includes(query))
    : trips;

  const citySuggestions = query
    ? cities.filter((city) => city.name.toLowerCase().includes(query) && city.name.toLowerCase() !== query).slice(0, 6)
    : [];

  function selectCitySuggestion(name: string) {
    setCitySearch(name);
    setSearchFocused(false);
  }

  const toggleNearMe = async () => {
    if (nearMe) {
      setNearMe(null);
      return;
    }
    const coords = await requestLocation();
    if (coords) {
      setNearMe(coords);
    } else if (locationError) {
      alert(locationError);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.md }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, margin: 0 }}>Choisissez votre Destination</h1>
        <button
          onClick={() => navigate('/wallet')}
          aria-label="Mon portefeuille"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            border: 'none',
            borderRadius: radius.lg,
            padding: '8px 12px',
            backgroundColor: colors.accentSoft,
            color: colors.accent,
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <WalletIcon size={16} color={colors.accent} />
          {walletBalance !== null ? `${walletBalance.toLocaleString()} F` : '…'}
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: spacing.sm }}>
        <span style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', fontSize: 17, pointerEvents: 'none' }}>
          🔍
        </span>
        <input
          value={citySearch}
          onChange={(e) => setCitySearch(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
          placeholder="Où allez-vous ?"
          style={{
            width: '100%',
            border: 'none',
            borderRadius: 28,
            padding: '16px 44px 16px 48px',
            fontSize: 16,
            color: colors.text,
            backgroundColor: colors.surface,
            boxShadow: '0 4px 16px rgba(19, 26, 23, 0.1)',
          }}
        />
        {citySearch && (
          <button
            onClick={() => setCitySearch('')}
            aria-label="Effacer la recherche"
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              border: 'none',
              background: 'none',
              color: colors.textMuted,
              fontSize: 18,
              cursor: 'pointer',
              padding: 6,
            }}
          >
            ✕
          </button>
        )}
        {searchFocused && citySuggestions.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 50,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.sm,
              marginTop: 4,
              maxHeight: 220,
              overflowY: 'auto',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          >
            {citySuggestions.map((city, i) => (
              <button
                key={city.id}
                onClick={() => selectCitySuggestion(city.name)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 14px',
                  border: 'none',
                  borderBottom: i < citySuggestions.length - 1 ? `1px solid ${colors.border}` : 'none',
                  backgroundColor: 'transparent',
                  fontSize: 15.0,
                  color: colors.text,
                  cursor: 'pointer',
                }}
              >
                📍 {city.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={toggleNearMe}
        style={{
          width: '100%',
          border: `1px solid ${colors.primary}`,
          borderRadius: radius.md,
          padding: '12px 0',
          marginBottom: spacing.md,
          backgroundColor: nearMe ? colors.primary : 'transparent',
          color: nearMe ? '#fff' : colors.primary,
          fontWeight: 700,
          fontSize: 15.0,
          cursor: 'pointer',
        }}
      >
        {locating
          ? '…'
          : nearMe
            ? `📍 Trajets affichés dans un rayon de ${NEARBY_RADIUS_KM} km`
            : '📍 Trouver des trajets près de moi'}
      </button>

      <div style={{ display: 'flex', gap: spacing.sm }}>
        <div style={{ flex: 1 }}>
          <CityPicker label="Départ" cities={cities} value={origin} onChange={setOrigin} placeholder="Toutes les villes" />
        </div>
        <div style={{ flex: 1 }}>
          <CityPicker label="Arrivée" cities={cities} value={destination} onChange={setDestination} placeholder="Toutes les villes" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: colors.text, marginBottom: spacing.xs }}>
            Date
          </label>
          <input
            type="date"
            value={date}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
            style={{
              width: '100%',
              border: `1px solid ${colors.border}`,
              borderRadius: radius.sm,
              padding: '13px 16px',
              fontSize: 16,
              color: colors.text,
              backgroundColor: colors.surface,
            }}
          />
        </div>
        <div style={{ width: 108 }}>
          <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: colors.text, marginBottom: spacing.xs }}>
            Places
          </label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              backgroundColor: colors.surface,
              padding: '0 8px',
              height: 46,
            }}
          >
            <button
              onClick={() => setSeats((s) => Math.max(1, s - 1))}
              style={{ border: 'none', background: 'none', fontSize: 20, fontWeight: 700, color: colors.primary, cursor: 'pointer', width: 28 }}
            >
              −
            </button>
            <span style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>{seats}</span>
            <button
              onClick={() => setSeats((s) => Math.min(9, s + 1))}
              style={{ border: 'none', background: 'none', fontSize: 20, fontWeight: 700, color: colors.primary, cursor: 'pointer', width: 28 }}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {hasFilters && (
        <button
          onClick={clearFilters}
          style={{ border: 'none', background: 'none', color: colors.primary, fontWeight: 600, fontSize: 14, cursor: 'pointer', padding: 0, marginTop: spacing.sm, marginBottom: spacing.sm }}
        >
          Effacer les filtres
        </button>
      )}
      {invalidRoute && (
        <p style={{ color: colors.danger, fontSize: 14, marginBottom: spacing.sm }}>
          La ville de départ et d'arrivée ne peuvent pas être identiques.
        </p>
      )}

      <div style={{ marginTop: spacing.md }}>
        {loading && trips.length === 0 ? (
          <CenteredSpinner />
        ) : (
          <>
            {error && <p style={{ color: colors.danger, fontSize: 14, marginBottom: spacing.sm }}>{error}</p>}
            {visibleTrips.length === 0 ? (
              <div style={{ marginTop: spacing.xl, textAlign: 'center', padding: `0 ${spacing.lg}px` }}>
                <p style={{ color: colors.textMuted, fontSize: 16 }}>
                  {query
                    ? `Aucun trajet ne correspond à "${citySearch.trim()}".`
                    : nearMe
                      ? `Aucun trajet ne part dans un rayon de ${NEARBY_RADIUS_KM} km pour l'instant.`
                      : hasFilters
                        ? "Aucun trajet trouvé pour ces filtres. Essayez d'élargir votre recherche."
                        : 'Aucun trajet à venir pour le moment — revenez bientôt.'}
                </p>
              </div>
            ) : (
              visibleTrips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onTripUpdated={(updated) => setTrips((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))}
                />
              ))
            )}

            {!query && lastPage > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: spacing.md,
                  marginBottom: spacing.md,
                }}
              >
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  style={{
                    border: `1.5px solid ${colors.primary}`,
                    borderRadius: radius.sm,
                    padding: '10px 16px',
                    backgroundColor: 'transparent',
                    color: colors.primary,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: page <= 1 ? 'default' : 'pointer',
                    opacity: page <= 1 ? 0.4 : 1,
                  }}
                >
                  ← Précédent
                </button>
                <span style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>
                  Page {page} sur {lastPage}
                  <br />
                  {total} trajet(s) au total
                </span>
                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= lastPage}
                  style={{
                    border: `1.5px solid ${colors.primary}`,
                    borderRadius: radius.sm,
                    padding: '10px 16px',
                    backgroundColor: 'transparent',
                    color: colors.primary,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: page >= lastPage ? 'default' : 'pointer',
                    opacity: page >= lastPage ? 0.4 : 1,
                  }}
                >
                  Suivant →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {!loading && (
        <div style={{ marginTop: spacing.lg }}>
          <TripsMap trips={visibleTrips} />
        </div>
      )}
    </div>
  );
}
