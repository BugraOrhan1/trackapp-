const baseConfig = require('./app.json').expo;

module.exports = {
  expo: {
    ...baseConfig,
    extra: {
      ...(baseConfig.extra ?? {}),
      eas: {
        ...(baseConfig.extra?.eas ?? {}),
        projectId: '57609f9f-c2ef-4307-99c5-e206d3e6dc84',
      },
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
      googleMapsApiKeyIos: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS ?? '',
      googleMapsApiKeyAndroid: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID ?? '',
      revenueCatApiKeyIos: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS ?? '',
      revenueCatApiKeyAndroid: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? '',
    },
    ios: {
      ...baseConfig.ios,
      config: {
        ...(baseConfig.ios?.config ?? {}),
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS ?? '',
      },
    },
    android: {
      ...baseConfig.android,
      config: {
        ...(baseConfig.android?.config ?? {}),
        googleMaps: {
          ...(baseConfig.android?.config?.googleMaps ?? {}),
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID ?? '',
        },
      },
    },
  },
};
