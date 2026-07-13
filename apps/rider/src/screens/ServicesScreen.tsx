import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../components/Screen';
import { ServicesStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<ServicesStackParamList, 'Services'>;

const SERVICES: { key: string; label: string; description: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'livraison', label: 'Livraison', description: 'Envoi de colis en ville et entre villes', icon: 'cube-outline' },
  { key: 'cargaison', label: 'Cargaison', description: 'Transport de marchandises en gros volume', icon: 'boat-outline' },
  { key: 'camion', label: 'Camion', description: 'Déménagement et transport de gros objets', icon: 'bus-outline' },
  { key: 'location', label: 'Location', description: 'Location de véhicules avec ou sans chauffeur', icon: 'key-outline' },
];

export function ServicesScreen({ navigation }: Props) {
  return (
    <Screen>
      <Text style={styles.title}>Services</Text>
      {SERVICES.map((service) => (
        <Pressable
          key={service.key}
          style={styles.card}
          onPress={() =>
            service.key === 'livraison'
              ? navigation.navigate('NewDelivery')
              : Alert.alert('Bientôt disponible', `${service.label} arrive prochainement.`)
          }
        >
          <View style={styles.iconWrap}>
            <Ionicons name={service.icon} size={24} color={colors.primary} />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.label}>{service.label}</Text>
            <Text style={styles.description}>{service.description}</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 25, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textWrap: { flex: 1 },
  label: { fontSize: 18, fontWeight: '700', color: colors.text },
  description: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  arrow: { fontSize: 21, color: colors.textMuted },
});
