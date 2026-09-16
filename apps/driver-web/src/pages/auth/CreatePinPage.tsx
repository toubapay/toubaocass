import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { extractErrorMessage } from '../../api/client';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing } from '../../theme';

/**
 * Shown once, right after OTP verification, to anyone who doesn't have a
 * PIN yet (new sign-ups, or existing accounts predating this feature) —
 * from then on they can skip the SMS round-trip and log in with phone + PIN
 * (see PhoneEntryPage's "login" tab).
 */
export function CreatePinPage() {
  const { t } = useTranslation();
  const { setPin } = useAuth();
  const [pin, setPinValue] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin !== confirmPin) {
      setError(t('auth.createPin.mismatch'));
      return;
    }
    setError(undefined);
    setLoading(true);
    try {
      await setPin(pin);
      // No navigation needed here — once the user's has_pin flips true,
      // AppRoutes re-evaluates and moves on to the next required step
      // (profile setup, or straight home) on its own.
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm }}>
        {t('auth.createPin.title')}
      </h1>
      <p style={{ fontSize: 16, color: colors.textMuted, marginBottom: spacing.lg }}>{t('auth.createPin.subtitle')}</p>

      <TextField
        label={t('auth.createPin.pinLabel')}
        placeholder={t('auth.createPin.pinPlaceholder')}
        inputMode="numeric"
        type="password"
        maxLength={4}
        value={pin}
        onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))}
      />
      <TextField
        label={t('auth.createPin.confirmLabel')}
        placeholder={t('auth.createPin.pinPlaceholder')}
        inputMode="numeric"
        type="password"
        maxLength={4}
        value={confirmPin}
        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
        error={error}
      />

      <Button label={t('auth.createPin.finish')} type="submit" loading={loading} disabled={pin.length < 4 || confirmPin.length < 4} />
    </form>
  );
}
