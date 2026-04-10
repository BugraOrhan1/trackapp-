import React from 'react';
import { Circle } from 'react-native-maps';

export default function ProximityCircle({ latitude, longitude, radius = 1000 }: { latitude: number; longitude: number; radius?: number }): JSX.Element {
  return <Circle center={{ latitude, longitude }} radius={radius} strokeColor="#FF1744" fillColor="rgba(255,23,68,0.08)" />;
}
