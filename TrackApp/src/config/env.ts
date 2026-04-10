declare const process: {
  env: Record<string, string | undefined>;
};

function readEnv(key: string, fallback: string): string {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value : fallback;
}

export const ENV = {
  SUPABASE_URL: readEnv('EXPO_PUBLIC_SUPABASE_URL', ''),
  SUPABASE_ANON_KEY: readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', ''),
  GOOGLE_MAPS_API_KEY_IOS: readEnv('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS', ''),
  GOOGLE_MAPS_API_KEY_ANDROID: readEnv('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID', ''),
  REVENUECAT_API_KEY_IOS: readEnv('EXPO_PUBLIC_REVENUECAT_API_KEY_IOS', ''),
  REVENUECAT_API_KEY_ANDROID: readEnv('EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID', ''),
  REVENUECAT_TEST_APP_USER_ID: readEnv('EXPO_PUBLIC_REVENUECAT_TEST_APP_USER_ID', ''),
};
