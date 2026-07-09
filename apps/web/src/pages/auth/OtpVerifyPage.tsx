import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { extractErrorMessage } from '../../api/client';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing } from '../../theme';

export function OtpVerifyPage() {
  const { confirmOtp, sendOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const phone = (location.state as { phone?: string } | null)?.phone;

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  if (!phone) {
    navigate('/login', { replace: true });
    return null;
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    try {
      const user = await confirmOtp(phone, code.trim());
      if (!user.profile_complete) {
        navigate('/profile-setup', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await sendOtp(phone);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={handleVerify}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm }}>
        Saisissez le code
      </h1>
      <p style={{ fontSize: 15, color: colors.textMuted, marginBottom: spacing.lg }}>
        Nous avons envoyé un code de vérification par SMS au {phone}.
      </p>

      <TextField
        label="Code de vérification"
        placeholder="123456"
        inputMode="numeric"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        error={error}
      />

      <Button label="Vérifier" type="submit" loading={loading} disabled={code.length < 4} />
      <div style={{ marginTop: spacing.sm }}>
        <Button
          label={resending ? 'Envoi en cours...' : 'Renvoyer le code'}
          type="button"
          onClick={handleResend}
          loading={resending}
          variant="outline"
        />
      </div>
    </form>
  );
}
