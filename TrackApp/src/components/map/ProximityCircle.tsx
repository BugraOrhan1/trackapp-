import React from 'react';
import { Circle } from 'react-native-maps';

type Props = {
  latitude?: number;
  longitude?: number;
  center?: { latitude: number; longitude: number };
  radius?: number;
  radiusMeters?: number;
  serviceType?: string;
};

export default function ProximityCircle({ latitude, longitude, center, radius = 1000, radiusMeters, serviceType }: Props): JSX.Element {
  const resolvedCenter = center ?? { latitude: latitude ?? 0, longitude: longitude ?? 0 };
  const resolvedRadius = radiusMeters ?? radius;
  const strokeColor = serviceType === 'police' ? '#2196F3' : serviceType === 'ambulance' ? '#FFD700' : '#FF1744';

  return <Circle center={resolvedCenter} radius={resolvedRadius} strokeColor={strokeColor} fillColor="rgba(255,23,68,0.08)" />;
}
