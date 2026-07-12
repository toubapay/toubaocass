import { useEffect, useState } from 'react';

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
  const [query, setQuery] = useState(value?.name ?? '');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    setQuery(value?.name ?? '');
  }, [value]);

  const filtered = query.trim()
    ? cities.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()))
    : cities;

  return (
    <div style={{ marginBottom: spacing.md, position: 'relative' }}>
      <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: colors.text, marginBottom: spacing.xs }}>
        {label}
      </label>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (value) onChange(null);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder={placeholder ?? 'Sélectionner une ville'}
        style={{
          width: '100%',
          border: `1px solid ${colors.border}`,
          borderRadius: radius.sm,
          padding: '14px 16px',
          fontSize: 18,
          color: colors.text,
          backgroundColor: colors.surface,
        }}
      />
      {focused && filtered.length > 0 && (
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
          {filtered.map((city, i) => (
            <button
              key={city.id}
              type="button"
              onClick={() => {
                onChange(city);
                setQuery(city.name);
                setFocused(false);
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '10px 14px',
                border: 'none',
                borderBottom: i < filtered.length - 1 ? `1px solid ${colors.border}` : 'none',
                backgroundColor: 'transparent',
                fontSize: 15,
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
  );
}
