export type EmergencyServiceType = 'police' | 'ambulance' | 'fire' | 'defense' | 'unknown';

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
