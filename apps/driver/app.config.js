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
    },
  },
};
