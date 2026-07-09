import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { updateProfile } from '../../api/auth';
import { extractErrorMessage } from '../../api/client';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing } from '../../theme';

export function ProfileSetupPage() {
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
      <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm }}>
        Parlez-nous de vous
      </h1>
      <p style={{ fontSize: 15, color: colors.textMuted, marginBottom: spacing.lg }}>Votre nom suffit pour commencer.</p>

      <TextField label="Nom complet" placeholder="Awa Ndiaye" value={name} onChange={(e) => setName(e.target.value)} error={error} />
      <TextField
        label="E-mail (facultatif)"
        placeholder="awa@example.com"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Button label="Terminer" type="submit" loading={loading} disabled={name.trim().length < 2} />
    </form>
  );
}
