declare const process: {
  env: Record<string, string | undefined>;
};

function readEnv(key: string, fallback: string): string {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value : fallback;
}

export const ENV = {
  SUPABASE_URL: readEnv('NEXT_PUBLIC_SUPABASE_URL', readEnv('EXPO_PUBLIC_SUPABASE_URL', readEnv('SUPABASE_URL', 'https://YOUR_PROJECT.supabase.co'))),
  SUPABASE_ANON_KEY: readEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', readEnv('SUPABASE_ANON_KEY', 'YOUR_ANON_KEY'))),
  GOOGLE_MAPS_API_KEY_IOS: readEnv('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS', readEnv('GOOGLE_MAPS_API_KEY_IOS', 'YOUR_IOS_GOOGLE_MAPS_KEY')),
  GOOGLE_MAPS_API_KEY_ANDROID: readEnv('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID', readEnv('GOOGLE_MAPS_API_KEY_ANDROID', 'YOUR_ANDROID_GOOGLE_MAPS_KEY')),
  REVENUECAT_API_KEY_IOS: readEnv('EXPO_PUBLIC_REVENUECAT_API_KEY_IOS', readEnv('REVENUECAT_API_KEY_IOS', 'appl_YOUR_IOS_KEY')),
  REVENUECAT_API_KEY_ANDROID: readEnv('EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID', readEnv('REVENUECAT_API_KEY_ANDROID', 'goog_YOUR_ANDROID_KEY')),
};
