import React from 'react';
import { Marker } from 'react-native-maps';
import type { Detection } from '../../types';

type Props = {
  detection: Detection;
  onPress?: () => void;
};

export default function EmergencyMarker({ detection, onPress }: Props): JSX.Element {
  return (
    <Marker
      coordinate={{ latitude: detection.latitude, longitude: detection.longitude }}
      title={detection.serviceType}
      pinColor="#FFD700"
      onPress={onPress}
    />
  );
}
