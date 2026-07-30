import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { fetchWallet } from '../api/wallet';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { ProfileDashboard } from '../components/ProfileDashboard';
import { Screen } from '../components/Screen';
import { setStoredLanguage, type SupportedLanguage } from '../i18n/i18n';
import { ProfileStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Profile'>;

export function ProfileScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    fetchWallet()
      .then((w) => setWalletBalance(w.balance))
      .catch(() => setWalletBalance(null));
  }, []);

  const language = i18n.language as SupportedLanguage;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>{t('profile.title')}</Text>

      <View style={styles.card}>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.meta}>{user?.phone}</Text>
        {user?.email ? <Text style={styles.meta}>{user.email}</Text> : null}
      </View>

      <Pressable style={styles.walletCard} onPress={() => navigation.navigate('Wallet')}>
        <View style={styles.walletLeft}>
          <Ionicons name="wallet" size={26} color="#fff" />
          <View>
            <Text style={styles.walletLabel}>{t('profile.wallet')}</Text>
            <Text style={styles.walletValue}>{walletBalance !== null ? `${walletBalance.toLocaleString()} FCFA` : '…'}</Text>
          </View>
        </View>
        <Text style={styles.walletArrow}>→</Text>
      </Pressable>

      <ProfileDashboard />

      <Pressable style={styles.settingsRow} onPress={() => navigation.navigate('MyDeliveries')}>
        <Text style={styles.settingsLabel}>{t('profile.myDeliveries')}</Text>
        <Text style={styles.settingsArrow}>→</Text>
      </Pressable>

      <Pressable style={styles.settingsRow} onPress={() => navigation.navigate('MyRideBookings')}>
        <Text style={styles.settingsLabel}>{t('profile.myRideBookings')}</Text>
        <Text style={styles.settingsArrow}>→</Text>
      </Pressable>

      <Pressable style={styles.settingsRow} onPress={() => navigation.navigate('Settings')}>
        <Text style={styles.settingsLabel}>{t('profile.settings')}</Text>
        <Text style={styles.settingsArrow}>→</Text>
      </Pressable>

      <View style={styles.languageCard}>
        <Text style={styles.languageTitle}>{t('profile.language')}</Text>
        <View style={styles.languageRow}>
          <Pressable
            style={[styles.languageButton, language === 'fr' && styles.languageButtonActive]}
            onPress={() => setStoredLanguage('fr')}
          >
            <Text style={[styles.languageButtonText, language === 'fr' && styles.languageButtonTextActive]}>
              {t('profile.languageFrench')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.languageButton, language === 'ar' && styles.languageButtonActive]}
            onPress={() => setStoredLanguage('ar')}
          >
            <Text style={[styles.languageButtonText, language === 'ar' && styles.languageButtonTextActive]}>
              {t('profile.languageArabic')}
            </Text>
          </Pressable>
        </View>
      </View>

      <Button label={t('profile.signOut')} onPress={signOut} variant="outline" />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 25, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontSize: 21, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  meta: { fontSize: 16, color: colors.textMuted },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  walletLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  walletLabel: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  walletValue: { fontSize: 21, fontWeight: '800', color: '#fff' },
  walletArrow: { fontSize: 21, color: '#fff' },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  settingsLabel: { fontSize: 19, fontWeight: '600', color: colors.text },
  settingsArrow: { fontSize: 21, color: colors.textMuted },
  languageCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  languageTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  languageRow: { flexDirection: 'row', gap: spacing.sm },
  languageButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  languageButtonActive: { borderColor: colors.primary, backgroundColor: colors.accentSoft },
  languageButtonText: { fontSize: 15, fontWeight: '700', color: colors.textMuted },
  languageButtonTextActive: { color: colors.primary },
});
