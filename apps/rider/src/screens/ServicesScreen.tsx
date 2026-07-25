import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '../components/Screen';
import { useModuleStatus } from '../context/ModuleStatusContext';
import { ServicesStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<ServicesStackParamList, 'Services'>;

const SERVICES: { key: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'dem_legui', icon: 'car-sport-outline' },
  { key: 'anando', icon: 'car-outline' },
  { key: 'livraison', icon: 'cube-outline' },
  { key: 'cargaison', icon: 'boat-outline' },
  { key: 'camion', icon: 'bus-outline' },
  { key: 'location', icon: 'key-outline' },
];

const LINKED_SERVICES: Record<string, keyof ServicesStackParamList> = {
  livraison: 'NewDelivery',
  anando: 'Anando',
  dem_legui: 'NewDemLeguiRequest',
};

export function ServicesScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { isModuleEnabled } = useModuleStatus();
  return (
    <Screen>
      <Text style={styles.title}>{t('services.title')}</Text>
      {SERVICES.filter((service) => isModuleEnabled(service.key)).map((service) => (
        <Pressable
          key={service.key}
          style={styles.card}
          onPress={() =>
            LINKED_SERVICES[service.key]
              ? navigation.navigate(LINKED_SERVICES[service.key] as 'NewDelivery' | 'Anando' | 'NewDemLeguiRequest')
              : Alert.alert(t('services.comingSoonTitle'), t('services.comingSoonBody', { label: t(`services.${service.key}.label`) }))
          }
        >
          <View style={styles.iconWrap}>
            <Ionicons name={service.icon} size={24} color={colors.primary} />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.label}>{t(`services.${service.key}.label`)}</Text>
            <Text style={styles.description}>{t(`services.${service.key}.description`)}</Text>
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
