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

export interface Location {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
}

export type { Report } from './report';
export type { SpeedCamera } from './speedCamera';
export type { User } from './user';
export type { Detection, EmergencyServiceType } from './detection';
export type { RootStackParamList } from './navigation';
