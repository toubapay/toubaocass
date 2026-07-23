import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { deleteCar, fetchMyCars } from '../api/cars';
import { extractErrorMessage } from '../api/client';
import type { Car } from '../api/types';
import { Button } from '../components/Button';
import { CenteredSpinner } from '../components/Spinner';
import { useModuleStatus } from '../context/ModuleStatusContext';
import { colors, radius, spacing } from '../theme';

export function CarsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isModuleEnabled } = useModuleStatus();
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(() => {
    setLoading(true);
    fetchMyCars()
      .then(setCars)
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const handleDelete = async (car: Car) => {
    if (!confirm(t('fleet.deleteConfirmBody', { make: car.make, model: car.model, plate: car.plate_number }))) return;
    try {
      await deleteCar(car.id);
      load();
    } catch (e) {
      setError(extractErrorMessage(e));
    }
  };

  if (loading) return <CenteredSpinner />;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>{t('fleet.carsListTitle')}</h1>

      {error && <p style={{ fontSize: 14, color: colors.danger, marginBottom: spacing.sm }}>{error}</p>}

      {cars.length === 0 ? (
        <p style={{ color: colors.textMuted, fontSize: 16, textAlign: 'center', margin: `${spacing.lg}px 0` }}>{t('fleet.emptyCars')}</p>
      ) : (
        cars.map((car) => (
          <div
            key={car.id}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: spacing.md,
              marginBottom: spacing.md,
              border: `1px solid ${colors.border}`,
            }}
          >
            <p style={{ fontSize: 18, fontWeight: 700, color: colors.text, margin: 0 }}>
              {car.make} {car.model} ({car.year ?? t('fleet.yearFallback')})
            </p>
            <p style={{ fontSize: 14, color: colors.textMuted, marginTop: spacing.xs }}>
              {car.plate_number} · {t('fleet.seatsCount', { count: car.seats })} · {car.type.toUpperCase()}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm }}>
              {isModuleEnabled('assurance') && (
                <button
                  onClick={() => navigate(`/fleet/insurance-compare?carId=${car.id}&carLabel=${encodeURIComponent(`${car.make} ${car.model} (${car.plate_number})`)}`)}
                  style={{ border: 'none', background: 'none', color: colors.primary, fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 14 }}
                >
                  {t('fleet.insuranceLink')}
                </button>
              )}
              <button
                onClick={() => handleDelete(car)}
                style={{ border: 'none', background: 'none', color: colors.danger, fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 14, marginLeft: 'auto' }}
              >
                {t('fleet.remove')}
              </button>
            </div>
          </div>
        ))
      )}

      <Button label={t('fleet.myPolicies')} variant="outline" onClick={() => navigate('/fleet/my-policies')} style={{ marginBottom: spacing.sm }} />
      <Button label={t('fleet.addCar')} onClick={() => navigate('/fleet/add-car')} />
    </div>
  );
}
