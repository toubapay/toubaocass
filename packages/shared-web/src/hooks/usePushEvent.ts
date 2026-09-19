import { useEffect } from 'react';

export const PUSH_EVENT_NAME = 'app:push-data';

export type PushEventData = Record<string, unknown>;

/**
 * Bridges the FCM foreground onMessage handler (mounted once per app via
 * usePushNotifications) to individual list/badge components that want to
 * refetch the instant a relevant push arrives, instead of waiting out their
 * own poll interval.
 */
export function dispatchPushEvent(data: PushEventData | undefined): void {
  if (!data) return;
  window.dispatchEvent(new CustomEvent<PushEventData>(PUSH_EVENT_NAME, { detail: data }));
}

/** Runs `handler` the instant a push whose `data.type === type` arrives. */
export function usePushEvent(type: string, handler: () => void): void {
  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<PushEventData>).detail;
      if (detail?.type === type) handler();
    };
    window.addEventListener(PUSH_EVENT_NAME, listener);
    return () => window.removeEventListener(PUSH_EVENT_NAME, listener);
  }, [type, handler]);
}
