import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { reverseGeocode, useMyLocation } from '../hooks/useMyLocation';
import { colors, radius, spacing } from '../theme';
import { AddressMapPicker } from './AddressMapPicker';
import { Button } from './Button';

const STORAGE_KEY = 'intercity_my_location';

interface StoredLocation {
  addressLine: string;
  latitude: number;
  longitude: number;
}

export function MyLocationBar() {
  const [current, setCurrent] = useState<StoredLocation | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [draftAddress, setDraftAddress] = useState('');
  const [draftLat, setDraftLat] = useState<number | null>(null);
  const [draftLng, setDraftLng] = useState<number | null>(null);

  const { loading: locating, requestLocation } = useMyLocation();

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          setCurrent(JSON.parse(raw));
          return;
        } catch {
          // Ignore malformed cached value and fall through to auto-detect.
        }
      }

      const coords = await requestLocation();
      if (!coords) return;
      const addressLine = (await reverseGeocode(coords)) ?? 'Position actuelle';
      const value = { addressLine, latitude: coords.latitude, longitude: coords.longitude };
      setCurrent(value);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openModal = () => {
    setDraftAddress(current?.addressLine ?? '');
    setDraftLat(current?.latitude ?? null);
    setDraftLng(current?.longitude ?? null);
    setModalVisible(true);
  };

  const save = async () => {
    if (draftLat == null || draftLng == null || !draftAddress.trim()) return;
    const value = { addressLine: draftAddress.trim(), latitude: draftLat, longitude: draftLng };
    setCurrent(value);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    setModalVisible(false);
  };

  return (
    <>
      <Pressable style={styles.pill} onPress={openModal}>
        <Text style={styles.pillIcon}>📍</Text>
        <Text style={styles.pillText} numberOfLines={1}>
          {!current && locating ? '…' : (current?.addressLine ?? 'Ma position')}
        </Text>
      </Pressable>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
          <View style={styles.sheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.sheetTitle}>Ma position</Text>
              <AddressMapPicker
                addressLine={draftAddress}
                onAddressLineChange={setDraftAddress}
                latitude={draftLat}
                longitude={draftLng}
                onLocationChange={(coords) => {
                  setDraftLat(coords.latitude);
                  setDraftLng(coords.longitude);
                }}
              />
              <Button label="Enregistrer" onPress={save} disabled={draftLat == null || !draftAddress.trim()} />
              <View style={{ marginTop: spacing.sm, marginBottom: spacing.sm }}>
                <Button label="Fermer" variant="outline" onPress={() => setModalVisible(false)} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 130,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 4,
  },
  pillIcon: { fontSize: 12 },
  pillText: { fontSize: 12, fontWeight: '700', color: colors.accent, flexShrink: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
});
