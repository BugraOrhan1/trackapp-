import React from 'react';
import { Marker } from 'react-native-maps';
import type { Detection } from '../../types';

export default function EmergencyMarker({ detection }: { detection: Detection }): JSX.Element {
  return <Marker coordinate={{ latitude: detection.latitude, longitude: detection.longitude }} title={detection.serviceType} />;
}
