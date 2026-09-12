// Dynamic config (instead of app.json) so the Google Maps API key can come
// from the environment instead of being committed to the repo. Set
// GOOGLE_MAPS_API_KEY in a local .env file (or as an EAS/CI secret) before
// building — see the README for where to get one.
module.exports = {
  expo: {
    name: 'Intercity Rider',
    slug: 'intercity-rider',
    version: '1.0.0',
    scheme: 'intercity-rider',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    plugins: [
      'expo-notifications',
      [
        'expo-location',
        {
          locationWhenInUsePermission: 'Allow Intercity to use your location to find rides departing near you.',
        },
      ],
      [
        'expo-speech-recognition',
        {
          microphonePermission: 'Allow Intercity to use the microphone for voice search.',
          speechRecognitionPermission: 'Allow Intercity to use speech recognition for voice search.',
          androidSpeechServicePackages: ['com.google.android.googlequicksearchbox'],
        },
      ],
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.intercity.rider',
      // Download from Firebase Console > Project settings > Your apps > iOS
      // app with bundle ID com.intercity.rider, place at the project root.
      // Not committed (see .gitignore) — required for real FCM push
      // delivery on iOS builds, optional for local Expo Go testing.
      googleServicesFile: './GoogleService-Info.plist',
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
      },
    },
    android: {
      package: 'com.intercity.rider',
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      // Download from Firebase Console > Project settings > Your apps >
      // Android app with package com.intercity.rider, place at the project
      // root. Not committed (see .gitignore) — required for real FCM push
      // delivery on Android builds, optional for local Expo Go testing.
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
      // Keep distinct from the driver app's key — see shared-mobile's
      // api/client.ts — so an existing install isn't signed out by an
      // update that moves this file into the shared package.
      tokenStorageKey: 'intercity_rider_token',
    },
  },
};
