import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { deleteProfilePhoto, uploadProfilePhoto } from '../api/auth';
import { fetchEarningsReport } from '../api/reports';
import { fetchWallet } from '../api/wallet';
import { Button } from '../components/Button';
import { MiniFinancialReportCard } from '../components/MiniFinancialReportCard';
import { ProfileDashboard } from '../components/ProfileDashboard';
import { ProfilePhotoUploader } from '../components/ProfilePhotoUploader';
import { WalletIcon } from '../components/WalletIcon';
import { useAuth } from '../context/AuthContext';
import { useModuleStatus } from '../context/ModuleStatusContext';
import type { UsePushNotifications } from '../hooks/usePushNotifications';
import { getStoredLanguage, setStoredLanguage, type SupportedLanguage } from '../i18n/i18n';
import { colors, radius, spacing } from '../theme';

export function ProfilePage({ pushNotifications }: { pushNotifications: UsePushNotifications }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, setUser, signOut } = useAuth();
  const { isModuleEnabled } = useModuleStatus();
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

  const kycStatus = user?.driver_profile?.kyc_status ?? 'pending';
  const rating = user?.driver_profile?.rating ?? 5;
  const tier = user?.driver_profile?.tier ?? 'debutant';
  const ratingsCount = user?.driver_profile?.ratings_count ?? 0;

  const TIER_STYLE: Record<string, { bg: string; fg: string; icon: string }> = {
    debutant: { bg: colors.border, fg: colors.textMuted, icon: '🌱' },
    silver: { bg: '#E5E9EC', fg: '#5B6770', icon: '🥈' },
    gold: { bg: '#FCEFC7', fg: colors.primary, icon: '🥇' },
  };
  const tierStyle = TIER_STYLE[tier] ?? TIER_STYLE.debutant;

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
        <ProfilePhotoUploader
          photoUrl={user?.photo_url ?? null}
          name={user?.name ?? null}
          onUpload={async (file) => setUser(await uploadProfilePhoto(file))}
          onRemove={async () => setUser(await deleteProfilePhoto())}
        />
        <p style={{ fontSize: 21, fontWeight: 700, color: colors.text, margin: `0 0 ${spacing.xs}px` }}>{user?.name}</p>
        <p style={{ fontSize: 16, color: colors.textMuted, margin: 0 }}>{user?.phone}</p>
        {user?.email && <p style={{ fontSize: 16, color: colors.textMuted, margin: 0 }}>{user.email}</p>}
        <p style={{ fontSize: 16, color: colors.text, fontWeight: 600, marginTop: spacing.sm, marginBottom: 0 }}>
          {t('profile.kycLabel', { status: t(`common.kycStatus.${kycStatus}`) })}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginTop: 2 }}>
          <p style={{ fontSize: 16, color: colors.textMuted, margin: 0 }}>{t('profile.rating', { value: rating.toFixed(1) })}</p>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              backgroundColor: tierStyle.bg,
              color: tierStyle.fg,
              borderRadius: radius.lg,
              padding: '2px 10px',
              fontSize: 12.5,
              fontWeight: 700,
            }}
          >
            {tierStyle.icon} {t(`profile.tier.${tier}`)}
          </span>
        </div>
        <button
          onClick={() => navigate('/ratings')}
          style={{ border: 'none', background: 'none', padding: 0, margin: '2px 0 0', cursor: 'pointer', display: 'block' }}
        >
          <span style={{ fontSize: 13, color: colors.primary, fontWeight: 600, textDecoration: 'underline' }}>
            {t('profile.ratingsCount', { count: ratingsCount })}
          </span>
        </button>
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

      <MiniFinancialReportCard
        title={t('earningsReport.title')}
        totalLabel={t('earningsReport.totalLabel')}
        fetchReport={fetchEarningsReport}
      />

      {isModuleEnabled('dem_legui') && (
        <button
          onClick={() => navigate('/dem-legui/history')}
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
          <span style={{ fontSize: 18, fontWeight: 600 }}>{t('profile.demLeguiHistory')}</span>
          <span style={{ fontSize: 21, color: colors.textMuted }}>→</span>
        </button>
      )}

      {isModuleEnabled('assurance') && (
        <button
          onClick={() => navigate('/insurance')}
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
          <span style={{ fontSize: 18, fontWeight: 600 }}>{t('profile.assuranceLink')}</span>
          <span style={{ fontSize: 21, color: colors.textMuted }}>→</span>
        </button>
      )}

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
