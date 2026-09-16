import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { extractErrorMessage } from '../../api/client';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing } from '../../theme';

type Mode = 'login' | 'register';

export function PhoneEntryPage() {
  const { t } = useTranslation();
  const { sendOtp, confirmPin } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [phone, setPhone] = useState('+221');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const switchMode = (next: Mode) => {
    setMode(next);
    setPin('');
    setError(undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    try {
      if (mode === 'login') {
        await confirmPin(phone.trim(), pin.trim());
        navigate('/', { replace: true });
      } else {
        await sendOtp(phone.trim());
        navigate('/verify', { state: { phone: phone.trim() } });
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled = mode === 'login' ? phone.trim().length < 8 || pin.length < 4 : phone.trim().length < 8;

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginTop: spacing.xl, marginBottom: spacing.xl * 1.5 }}>
        <h1 style={{ fontSize: 35, fontWeight: 800, color: colors.primary, margin: `0 0 ${spacing.sm}px` }}>{t('auth.phoneEntry.appName')}</h1>
        <p style={{ fontSize: 18, color: colors.textMuted, margin: 0 }}>{t('auth.phoneEntry.subtitle')}</p>
      </div>

      <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.lg }}>
        <button
          type="button"
          onClick={() => switchMode('login')}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: 8,
            border: `1.5px solid ${colors.primary}`,
            backgroundColor: mode === 'login' ? colors.primary : 'transparent',
            color: mode === 'login' ? '#fff' : colors.primary,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {t('auth.phoneEntry.tabLogin')}
        </button>
        <button
          type="button"
          onClick={() => switchMode('register')}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: 8,
            border: `1.5px solid ${colors.primary}`,
            backgroundColor: mode === 'register' ? colors.primary : 'transparent',
            color: mode === 'register' ? '#fff' : colors.primary,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {t('auth.phoneEntry.tabRegister')}
        </button>
      </div>

      <TextField
        label={t('auth.phoneEntry.phoneLabel')}
        placeholder={t('auth.phoneEntry.phonePlaceholder')}
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        error={mode === 'register' ? error : undefined}
      />

      {mode === 'login' && (
        <TextField
          label={t('auth.phoneEntry.pinLabel')}
          placeholder={t('auth.phoneEntry.pinPlaceholder')}
          inputMode="numeric"
          type="password"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          error={error}
        />
      )}

      <Button
        label={mode === 'login' ? t('auth.phoneEntry.login') : t('auth.phoneEntry.continue')}
        type="submit"
        loading={loading}
        disabled={isSubmitDisabled}
      />
    </form>
  );
}
