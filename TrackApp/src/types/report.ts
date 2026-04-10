import type { ReportType } from './index';

export interface Report {
  id: string;
  userId: string;
  type: ReportType;
  latitude: number;
  longitude: number;
  address?: string;
  description?: string;
  upvotes: number;
  downvotes: number;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  distance?: number;
}
