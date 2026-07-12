import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { createAddress, deleteAddress, fetchAddresses, updateAddress } from '../api/addresses';
import { updateProfile } from '../api/auth';
import { extractErrorMessage } from '../api/client';
import { Address } from '../api/types';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
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

  const handleSubmit = async () => {
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
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.formCard}>
      <TextField label="Libellé" placeholder="Domicile, Travail…" value={label} onChangeText={setLabel} />
      <TextField
        label="Adresse"
        placeholder="Sacré-Cœur 3, Dakar"
        value={addressLine}
        onChangeText={setAddressLine}
      />

      <Pressable onPress={handleUseLocation} style={styles.locationButton}>
        {locating ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <Text style={styles.locationText}>
            📍 {coords ? 'Position enregistrée ✓' : 'Utiliser ma position actuelle'}
          </Text>
        )}
      </Pressable>
      {locationError && <Text style={styles.errorText}>{locationError}</Text>}

      <Pressable onPress={() => setIsDefault((v) => !v)} style={styles.checkboxRow}>
        <View style={[styles.checkbox, isDefault && styles.checkboxChecked]}>
          {isDefault && <Text style={styles.checkboxMark}>✓</Text>}
        </View>
        <Text style={styles.checkboxLabel}>Définir comme adresse par défaut</Text>
      </Pressable>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.formActions}>
        <View style={{ flex: 1 }}>
          <Button
            label="Enregistrer"
            onPress={handleSubmit}
            loading={saving}
            disabled={label.trim().length === 0 || addressLine.trim().length === 0}
          />
        </View>
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Button label="Annuler" onPress={onCancel} variant="outline" />
        </View>
      </View>
    </View>
  );
}

export function SettingsScreen() {
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

  const handleSaveProfile = async () => {
    setProfileError(undefined);
    setProfileSaved(false);
    setSavingProfile(true);
    try {
      const updated = await updateProfile({ name: name.trim(), email: email.trim() || undefined });
      setUser(updated);
      setProfileSaved(true);
    } catch (e) {
      setProfileError(extractErrorMessage(e));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDelete = (address: Address) => {
    Alert.alert('Supprimer l\'adresse', `Supprimer l'adresse "${address.label}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteAddress(address.id);
          setAddresses((prev) => (prev ?? []).filter((a) => a.id !== address.id));
        },
      },
    ]);
  };

  const handleSaved = (address: Address) => {
    setAddresses((prev) => {
      const list = prev ?? [];
      const withoutDefaultClash = address.is_default ? list.map((a) => ({ ...a, is_default: false })) : list;
      const exists = withoutDefaultClash.some((a) => a.id === address.id);
      const next = exists
        ? withoutDefaultClash.map((a) => (a.id === address.id ? address : a))
        : [address, ...withoutDefaultClash];
      return [...next].sort((a, b) => Number(b.is_default) - Number(a.is_default));
    });
    setFormOpen(null);
  };

  return (
    <Screen>
      <Text style={styles.sectionTitle}>Informations du compte</Text>
      <View style={styles.card}>
        <TextField label="Nom complet" value={name} onChangeText={setName} />
        <TextField label="E-mail (facultatif)" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <Text style={styles.phoneText}>Téléphone : {user?.phone} (non modifiable)</Text>
        {profileError && <Text style={styles.errorText}>{profileError}</Text>}
        {profileSaved && <Text style={styles.successText}>Profil mis à jour ✓</Text>}
        <Button label="Enregistrer" onPress={handleSaveProfile} loading={savingProfile} disabled={name.trim().length < 2} />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Adresses enregistrées</Text>
        {formOpen === null && (
          <Pressable onPress={() => setFormOpen('new')}>
            <Text style={styles.addLink}>+ Ajouter</Text>
          </Pressable>
        )}
      </View>

      {formOpen === 'new' && <AddressForm onCancel={() => setFormOpen(null)} onSaved={handleSaved} />}

      {addresses === null ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : addresses.length === 0 && formOpen === null ? (
        <Text style={styles.emptyText}>Aucune adresse enregistrée pour l'instant.</Text>
      ) : (
        addresses.map((address) =>
          formOpen === address.id ? (
            <AddressForm key={address.id} initial={address} onCancel={() => setFormOpen(null)} onSaved={handleSaved} />
          ) : (
            <View key={address.id} style={styles.addressRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.addressLabel}>{address.label}</Text>
                  {address.is_default && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Par défaut</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.addressLine}>{address.address_line}</Text>
              </View>
              <Pressable onPress={() => setFormOpen(address.id)} style={styles.iconButton}>
                <Text style={styles.iconText}>✏️</Text>
              </Pressable>
              <Pressable onPress={() => handleDelete(address)} style={styles.iconButton}>
                <Text style={styles.iconText}>🗑️</Text>
              </Pressable>
            </View>
          ),
        )
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.sm },
  addLink: { color: colors.accent, fontWeight: '700', fontSize: 14 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  phoneText: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm },
  errorText: { fontSize: 13, color: colors.danger, marginBottom: spacing.sm },
  successText: { fontSize: 13, color: colors.success, marginBottom: spacing.sm },
  locationButton: { marginBottom: spacing.sm },
  locationText: { color: colors.accent, fontWeight: '600', fontSize: 14 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxMark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  checkboxLabel: { fontSize: 14, color: colors.text },
  formActions: { flexDirection: 'row' },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: spacing.lg },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  addressLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  addressLine: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  defaultBadge: {
    marginLeft: spacing.sm,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  defaultBadgeText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  iconButton: { padding: spacing.xs, marginLeft: spacing.xs },
  iconText: { fontSize: 16 },
});
