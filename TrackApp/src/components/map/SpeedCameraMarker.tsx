import React from 'react';
import { Marker } from 'react-native-maps';
import type { SpeedCamera } from '../../types';

export default function SpeedCameraMarker({ camera }: { camera: SpeedCamera }): JSX.Element {
  return <Marker coordinate={{ latitude: camera.latitude, longitude: camera.longitude }} title="Speed camera" description={camera.roadName} />;
}
