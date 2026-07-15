import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

interface Props {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  placeholder?: string;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function DateField({ label, value, onChange, minimumDate, placeholder }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.selector} onPress={() => setVisible(true)}>
        <Text style={value ? styles.text : styles.placeholder}>
          {value ? formatDate(value) : placeholder ?? 'Sélectionner une date'}
        </Text>
      </Pressable>

      {visible && (
        <DateTimePicker
          value={value ?? minimumDate ?? new Date()}
          mode="date"
          minimumDate={minimumDate}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
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
    height: 46,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  text: { fontSize: 18, color: colors.text },
  placeholder: { fontSize: 18, color: colors.textMuted },
});
