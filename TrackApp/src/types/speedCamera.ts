export interface SpeedCamera {
  id: string;
  type: 'fixed' | 'trajectory' | 'red_light';
  latitude: number;
  longitude: number;
  speedLimit?: number;
  direction?: string;
  roadName?: string;
  isActive: boolean;
  distance?: number;
}
