import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { registerPushToken } from '../api/auth';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const type = notification.request.content.data?.type;
    const isAnando = typeof type === 'string' && type.startsWith('anando');

    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: isAnando,
      shouldSetBadge: false,
    };
  },
});

/**
 * Requests notification permission and registers the device's push token
 * with the backend so drivers/riders receive booking & trip updates.
 * Requires the app to be built with Firebase config (google-services.json /
 * GoogleService-Info.plist) for production Android/iOS push delivery.
 */
export function useRegisterPushToken(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !Device.isDevice) return;

    (async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') return;

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.HIGH,
            sound: 'default',
          });
        }

        const token = await Notifications.getDevicePushTokenAsync();
        await registerPushToken(token.data);
      } catch {
        // Push registration is best-effort; ignore failures (e.g. simulator).
      }
    })();
  }, [enabled]);
}
