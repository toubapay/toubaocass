// Dynamic config (instead of app.json) so the Google Maps API key can come
// from the environment instead of being committed to the repo. Set
// GOOGLE_MAPS_API_KEY in a local .env file (or as an EAS/CI secret) before
// building — see the README for where to get one.
module.exports = {
  expo: {
    name: 'Intercity Driver',
    slug: 'intercity-driver',
    version: '1.0.0',
    scheme: 'intercity-driver',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    plugins: [
      'expo-notifications',
      'expo-image-picker',
      [
        'expo-location',
        {
          locationWhenInUsePermission: 'Allow Intercity to use your location to set your departure point.',
        },
      ],
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.intercity.driver',
      // Download from Firebase Console > Project settings > Your apps > iOS
      // app with bundle ID com.intercity.driver, place at the project root.
      // Not committed (see .gitignore) — required for real FCM push
      // delivery on iOS builds, optional for local Expo Go testing.
      googleServicesFile: './GoogleService-Info.plist',
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
      },
    },
    android: {
      package: 'com.intercity.driver',
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      // Download from Firebase Console > Project settings > Your apps >
      // Android app with package com.intercity.driver, place at the
      // project root. Not committed (see .gitignore) — required for real
      // FCM push delivery on Android builds, optional for local Expo Go
      // testing.
      googleServicesFile: './google-services.json',
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
        },
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:8000/api',
      // Same key as ios/android.config above, additionally exposed to JS so
      // the address picker's Places Autocomplete/Details REST calls can use
      // it (those are plain fetch() calls, not part of the native Maps SDK).
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
      // Keep distinct from the rider app's key — see shared-mobile's
      // api/client.ts — so an existing install isn't signed out by an
      // update that moves this file into the shared package.
      tokenStorageKey: 'intercity_driver_token',
    },
  },
};
