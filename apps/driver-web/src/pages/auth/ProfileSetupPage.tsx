import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { updateProfile } from '../../api/auth';
import { extractErrorMessage } from '../../api/client';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing } from '../../theme';

export function ProfileSetupPage() {
  const { t } = useTranslation();
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    try {
      const user = await updateProfile({ name: name.trim(), email: email.trim() || undefined });
      setUser(user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm }}>
        {t('auth.profileSetup.title')}
      </h1>
      <p style={{ fontSize: 16, color: colors.textMuted, marginBottom: spacing.lg }}>{t('auth.profileSetup.subtitle')}</p>

      <TextField
        label={t('auth.profileSetup.nameLabel')}
        placeholder={t('auth.profileSetup.namePlaceholder')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={error}
      />
      <TextField
        label={t('auth.profileSetup.emailLabel')}
        placeholder={t('auth.profileSetup.emailPlaceholder')}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Button label={t('auth.profileSetup.finish')} type="submit" loading={loading} disabled={name.trim().length < 2} />
    </form>
  );
}
