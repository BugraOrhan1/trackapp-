import { revenueCatConfig } from '../config/revenueCat';
import { useAuthStore } from '../store/authStore';

export async function getSubscriptionStatus(): Promise<'free' | 'premium'> {
  const user = useAuthStore.getState().user;
  return user?.subscriptionType ?? 'free';
}

export function getRevenueCatConfig() {
  return revenueCatConfig;
}
