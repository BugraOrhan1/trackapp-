import React from 'react';
import { Marker } from 'react-native-maps';
import type { SpeedCamera } from '../../types';

type Props = {
  camera: SpeedCamera;
  onPress?: () => void;
};

export default function SpeedCameraMarker({ camera, onPress }: Props): JSX.Element {
  return (
    <Marker
      coordinate={{ latitude: camera.latitude, longitude: camera.longitude }}
      title="Speed camera"
      description={camera.roadName}
      pinColor="#FF1744"
      onPress={onPress}
    />
  );
}
