import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { updateProfile } from '../api/auth';
import { createAddress, deleteAddress, fetchAddresses, updateAddress } from '../api/addresses';
import { extractErrorMessage } from '../api/client';
import type { Address } from '../api/types';
import { Button } from '../components/Button';
import { CenteredSpinner } from '../components/Spinner';
import { TextField } from '../components/TextField';
import { useAuth } from '../context/AuthContext';
import { useMyLocation } from '../hooks/useMyLocation';
import { colors, radius, spacing } from '../theme';

function AddressForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial?: Address;
  onCancel: () => void;
  onSaved: (address: Address) => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [addressLine, setAddressLine] = useState(initial?.address_line ?? '');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(
    initial?.latitude != null && initial?.longitude != null
      ? { latitude: initial.latitude, longitude: initial.longitude }
      : null,
  );
  const [isDefault, setIsDefault] = useState(initial?.is_default ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const { loading: locating, error: locationError, requestLocation } = useMyLocation();

  const handleUseLocation = async () => {
    const result = await requestLocation();
    if (result) setCoords(result);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setSaving(true);
    try {
      const payload = {
        label: label.trim(),
        address_line: addressLine.trim(),
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        is_default: isDefault,
      };
      const address = initial ? await updateAddress(initial.id, payload) : await createAddress(payload);
      onSaved(address);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        padding: spacing.md,
        marginBottom: spacing.md,
      }}
    >
      <TextField
        label="Libellé"
        placeholder="Domicile, Travail…"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <TextField
        label="Adresse"
        placeholder="Sacré-Cœur 3, Dakar"
        value={addressLine}
        onChange={(e) => setAddressLine(e.target.value)}
      />

      <button
        type="button"
        onClick={handleUseLocation}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          border: 'none',
          background: 'none',
          color: colors.accent,
          fontWeight: 600,
          fontSize: 14,
          cursor: 'pointer',
          padding: 0,
          marginBottom: spacing.sm,
        }}
      >
        📍 {locating ? 'Localisation…' : coords ? 'Position enregistrée ✓' : 'Utiliser ma position actuelle'}
      </button>
      {locationError && <p style={{ fontSize: 13, color: colors.danger, marginTop: -8, marginBottom: spacing.sm }}>{locationError}</p>}

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: colors.text, marginBottom: spacing.md }}>
        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
        Définir comme adresse par défaut
      </label>

      {error && <p style={{ fontSize: 13, color: colors.danger, marginBottom: spacing.sm }}>{error}</p>}

      <div style={{ display: 'flex', gap: spacing.sm }}>
        <Button
          label="Enregistrer"
          type="submit"
          loading={saving}
          disabled={label.trim().length === 0 || addressLine.trim().length === 0}
        />
        <Button label="Annuler" variant="outline" onClick={onCancel} />
      </div>
    </form>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | undefined>();
  const [profileSaved, setProfileSaved] = useState(false);

  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [formOpen, setFormOpen] = useState<'new' | number | null>(null);

  useEffect(() => {
    fetchAddresses().then(setAddresses).catch(() => setAddresses([]));
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(undefined);
    setProfileSaved(false);
    setSavingProfile(true);
    try {
      const updated = await updateProfile({ name: name.trim(), email: email.trim() || undefined });
      setUser(updated);
      setProfileSaved(true);
    } catch (err) {
      setProfileError(extractErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDelete = async (address: Address) => {
    if (!confirm(`Supprimer l'adresse "${address.label}" ?`)) return;
    await deleteAddress(address.id);
    setAddresses((prev) => (prev ?? []).filter((a) => a.id !== address.id));
  };

  const handleSaved = (address: Address) => {
    setAddresses((prev) => {
      const list = prev ?? [];
      const withoutDefaultClash = address.is_default ? list.map((a) => ({ ...a, is_default: false })) : list;
      const exists = withoutDefaultClash.some((a) => a.id === address.id);
      const next = exists
        ? withoutDefaultClash.map((a) => (a.id === address.id ? address : a))
        : [address, ...withoutDefaultClash];
      // Mirrors the backend's `orderByDesc('is_default')` so the list doesn't
      // visually reorder itself the next time it's refetched from the server.
      return [...next].sort((a, b) => Number(b.is_default) - Number(a.is_default));
    });
    setFormOpen(null);
  };

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        style={{ border: 'none', background: 'none', color: colors.textMuted, fontSize: 22, cursor: 'pointer', padding: 0, marginBottom: spacing.sm }}
      >
        ←
      </button>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>Paramètres</h1>

      <p style={{ fontSize: 13, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', margin: `0 0 ${spacing.sm}px` }}>
        Informations du compte
      </p>
      <form
        onSubmit={handleSaveProfile}
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          padding: spacing.md,
          marginBottom: spacing.lg,
        }}
      >
        <TextField label="Nom complet" value={name} onChange={(e) => setName(e.target.value)} />
        <TextField label="E-mail (facultatif)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <p style={{ fontSize: 13, color: colors.textMuted, margin: `0 0 ${spacing.sm}px` }}>
          Téléphone : {user?.phone} (non modifiable)
        </p>
        {profileError && <p style={{ fontSize: 13, color: colors.danger, marginBottom: spacing.sm }}>{profileError}</p>}
        {profileSaved && <p style={{ fontSize: 13, color: colors.success, marginBottom: spacing.sm }}>Profil mis à jour ✓</p>}
        <Button label="Enregistrer" type="submit" loading={savingProfile} disabled={name.trim().length < 2} />
      </form>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', margin: 0 }}>
          Adresses enregistrées
        </p>
        {formOpen === null && (
          <button
            onClick={() => setFormOpen('new')}
            style={{ border: 'none', background: 'none', color: colors.accent, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            + Ajouter
          </button>
        )}
      </div>

      {formOpen === 'new' && <AddressForm onCancel={() => setFormOpen(null)} onSaved={handleSaved} />}

      {addresses === null ? (
        <CenteredSpinner />
      ) : addresses.length === 0 && formOpen === null ? (
        <p style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: spacing.lg }}>
          Aucune adresse enregistrée pour l'instant.
        </p>
      ) : (
        addresses.map((address) =>
          formOpen === address.id ? (
            <AddressForm key={address.id} initial={address} onCancel={() => setFormOpen(null)} onSaved={handleSaved} />
          ) : (
            <div
              key={address.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: colors.surface,
                borderRadius: radius.sm,
                padding: `${spacing.sm}px ${spacing.md}px`,
                marginBottom: spacing.sm,
                border: `1px solid ${colors.border}`,
              }}
            >
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: colors.text, margin: 0 }}>
                  {address.label}
                  {address.is_default && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        color: colors.primary,
                        backgroundColor: colors.accentSoft,
                        borderRadius: radius.sm,
                        padding: '2px 6px',
                      }}
                    >
                      Par défaut
                    </span>
                  )}
                </p>
                <p style={{ fontSize: 13, color: colors.textMuted, margin: '2px 0 0' }}>{address.address_line}</p>
              </div>
              <div style={{ display: 'flex', gap: spacing.sm }}>
                <button
                  onClick={() => setFormOpen(address.id)}
                  aria-label="Modifier"
                  style={{ border: 'none', background: 'none', color: colors.textMuted, fontSize: 16, cursor: 'pointer' }}
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(address)}
                  aria-label="Supprimer"
                  style={{ border: 'none', background: 'none', color: colors.danger, fontSize: 16, cursor: 'pointer' }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ),
        )
      )}
    </div>
  );
}
