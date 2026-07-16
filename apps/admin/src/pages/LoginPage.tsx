import React, { useState } from 'react';

import { extractErrorMessage } from '../api/client';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { useAdminAuth } from '../context/AdminAuthContext';
import { colors, radius, spacing } from '../theme';

export function LoginPage() {
  const { signIn } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 380,
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          padding: spacing.xl,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 800, color: colors.primary, margin: `0 0 ${spacing.xs}px` }}>
          Intercity Admin
        </h1>
        <p style={{ fontSize: 14, color: colors.textMuted, margin: `0 0 ${spacing.lg}px` }}>
          Connectez-vous avec vos identifiants administrateur.
        </p>

        <TextField
          label="E-mail"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextField
          label="Mot de passe"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error}
          required
        />

        <Button label="Se connecter" type="submit" loading={loading} style={{ width: '100%', marginTop: spacing.sm }} />
      </form>
    </div>
  );
}
