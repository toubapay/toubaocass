import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, radius, spacing } from '../theme';

interface Props {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time';
  minimumDate?: Date;
  placeholder?: string;
}

function format(date: Date, mode: 'date' | 'time'): string {
  if (mode === 'time') {
    return date.toTimeString().slice(0, 5);
  }
  return date.toISOString().slice(0, 10);
}

export function DateField({ label, value, onChange, mode = 'date', minimumDate, placeholder }: Props) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.selector} onPress={() => setVisible(true)}>
        <Text style={value ? styles.text : styles.placeholder}>
          {value ? format(value, mode) : placeholder ?? (mode === 'time' ? t('common.selectTime') : t('common.selectDate'))}
        </Text>
      </Pressable>

      {visible && (
        <DateTimePicker
          value={value ?? minimumDate ?? new Date()}
          mode={mode}
          minimumDate={minimumDate}
          display={Platform.OS === 'ios' ? (mode === 'date' ? 'inline' : 'spinner') : 'default'}
          onChange={(event, selected) => {
            setVisible(Platform.OS === 'ios');
            if (event.type === 'set' && selected) {
              onChange(selected);
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  selector: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.surface,
  },
  text: { fontSize: 18, color: colors.text },
  placeholder: { fontSize: 18, color: colors.textMuted },
});
