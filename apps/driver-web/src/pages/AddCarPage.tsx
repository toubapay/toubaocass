import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { createCar } from '../api/cars';
import { extractErrorMessage } from '../api/client';
import type { CarType } from '../api/types';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { colors, radius, spacing } from '../theme';

const CAR_TYPES: CarType[] = ['sedan', 'suv', 'van', 'minibus'];

export function AddCarPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [type, setType] = useState<CarType>('sedan');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [seats, setSeats] = useState('4');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const canSubmit = make.trim() && model.trim() && plateNumber.trim() && Number(seats) > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(undefined);
    setLoading(true);
    try {
      await createCar({
        type,
        make: make.trim(),
        model: model.trim(),
        year: year ? Number(year) : undefined,
        color: color.trim() || undefined,
        plate_number: plateNumber.trim(),
        seats: Number(seats),
      });
      navigate(-1);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: `${spacing.sm}px ${spacing.md}px`,
    borderRadius: radius.lg,
    border: `1px solid ${active ? colors.primary : colors.border}`,
    backgroundColor: active ? colors.primary : colors.surface,
    color: active ? '#fff' : colors.text,
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
  });

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        style={{ border: 'none', background: 'none', color: colors.textMuted, fontSize: 22, cursor: 'pointer', padding: 0, marginBottom: spacing.sm }}
      >
        ←
      </button>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>{t('fleet.addCarScreen.title')}</h1>

      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: colors.text, marginBottom: spacing.xs }}>
          {t('fleet.addCarScreen.typeLabel')}
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
          {CAR_TYPES.map((ct) => (
            <button type="button" key={ct} style={chipStyle(type === ct)} onClick={() => setType(ct)}>
              {t(`common.carType.${ct}`)}
            </button>
          ))}
        </div>

        <TextField label={t('fleet.addCarScreen.makeLabel')} placeholder={t('fleet.addCarScreen.makePlaceholder')} value={make} onChange={(e) => setMake(e.target.value)} />
        <TextField label={t('fleet.addCarScreen.modelLabel')} placeholder={t('fleet.addCarScreen.modelPlaceholder')} value={model} onChange={(e) => setModel(e.target.value)} />
        <TextField label={t('fleet.addCarScreen.yearLabel')} placeholder={t('fleet.addCarScreen.yearPlaceholder')} type="number" value={year} onChange={(e) => setYear(e.target.value)} />
        <TextField label={t('fleet.addCarScreen.colorLabel')} placeholder={t('fleet.addCarScreen.colorPlaceholder')} value={color} onChange={(e) => setColor(e.target.value)} />
        <TextField
          label={t('fleet.addCarScreen.plateLabel')}
          placeholder={t('fleet.addCarScreen.platePlaceholder')}
          value={plateNumber}
          onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
          error={error}
        />
        <TextField label={t('fleet.addCarScreen.seatsLabel')} type="number" value={seats} onChange={(e) => setSeats(e.target.value)} />

        <Button label={t('fleet.addCarScreen.submit')} type="submit" disabled={!canSubmit} loading={loading} />
      </form>
    </div>
  );
}
