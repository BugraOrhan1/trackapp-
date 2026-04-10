import { useEffect, useState } from 'react';
import { isPremiumUser } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import type { SubscriptionType } from '../types';

export function useSubscription() {
  const user = useAuthStore((state) => state.user);
  const [subscriptionType, setSubscriptionType] = useState<SubscriptionType>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!user) {
        if (mounted) {
          setSubscriptionType('free');
          setLoading(false);
        }
        return;
      }

      const premium = await isPremiumUser(user.id);
      if (mounted) {
        setSubscriptionType(premium ? 'premium' : 'free');
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  return { subscriptionType, loading, isPremium: subscriptionType === 'premium' };
}
