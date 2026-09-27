/**
 * Turn-by-turn driving directions, delegated to Google Maps rather than a
 * hand-built nav engine — this is how every mainstream rideshare app
 * (Uber, Bolt, inDrive) does it: the destination URL's `dir_action=navigate`
 * makes Google Maps open directly in live turn-by-turn mode (voice guidance,
 * live traffic, automatic rerouting) instead of just a static directions
 * preview, on both the installed app (iOS/Android intercept the universal
 * link) and the Maps website as a fallback.
 */
export function buildGoogleMapsNavigationUrl(latitude: number, longitude: number): string {
  const destination = `${latitude},${longitude}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving&dir_action=navigate`;
}

export function openNavigation(latitude: number, longitude: number): void {
  window.open(buildGoogleMapsNavigationUrl(latitude, longitude), '_blank', 'noopener,noreferrer');
}
