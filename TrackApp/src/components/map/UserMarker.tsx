import React from 'react';
import { Marker } from 'react-native-maps';
import type { Location } from '../../types';

export default function UserMarker({ location }: { location: Location }): JSX.Element {
  return <Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }} title="Jij bent hier" pinColor="#FF6B00" />;
}
