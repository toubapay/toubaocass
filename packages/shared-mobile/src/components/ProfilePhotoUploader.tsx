import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, spacing } from '../theme';

export interface PickedPhoto {
  uri: string;
  name: string;
  mimeType: string;
}

/**
 * Circular avatar + change/remove controls, shown at the top of a rider's
 * or driver's own profile screen — same role as the shared-web version of
 * this component. Falls back to the first letter of their name when no
 * photo is set yet. `onUpload`/`onRemove` are handed the app's own auth API
 * calls (rider and driver each have their own `/profile/photo` client) and
 * are expected to return the updated User so the caller can push it into
 * its AuthContext.
 */
export function ProfilePhotoUploader({
  photoUrl,
  name,
  onUpload,
  onRemove,
}: {
  photoUrl: string | null;
  name: string | null;
  onUpload: (file: PickedPhoto) => Promise<unknown>;
  onRemove: () => Promise<unknown>;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const initial = (name ?? '').trim().charAt(0).toUpperCase() || '?';

  async function handlePick() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setBusy(true);
    try {
      await onUpload({
        uri: asset.uri,
        name: asset.fileName ?? 'profile-photo.jpg',
        mimeType: asset.mimeType ?? 'image/jpeg',
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      await onRemove();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        {busy ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.initial}>{initial}</Text>
        )}
      </View>
      <View>
        <Pressable onPress={handlePick} disabled={busy}>
          <Text style={styles.changeLabel}>{t('profile.changePhoto')}</Text>
        </Pressable>
        {photoUrl && (
          <Pressable onPress={handleRemove} disabled={busy}>
            <Text style={styles.removeLabel}>{t('profile.removePhoto')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  initial: { fontSize: 24, fontWeight: '700', color: colors.primary },
  changeLabel: { fontSize: 13.5, fontWeight: '700', color: colors.primary },
  removeLabel: { fontSize: 13, fontWeight: '600', color: colors.danger, marginTop: 4 },
});
