export type SubscriptionType = 'free' | 'premium';

export type ReportType = 
  | 'speed_camera_mobile'
  | 'police_control'
  | 'accident'
  | 'traffic_jam'
  | 'roadwork'
  | 'danger'
  | 'other';

export type SpeedCameraType = 'fixed' | 'trajectory' | 'red_light';

export type EmergencyServiceType = 'police' | 'ambulance' | 'fire' | 'defense' | 'unknown';

export interface User {
  id: string;
  email: string;
  username?: string;
  avatarUrl?: string;
  subscriptionType: SubscriptionType;
  subscriptionExpiresAt?: Date;
  totalReports: number;
  reputationScore: number;
  createdAt: Date;
}

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

export interface SpeedCamera {
  id: string;
  type: SpeedCameraType;
  latitude: number;
  longitude: number;
  speedLimit?: number;
  direction?: string;
  roadName?: string;
  isActive: boolean;
  distance?: number;
}

export interface Detection {
  id: string;
  userId: string;
  serviceType: EmergencyServiceType;
  frequency: number;
  rssi: number;
  distanceKm: number;
  latitude: number;
  longitude: number;
  bearing?: number;
  createdAt: Date;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  timestamp: Date;
}

export type Location = UserLocation;

export interface Alert {
  id: string;
  type: 'speed_camera' | 'police' | 'accident' | 'emergency';
  title: string;
  message: string;
  distance: number;
  color: string;
  sound?: string;
}
