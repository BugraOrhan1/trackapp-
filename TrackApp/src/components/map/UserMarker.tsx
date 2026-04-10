import React from 'react';
import { Marker } from 'react-native-maps';
import type { Location } from '../../types';

type Props = {
  location?: Location;
  coordinate?: { latitude: number; longitude: number };
  heading?: number;
};

export default function UserMarker({ location, coordinate, heading }: Props): JSX.Element | null {
  const resolvedCoordinate = coordinate ?? (location ? { latitude: location.latitude, longitude: location.longitude } : null);
  if (!resolvedCoordinate) return null;

  return (
    <Marker
      coordinate={resolvedCoordinate}
      title="Jij bent hier"
      pinColor="#FF6B00"
      rotation={heading ?? location?.heading ?? 0}
    />
  );
}
