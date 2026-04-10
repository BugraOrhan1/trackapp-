require('dotenv/config');

const baseConfig = require('./app.json').expo;

module.exports = {
  expo: {
    ...baseConfig,
    extra: {
      ...(baseConfig.extra ?? {}),
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? 'https://YOUR_PROJECT.supabase.co',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? 'YOUR_ANON_KEY',
      googleMapsApiKeyIos: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS ?? process.env.GOOGLE_MAPS_API_KEY_IOS ?? 'YOUR_IOS_GOOGLE_MAPS_KEY',
      googleMapsApiKeyAndroid: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID ?? process.env.GOOGLE_MAPS_API_KEY_ANDROID ?? 'YOUR_ANDROID_GOOGLE_MAPS_KEY',
      revenueCatApiKeyIos: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS ?? process.env.REVENUECAT_API_KEY_IOS ?? 'appl_YOUR_IOS_KEY',
      revenueCatApiKeyAndroid: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? process.env.REVENUECAT_API_KEY_ANDROID ?? 'goog_YOUR_ANDROID_KEY',
    },
    ios: {
      ...baseConfig.ios,
      config: {
        ...(baseConfig.ios?.config ?? {}),
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS ?? process.env.GOOGLE_MAPS_API_KEY_IOS ?? 'YOUR_IOS_GOOGLE_MAPS_KEY',
      },
    },
    android: {
      ...baseConfig.android,
      config: {
        ...(baseConfig.android?.config ?? {}),
        googleMaps: {
          ...(baseConfig.android?.config?.googleMaps ?? {}),
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID ?? process.env.GOOGLE_MAPS_API_KEY_ANDROID ?? 'YOUR_ANDROID_GOOGLE_MAPS_KEY',
        },
      },
    },
  },
};
