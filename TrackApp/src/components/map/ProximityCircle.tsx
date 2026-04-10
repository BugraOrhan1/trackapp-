import React from 'react';
import { Circle } from 'react-native-maps';
import type { EmergencyServiceType } from '../../types';
import { COLORS } from '../../config/constants';

type Props = {
  center: { latitude: number; longitude: number };
  radiusMeters: number;
  serviceType: EmergencyServiceType;
};

const colors: Record<EmergencyServiceType, string> = {
  police: COLORS.police,
  ambulance: COLORS.warning,
  fire: COLORS.danger,
  defense: COLORS.success,
  unknown: COLORS.gray500,
};

export default function ProximityCircle({ center, radiusMeters, serviceType }: Props): JSX.Element {
  const color = colors[serviceType];

  return (
    <Circle
      center={center}
      radius={radiusMeters}
      strokeColor={color}
      fillColor={`${color}1A`}
      strokeWidth={2}
    />
  );
}
