import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { extractErrorMessage } from '../../api/client';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing } from '../../theme';

export function PhoneEntryPage() {
  const { t } = useTranslation();
  const { sendOtp } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('+221');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    try {
      await sendOtp(phone.trim());
      navigate('/verify', { state: { phone: phone.trim() } });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginTop: spacing.xl, marginBottom: spacing.xl * 1.5 }}>
        <h1 style={{ fontSize: 35, fontWeight: 800, color: colors.primary, margin: `0 0 ${spacing.sm}px` }}>{t('auth.phoneEntry.appName')}</h1>
        <p style={{ fontSize: 18, color: colors.textMuted, margin: 0 }}>{t('auth.phoneEntry.subtitle')}</p>
      </div>

      <TextField
        label={t('auth.phoneEntry.phoneLabel')}
        placeholder={t('auth.phoneEntry.phonePlaceholder')}
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        error={error}
      />

      <Button label={t('auth.phoneEntry.continue')} type="submit" loading={loading} />
    </form>
  );
}
