import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

interface Props {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  placeholder?: string;
}

function toInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * @react-native-community/datetimepicker has no web implementation — it
 * silently renders nothing there — so the web build uses a plain HTML date
 * input instead. Native builds get the real platform picker (see
 * DateField.tsx, which Metro picks for iOS/Android automatically).
 */
export function DateField({ label, value, onChange, minimumDate, placeholder }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (!raw) return;
    const [year, month, day] = raw.split('-').map(Number);
    onChange(new Date(year, month - 1, day));
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <input
        type="date"
        value={value ? toInputValue(value) : ''}
        placeholder={placeholder}
        min={minimumDate ? toInputValue(minimumDate) : undefined}
        onChange={handleChange}
        style={webInputStyle}
      />
    </View>
  );
}

const webInputStyle: React.CSSProperties = {
  border: `1px solid ${colors.border}`,
  borderRadius: radius.sm,
  padding: `${spacing.sm + 4}px ${spacing.md}px`,
  backgroundColor: colors.surface,
  fontSize: 18,
  color: colors.text,
  fontFamily: 'inherit',
  width: '100%',
  boxSizing: 'border-box',
};

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
});
