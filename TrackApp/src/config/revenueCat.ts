import { ENV } from './env';

export const revenueCatConfig = {
  apiKeyIOS: ENV.REVENUECAT_API_KEY_IOS,
  apiKeyAndroid: ENV.REVENUECAT_API_KEY_ANDROID,
  entitlementId: 'premium',
  yearlyProductId: 'premium_yearly',
  monthlyProductId: 'premium_monthly',
};

export function getRevenueCatApiKey(platform: 'ios' | 'android'): string {
  return platform === 'ios' ? revenueCatConfig.apiKeyIOS : revenueCatConfig.apiKeyAndroid;
}

