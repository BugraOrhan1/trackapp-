import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapViewBase, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import type { Location, Report, SpeedCamera } from '../../types';

type Props = {
  center?: Location | null;
  reports?: Report[];
  cameras?: SpeedCamera[];
};

export default function MapView({ center, reports = [], cameras = [] }: Props): JSX.Element {
  const initialRegion = center
    ? {
        latitude: center.latitude,
        longitude: center.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : undefined;

  return (
    <View style={styles.container}>
      <MapViewBase style={StyleSheet.absoluteFill} provider={PROVIDER_GOOGLE} initialRegion={initialRegion}>
        {center ? <Marker coordinate={{ latitude: center.latitude, longitude: center.longitude }} title="Jouw locatie" /> : null}
        {cameras.map((camera) => (
          <Marker key={camera.id} coordinate={{ latitude: camera.latitude, longitude: camera.longitude }} title="Flitser" />
        ))}
        {reports.map((report) => (
          <Marker key={report.id} coordinate={{ latitude: report.latitude, longitude: report.longitude }} title={report.type} />
        ))}
        {center ? <Circle center={{ latitude: center.latitude, longitude: center.longitude }} radius={1000} strokeColor="#FF6B00" fillColor="rgba(255,107,0,0.08)" /> : null}
      </MapViewBase>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, borderRadius: 24, overflow: 'hidden' },
});
