import type { City } from '../api/types';
import { colors, radius, spacing } from '../theme';

interface Props {
  label: string;
  cities: City[];
  value: City | null;
  onChange: (city: City | null) => void;
  placeholder?: string;
}

export function CityPicker({ label, cities, value, onChange, placeholder }: Props) {
  return (
    <div style={{ marginBottom: spacing.md }}>
      <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: colors.text, marginBottom: spacing.xs }}>
        {label}
      </label>
      <select
        value={value?.id ?? ''}
        onChange={(e) => {
          const id = e.target.value;
          onChange(id ? cities.find((c) => c.id === Number(id)) ?? null : null);
        }}
        style={{
          width: '100%',
          border: `1px solid ${colors.border}`,
          borderRadius: radius.sm,
          padding: '14px 16px',
          fontSize: 16,
          color: value ? colors.text : colors.textMuted,
          backgroundColor: colors.surface,
          appearance: 'none',
        }}
      >
        <option value="">{placeholder ?? 'Sélectionner une ville'}</option>
        {cities.map((city) => (
          <option key={city.id} value={city.id}>
            {city.name}
          </option>
        ))}
      </select>
    </div>
  );
}
