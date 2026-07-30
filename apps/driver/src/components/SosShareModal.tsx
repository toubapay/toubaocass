import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { extractErrorMessage } from '../api/client';
import { fetchShareLink, sendSosAlert, type ShareableRideKind } from '../api/tracking';
import { colors, radius, spacing } from '../theme';
import { Button } from './Button';

export type { ShareableRideKind };

/**
 * SOS "share my live position" sheet — generates the 24h signed tracking
 * link then hands it to WhatsApp/SMS with a pre-filled message, so family
 * members get a real page (not raw JSON) without needing the app. Only
 * meant to be rendered while the ride is in_progress; the caller controls
 * that visibility.
 */
export function SosShareModal({
  kind,
  rideId,
  visible,
  onClose,
}: {
  kind: ShareableRideKind;
  rideId: number | string;
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendingAlert, setSendingAlert] = useState(false);
  const [alertSent, setAlertSent] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setUrl(null);
    setError(null);
    setAlertSent(false);
    fetchShareLink(kind, rideId)
      .then((link) => {
        if (!cancelled) setUrl(link);
      })
      .catch((err) => {
        if (!cancelled) setError(extractErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [visible, kind, rideId]);

  const message = url ? t('tracking.sosMessage', { url }) : '';

  const handleSendAlert = () => {
    Alert.alert(t('tracking.sosAlertAdmin'), t('tracking.sosAlertConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.ok'),
        style: 'destructive',
        onPress: async () => {
          setSendingAlert(true);
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            let latitude: number | undefined;
            let longitude: number | undefined;
            if (status === 'granted') {
              try {
                const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                latitude = position.coords.latitude;
                longitude = position.coords.longitude;
              } catch {
                // best-effort
              }
            }
            await sendSosAlert(kind, rideId, latitude, longitude);
            setAlertSent(true);
          } catch (e) {
            setError(extractErrorMessage(e));
          } finally {
            setSendingAlert(false);
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{t('tracking.sosSheetTitle')}</Text>
          <Text style={styles.subtitle}>{t('tracking.sosSheetSubtitle')}</Text>

          {!url && !error && <ActivityIndicator color={colors.primary} style={styles.spinner} />}
          {error && <Text style={styles.error}>{error}</Text>}
          {alertSent && <Text style={styles.alertSent}>✓ {t('tracking.sosAlertSent')}</Text>}

          <View style={styles.buttonSpacing}>
            <Button
              label={`🆘 ${t('tracking.sosAlertAdmin')}`}
              onPress={handleSendAlert}
              loading={sendingAlert}
              disabled={alertSent}
              variant="danger"
            />
          </View>

          {url && (
            <>
              <View style={styles.buttonSpacing}>
                <Button
                  label={t('tracking.sosWhatsapp')}
                  onPress={() => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`)}
                />
              </View>
              <View style={styles.buttonSpacing}>
                <Button
                  label={t('tracking.sosSms')}
                  variant="outline"
                  onPress={() => Linking.openURL(`sms:?body=${encodeURIComponent(message)}`)}
                />
              </View>
            </>
          )}

          <Button label={t('common.close')} onPress={onClose} variant="outline" />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  spinner: {
    marginBottom: spacing.md,
  },
  error: {
    fontSize: 13,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  alertSent: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.success,
    marginBottom: spacing.md,
  },
  buttonSpacing: {
    marginBottom: spacing.sm,
  },
});
