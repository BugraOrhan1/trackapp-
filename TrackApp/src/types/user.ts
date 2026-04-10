import type { SubscriptionType } from './index';

export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  subscriptionType: SubscriptionType;
  subscriptionExpiresAt?: Date;
  totalReports: number;
  reputationScore: number;
}
