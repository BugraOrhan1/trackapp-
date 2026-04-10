import Purchases, { 
  PurchasesOffering, 
  CustomerInfo,
  PurchasesPackage 
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';

const REVENUECAT_API_KEY_IOS = 'appl_YOUR_IOS_KEY';
const REVENUECAT_API_KEY_ANDROID = 'goog_YOUR_ANDROID_KEY';

export const subscriptionService = {
  /**
   * Initialiseer RevenueCat
   */
  async initialize(userId: string) {
    const apiKey = Platform.OS === 'ios' 
      ? REVENUECAT_API_KEY_IOS 
      : REVENUECAT_API_KEY_ANDROID;

    await Purchases.configure({ apiKey, appUserID: userId });
  },

  /**
   * Haal beschikbare pakketten op
   */
  async getOfferings(): Promise<PurchasesOffering | null> {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  },

  /**
   * Koop pakket
   */
  async purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    
    // Update Supabase
    await this.syncSubscriptionToSupabase(customerInfo);
    
    return customerInfo;
  },

  /**
   * Restore purchases
   */
  async restorePurchases(): Promise<CustomerInfo> {
    const customerInfo = await Purchases.restorePurchases();
    
    // Update Supabase
    await this.syncSubscriptionToSupabase(customerInfo);
    
    return customerInfo;
  },

  /**
   * Check subscription status
   */
  async checkSubscription(): Promise<{
    isPremium: boolean;
    expiresAt?: Date;
  }> {
    const customerInfo = await Purchases.getCustomerInfo();
    
    const isPremium = 
      customerInfo.entitlements.active['premium'] !== undefined;
    
    const expiresAt = isPremium 
      ? new Date(customerInfo.entitlements.active['premium'].expirationDate!)
      : undefined;

    return { isPremium, expiresAt };
  },

  /**
   * Sync subscription naar Supabase
   */
  async syncSubscriptionToSupabase(customerInfo: CustomerInfo) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const isPremium = 
      customerInfo.entitlements.active['premium'] !== undefined;
    
    const expiresAt = isPremium
      ? customerInfo.entitlements.active['premium'].expirationDate
      : null;

    await supabase
      .from('profiles')
      .update({
        subscription_type: isPremium ? 'premium' : 'free',
        subscription_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
  },

  /**
   * Get subscription info
   */
  async getSubscriptionInfo() {
    const customerInfo = await Purchases.getCustomerInfo();
    
    if (customerInfo.entitlements.active['premium']) {
      const entitlement = customerInfo.entitlements.active['premium'];
      return {
        isActive: true,
        productId: entitlement.productIdentifier,
        expiresAt: new Date(entitlement.expirationDate!),
        willRenew: entitlement.willRenew,
        periodType: entitlement.periodType,
      };
    }

    return {
      isActive: false,
    };
  },
};
