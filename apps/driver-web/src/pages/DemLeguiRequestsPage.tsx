import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { extractErrorMessage } from '../api/client';
import { fetchMyCars } from '../api/cars';
import { acceptDemLeguiRequest, fetchAvailableDemLeguiRequests } from '../api/demLegui';
import type { Car, DemLeguiRequest } from '../api/types';
import { DriverAvailabilityToggle } from '../components/DriverAvailabilityToggle';
import { CenteredSpinner } from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';

export function DemLeguiRequestsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOnline = user?.driver_profile?.is_online ?? false;

  const [requests, setRequests] = useState<DemLeguiRequest[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [pendingRequest, setPendingRequest] = useState<DemLeguiRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!isOnline) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([fetchAvailableDemLeguiRequests(), fetchMyCars()])
      .then(([reqs, myCars]) => {
        setRequests(reqs.data);
        setCars(myCars.filter((c) => c.is_active));
      })
      .finally(() => setLoading(false));
  }, [isOnline]);

  useEffect(load, [load]);

  const doAccept = async (requestId: number, carId?: number) => {
    setAcceptingId(requestId);
    setError(null);
    try {
      const trip = await acceptDemLeguiRequest(requestId, carId);
      navigate(`/dem-legui/trips/${trip.id}`);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setAcceptingId(null);
      setPendingRequest(null);
    }
  };

  const handleAccept = (request: DemLeguiRequest) => {
    if (cars.length <= 1) {
      doAccept(request.id, cars[0]?.id);
      return;
    }
    setPendingRequest(request);
  };

  if (!isOnline) {
    return (
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>{t('demLegui.driverTitle')}</h1>
        <DriverAvailabilityToggle />
        <p style={{ color: colors.textMuted, fontSize: 15, textAlign: 'center', marginTop: spacing.lg }}>
          {t('demLegui.goOnlineToSeeRequests')}
        </p>
      </div>
    );
  }

  if (loading) return <CenteredSpinner />;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>{t('demLegui.driverTitle')}</h1>
      <DriverAvailabilityToggle />

      {error && <p style={{ color: colors.danger, fontSize: 14, marginBottom: spacing.md }}>{error}</p>}

      {pendingRequest && (
        <div
          style={{
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            padding: spacing.md,
            marginBottom: spacing.md,
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 700, color: colors.text, margin: `0 0 ${spacing.sm}px` }}>{t('demLegui.chooseCarTitle')}</p>
          {cars.map((car) => (
            <button
              key={car.id}
              onClick={() => doAccept(pendingRequest.id, car.id)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                border: `1px solid ${colors.border}`,
                borderRadius: radius.sm,
                padding: spacing.sm,
                marginBottom: spacing.xs,
                backgroundColor: colors.background,
                cursor: 'pointer',
              }}
            >
              {car.make} {car.model} · {car.plate_number}
            </button>
          ))}
          <button
            onClick={() => setPendingRequest(null)}
            style={{ border: 'none', background: 'none', color: colors.textMuted, fontSize: 13, cursor: 'pointer', padding: 0 }}
          >
            {t('common.cancel')}
          </button>
        </div>
      )}

      {requests.length === 0 ? (
        <p style={{ color: colors.textMuted, fontSize: 16, textAlign: 'center', margin: `${spacing.lg}px 0` }}>
          {t('demLegui.noRequestsNearby')}
        </p>
      ) : (
        requests.map((request) => (
          <div
            key={request.id}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: spacing.md,
              marginBottom: spacing.md,
              border: `1px solid ${colors.border}`,
            }}
          >
            <p style={{ fontSize: 18, fontWeight: 700, color: colors.text, margin: 0 }}>
              {t('demLegui.tripToLabel', { city: request.destination_city?.name })}
            </p>
            <p style={{ fontSize: 14, color: colors.textMuted, margin: `${spacing.xs}px 0 0` }}>📍 {request.pickup_address}</p>
            <p style={{ fontSize: 14, color: colors.textMuted, margin: '2px 0 0' }}>{t('anando.seatsBooked', { count: request.seats_requested })}</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: colors.primary, margin: `${spacing.xs}px 0 0` }}>
              {request.fare_total.toLocaleString()} FCFA
            </p>
            <button
              onClick={() => handleAccept(request)}
              disabled={acceptingId === request.id}
              style={{
                width: '100%',
                border: 'none',
                borderRadius: radius.sm,
                backgroundColor: colors.primary,
                color: '#fff',
                fontWeight: 700,
                fontSize: 15,
                padding: spacing.sm,
                marginTop: spacing.sm,
                cursor: acceptingId === request.id ? 'default' : 'pointer',
                opacity: acceptingId === request.id ? 0.7 : 1,
              }}
            >
              {acceptingId === request.id ? '…' : t('demLegui.acceptRequest')}
            </button>
          </div>
        ))
      )}
    </div>
  );
}
