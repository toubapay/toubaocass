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

  const fetchAndRegisterToken = useCallback(async () => {
    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      throw new Error('Les notifications ne sont pas prises en charge par ce navigateur.');
    }

    const swRegistration = await navigator.serviceWorker.ready;
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });
    if (token) await registerPushToken(token);
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    getFirebaseMessaging()
      .then((messaging) => {
        if (!messaging) return;
        unsubscribe = onMessage(messaging, (payload) => {
          if (Notification.permission !== 'granted') return;
          const title = payload.notification?.title ?? 'Intercity';
          new Notification(title, { body: payload.notification?.body, icon: `${import.meta.env.BASE_URL}icons/icon-192.png` });

          // The native Notification API has no reliable cross-browser sound
          // option (Chrome on Android in particular stays silent for
          // foreground-triggered notifications), so Anando alerts get an
          // explicit beep to make sure they're actually noticed.
          if (payload.data?.type?.toString().startsWith('anando')) {
            new Audio(`${import.meta.env.BASE_URL}sounds/anando_beep.wav`).play().catch(() => {});
          }
        });
      })
      .catch(() => {
        // Firebase not configured yet (missing VITE_FIREBASE_* values) —
        // foreground messages just won't show; nothing else breaks.
      });

    // Permission may already be granted from an earlier session, but the
    // FCM token on file with the backend can go stale (token rotation, the
    // Home Screen PWA being removed and re-added, etc.) with nothing else to
    // trigger a refresh — the "Activer" button only reappears if permission
    // itself is revoked. getToken() is cheap and idempotent (returns the
    // current valid token, minting a new one only if the old one rotated),
    // so re-registering on every load keeps the backend's token current
    // instead of silently going stale forever after the first grant.
    if ('Notification' in window && Notification.permission === 'granted') {
      fetchAndRegisterToken().catch(() => {
        // Best-effort background refresh — the explicit "Activer" flow below
        // is what surfaces a real error to the rider.
      });
    }

    return () => unsubscribe?.();
  }, [fetchAndRegisterToken]);

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

      await fetchAndRegisterToken();
    } catch {
      setError('Impossible d\'activer les notifications. Réessayez.');
    } finally {
      setLoading(false);
    }
  }, [fetchAndRegisterToken]);

  return { permission, loading, error, enable };
}

export type UsePushNotifications = ReturnType<typeof usePushNotifications>;
