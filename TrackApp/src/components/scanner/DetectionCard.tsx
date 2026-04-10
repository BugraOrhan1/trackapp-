import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../config/theme';
import type { Detection } from '../../types';

export default function DetectionCard({ detection }: { detection: Detection }): JSX.Element {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{detection.serviceType}</Text>
      <Text style={styles.text}>Afstand: {detection.distanceKm.toFixed(2)} km</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#0f172a', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: theme.colors.border },
  title: { color: theme.colors.text, fontWeight: '800' },
  text: { color: theme.colors.muted, marginTop: 4 },
});
