import { useState, useEffect } from 'react';
import { subscriptionService } from '../services/subscription';
import { useAuth } from './useAuth';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

export function useSubscription() {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [expiresAt, setExpiresAt] = useState<Date | undefined>();
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      initialize();
    }
  }, [user]);

  async function initialize() {
    if (!user) return;

    try {
      setLoading(true);
      await subscriptionService.initialize(user.id);
      const { isPremium: premium, expiresAt: expires } = 
        await subscriptionService.checkSubscription();
      setIsPremium(premium);
      setExpiresAt(expires);
      const offers = await subscriptionService.getOfferings();
      setOfferings(offers);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Subscription init fout');
    } finally {
      setLoading(false);
    }
  }

  async function purchasePackage(pkg: PurchasesPackage) {
    try {
      setLoading(true);
      setError(null);
      await subscriptionService.purchasePackage(pkg);
      const { isPremium: premium, expiresAt: expires } = 
        await subscriptionService.checkSubscription();
      setIsPremium(premium);
      setExpiresAt(expires);
    } catch (err: any) {
      setError(err.message || 'Aankoop mislukt');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function restorePurchases() {
    try {
      setLoading(true);
      setError(null);
      await subscriptionService.restorePurchases();
      const { isPremium: premium, expiresAt: expires } = 
        await subscriptionService.checkSubscription();
      setIsPremium(premium);
      setExpiresAt(expires);
    } catch (err: any) {
      setError(err.message || 'Restore mislukt');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function checkStatus() {
    const { isPremium: premium, expiresAt: expires } = 
      await subscriptionService.checkSubscription();
    setIsPremium(premium);
    setExpiresAt(expires);
    return { isPremium: premium, expiresAt: expires };
  }

  return {
    isPremium,
    expiresAt,
    offerings,
    loading,
    error,
    purchasePackage,
    restorePurchases,
    checkStatus,
  };
}