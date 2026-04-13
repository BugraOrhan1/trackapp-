module.exports = {
  expo: {
    name: 'TrackApp',
    slug: 'trackapp',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#1A1A2E',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.bugraorhan.trackapp',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSLocationWhenInUseUsageDescription: 'TrackApp gebruikt je locatie om waarschuwingen te tonen voor flitsers en hulpdiensten in de buurt.',
        NSLocationAlwaysAndWhenInUseUsageDescription: 'TrackApp gebruikt je locatie om real-time waarschuwingen te tonen, ook op de achtergrond.',
        NSBluetoothAlwaysUsageDescription: 'TrackApp gebruikt Bluetooth om te verbinden met je Raspberry Pi scanner (alleen Premium).',
        NSBluetoothPeripheralUsageDescription: 'TrackApp gebruikt Bluetooth om hulpdiensten te detecteren (Premium feature).',
        UIBackgroundModes: ['location', 'bluetooth-central'],
      },
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS ?? '',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#1A1A2E',
      },
      package: 'com.bugraorhan.trackapp',
      permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'ACCESS_BACKGROUND_LOCATION', 'BLUETOOTH', 'BLUETOOTH_ADMIN', 'BLUETOOTH_CONNECT', 'BLUETOOTH_SCAN'],
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID ?? '',
        },
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: 'TrackApp gebruikt je locatie voor real-time waarschuwingen.',
        },
      ],
      'expo-font',
      'expo-av',
    ],
    extra: {
      eas: {
        projectId: '57609f9f-c2ef-4307-99c5-e206d3e6dc84',
      },
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
      googleMapsApiKeyIos: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS ?? '',
      googleMapsApiKeyAndroid: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID ?? '',
      revenueCatApiKeyIos: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS ?? '',
      revenueCatApiKeyAndroid: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? '',
    },
  },
};
