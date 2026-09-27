import { Linking, Platform } from 'react-native';

/**
 * Turn-by-turn driving directions, delegated to Google Maps rather than a
 * hand-built nav engine — this is how every mainstream rideshare app
 * (Uber, Bolt, inDrive) does it. On Android, `google.navigation:` launches
 * Google Maps directly in live navigation mode (voice guidance, live
 * traffic, automatic rerouting). On iOS (and as the Android fallback when
 * the app isn't installed), the `dir_action=navigate` web URL is a
 * universal link Google Maps intercepts automatically if installed, or
 * falls back to a directions view in the browser.
 */
export function buildGoogleMapsNavigationUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving&dir_action=navigate`;
}

export async function openNavigation(latitude: number, longitude: number): Promise<void> {
  if (Platform.OS === 'android') {
    const androidNavUrl = `google.navigation:q=${latitude},${longitude}&mode=d`;
    try {
      if (await Linking.canOpenURL(androidNavUrl)) {
        await Linking.openURL(androidNavUrl);
        return;
      }
    } catch {
      // Fall through to the universal web URL below.
    }
  }
  await Linking.openURL(buildGoogleMapsNavigationUrl(latitude, longitude));
}
