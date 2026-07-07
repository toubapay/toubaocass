import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { City } from '../api/types';
import { colors, radius, spacing } from '../theme';

interface Props {
  label: string;
  cities: City[];
  value: City | null;
  onChange: (city: City) => void;
  placeholder?: string;
}

export function CityPicker({ label, cities, value, onChange, placeholder }: Props) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = cities.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.selector} onPress={() => setVisible(true)}>
        <Text style={value ? styles.selectorText : styles.placeholder}>
          {value ? value.name : placeholder ?? 'Sélectionner une ville'}
        </Text>
      </Pressable>

      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.modal}>
          <TextInput
            autoFocus
            placeholder="Rechercher une ville..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            style={styles.search}
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <Pressable
                style={styles.row}
                onPress={() => {
                  onChange(item);
                  setQuery('');
                  setVisible(false);
                }}
              >
                <Text style={styles.rowText}>{item.name}</Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
          <Pressable style={styles.closeButton} onPress={() => setVisible(false)}>
            <Text style={styles.closeText}>Annuler</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  selector: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.surface,
  },
  selectorText: { fontSize: 16, color: colors.text },
  placeholder: { fontSize: 16, color: colors.textMuted },
  modal: { flex: 1, backgroundColor: colors.background, paddingTop: 60, paddingHorizontal: spacing.md },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: 16,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  row: { paddingVertical: spacing.md },
  rowText: { fontSize: 16, color: colors.text },
  separator: { height: 1, backgroundColor: colors.border },
  closeButton: { paddingVertical: spacing.md, alignItems: 'center' },
  closeText: { color: colors.primary, fontWeight: '600', fontSize: 16 },
});
