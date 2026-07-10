import { useCallback, useEffect, useState } from 'react';
import { getToken, onMessage } from 'firebase/messaging';

import { registerPushToken } from '../api/auth';
import { getFirebaseMessaging } from '../firebase';

export type PushPermissionState = 'unsupported' | 'default' | 'granted' | 'denied';

/**
 * Browser push notifications: request permission, register the resulting
 * FCM web token with the backend (same /fcm-token endpoint and
 * BookingConfirmedNotification flow already used by the mobile apps — one
 * Firebase project, one delivery path regardless of platform), and show
 * foreground messages manually (the service worker's background handler
 * only fires while the tab isn't focused).
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState<PushPermissionState>(
    'Notification' in window ? (Notification.permission as PushPermissionState) : 'unsupported',
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    getFirebaseMessaging()
      .then((messaging) => {
        if (!messaging) return;
        unsubscribe = onMessage(messaging, (payload) => {
          if (Notification.permission !== 'granted') return;
          const title = payload.notification?.title ?? 'Intercity';
          new Notification(title, { body: payload.notification?.body, icon: '/icons/icon-192.png' });
        });
      })
      .catch(() => {
        // Firebase not configured yet (missing VITE_FIREBASE_* values) —
        // foreground messages just won't show; nothing else breaks.
      });

    return () => unsubscribe?.();
  }, []);

  const enable = useCallback(async () => {
    if (!('Notification' in window)) {
      setPermission('unsupported');
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PushPermissionState);
      if (result !== 'granted') return;

      const messaging = await getFirebaseMessaging();
      if (!messaging) {
        setError("Les notifications ne sont pas prises en charge par ce navigateur.");
        return;
      }

      const swRegistration = await navigator.serviceWorker.ready;
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: swRegistration,
      });
      if (token) await registerPushToken(token);
    } catch {
      setError('Impossible d\'activer les notifications. Réessayez.');
    } finally {
      setLoading(false);
    }
  }, []);

  return { permission, loading, error, enable };
}

export type UsePushNotifications = ReturnType<typeof usePushNotifications>;
