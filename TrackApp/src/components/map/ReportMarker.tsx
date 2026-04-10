import React from 'react';
import { Marker } from 'react-native-maps';
import type { Report } from '../../types';

export default function ReportMarker({ report }: { report: Report }): JSX.Element {
  return <Marker coordinate={{ latitude: report.latitude, longitude: report.longitude }} title={report.type} description={report.description} />;
}
