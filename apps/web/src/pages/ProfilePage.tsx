import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { fetchWallet } from '../api/wallet';
import { Button } from '../components/Button';
import { ProfileDashboard } from '../components/ProfileDashboard';
import { WalletIcon } from '../components/WalletIcon';
import { useAuth } from '../context/AuthContext';
import type { UsePushNotifications } from '../hooks/usePushNotifications';
import { getStoredLanguage, setStoredLanguage, type SupportedLanguage } from '../i18n/i18n';
import { colors, radius, spacing } from '../theme';

/**
 * Receives the push-notifications hook result as a prop instead of calling
 * the hook itself — it needs to be a single instance mounted for the whole
 * authenticated session (see AppRoutes in App.tsx), not just while this
 * page happens to be open, otherwise the foreground onMessage() listener
 * that displays incoming pushes gets torn down the moment you navigate away
 * from Profile, silently dropping any push that arrives on another page.
 */
export function ProfilePage({ pushNotifications }: { pushNotifications: UsePushNotifications }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { permission, loading, error, enable } = pushNotifications;
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [language, setLanguage] = useState<SupportedLanguage>(getStoredLanguage());

  useEffect(() => {
    fetchWallet().then((w) => setWalletBalance(w.balance)).catch(() => setWalletBalance(null));
  }, []);

  const handleLanguageChange = (next: SupportedLanguage) => {
    setLanguage(next);
    setStoredLanguage(next);
  };

  return (
    <div>
      <h1 style={{ fontSize: 25, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>{t('profile.title')}</h1>

      <div
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: spacing.lg,
          marginBottom: spacing.md,
          border: `1px solid ${colors.border}`,
        }}
      >
        <p style={{ fontSize: 21, fontWeight: 700, color: colors.text, margin: `0 0 ${spacing.xs}px` }}>{user?.name}</p>
        <p style={{ fontSize: 16, color: colors.textMuted, margin: 0 }}>{user?.phone}</p>
        {user?.email && <p style={{ fontSize: 16, color: colors.textMuted, margin: 0 }}>{user.email}</p>}
      </div>

      <button
        onClick={() => navigate('/wallet')}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          border: 'none',
          borderRadius: radius.md,
          padding: spacing.lg,
          marginBottom: spacing.xl,
          backgroundColor: colors.primary,
          color: '#fff',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <WalletIcon size={26} color="#fff" detailColor={colors.primary} />
          <span>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 600, opacity: 0.85 }}>{t('profile.wallet')}</span>
            <span style={{ display: 'block', fontSize: 21, fontWeight: 800 }}>
              {walletBalance !== null ? `${walletBalance.toLocaleString()} FCFA` : '…'}
            </span>
          </span>
        </span>
        <span style={{ fontSize: 21 }}>→</span>
      </button>

      <ProfileDashboard />

      <button
        onClick={() => navigate('/deliveries')}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          padding: spacing.lg,
          marginBottom: spacing.md,
          backgroundColor: colors.surface,
          color: colors.text,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 600 }}>{t('profile.myDeliveries')}</span>
        <span style={{ fontSize: 21, color: colors.textMuted }}>→</span>
      </button>

      <button
        onClick={() => navigate('/settings')}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          padding: spacing.lg,
          marginBottom: spacing.lg,
          backgroundColor: colors.surface,
          color: colors.text,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 600 }}>{t('profile.settings')}</span>
        <span style={{ fontSize: 21, color: colors.textMuted }}>→</span>
      </button>

      {permission !== 'unsupported' && (
        <div style={{ marginBottom: spacing.lg }}>
          {permission === 'granted' ? (
            <p style={{ fontSize: 15, color: colors.success, fontWeight: 600 }}>{t('profile.notificationsEnabled')}</p>
          ) : permission === 'denied' ? (
            <p style={{ fontSize: 15, color: colors.textMuted }}>{t('profile.notificationsBlocked')}</p>
          ) : (
            <Button label={t('profile.enableNotifications')} onClick={enable} loading={loading} variant="outline" />
          )}
          {error && <p style={{ fontSize: 14, color: colors.danger, marginTop: spacing.xs }}>{error}</p>}
        </div>
      )}

      <div
        style={{
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          padding: spacing.lg,
          marginBottom: spacing.lg,
        }}
      >
        <p style={{ fontSize: 15, fontWeight: 600, color: colors.text, margin: `0 0 ${spacing.sm}px` }}>{t('profile.language')}</p>
        <div style={{ display: 'flex', gap: spacing.sm }}>
          <button
            onClick={() => handleLanguageChange('fr')}
            style={{
              flex: 1,
              border: `1.5px solid ${language === 'fr' ? colors.primary : colors.border}`,
              borderRadius: radius.sm,
              padding: `${spacing.sm}px 0`,
              backgroundColor: language === 'fr' ? colors.accentSoft : colors.surface,
              color: language === 'fr' ? colors.primary : colors.textMuted,
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            {t('profile.languageFrench')}
          </button>
          <button
            onClick={() => handleLanguageChange('ar')}
            style={{
              flex: 1,
              border: `1.5px solid ${language === 'ar' ? colors.primary : colors.border}`,
              borderRadius: radius.sm,
              padding: `${spacing.sm}px 0`,
              backgroundColor: language === 'ar' ? colors.accentSoft : colors.surface,
              color: language === 'ar' ? colors.primary : colors.textMuted,
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            {t('profile.languageArabic')}
          </button>
        </div>
      </div>

      <Button label={t('profile.signOut')} onClick={signOut} variant="outline" />
    </div>
  );
}
