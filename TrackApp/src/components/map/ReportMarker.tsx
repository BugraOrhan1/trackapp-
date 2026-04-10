import React from 'react';
import { Marker } from 'react-native-maps';
import type { Report } from '../../types';

type Props = {
  report: Report;
  onPress?: () => void;
};

export default function ReportMarker({ report, onPress }: Props): JSX.Element {
  return (
    <Marker
      coordinate={{ latitude: report.latitude, longitude: report.longitude }}
      title={report.type}
      description={report.description}
      pinColor="#FF6B00"
      onPress={onPress}
    />
  );
}
