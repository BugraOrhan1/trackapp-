import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../config/theme';
import type { Detection, Report, SpeedCamera } from '../../types';

type Props = {
  cameras: SpeedCamera[];
  reports: Report[];
  detections: Detection[];
};

export default function NearbyAlertsList({ cameras, reports, detections }: Props): JSX.Element {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>In de buurt</Text>
      {cameras.length ? cameras.map((camera) => (
        <View key={camera.id} style={styles.card}>
          <Text style={styles.item}>📸 {camera.roadName ?? 'Flitser'}</Text>
          <Text style={styles.meta}>{typeof camera.distance === 'number' ? `${Math.round(camera.distance)} m` : '—'}</Text>
        </View>
      )) : null}
      {reports.length ? reports.map((report) => (
        <View key={report.id} style={styles.card}>
          <Text style={styles.item}>📍 {report.type}</Text>
          <Text style={styles.meta}>{report.address ?? 'Onbekend adres'}</Text>
        </View>
      )) : null}
      {detections.length ? detections.map((detection) => (
        <View key={detection.id} style={styles.card}>
          <Text style={styles.item}>🚨 {detection.serviceType}</Text>
          <Text style={styles.meta}>{detection.distanceKm.toFixed(1)} km</Text>
        </View>
      )) : null}
      {!cameras.length && !reports.length && !detections.length ? <Text style={styles.empty}>Geen items gevonden</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 10,
    paddingBottom: 12,
  },
  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  item: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  meta: {
    color: theme.colors.muted,
  },
  empty: {
    color: theme.colors.muted,
    paddingVertical: 12,
  },
});