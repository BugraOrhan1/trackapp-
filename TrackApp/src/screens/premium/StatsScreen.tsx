import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useScannerStore } from '../../store/scannerStore';
import { theme } from '../../config/theme';

export default function StatsScreen(): JSX.Element {
  const detections = useScannerStore((state) => state.detections);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Statistieken</Text>
      <Text style={styles.text}>Detecties vandaag: {detections.length}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 16, justifyContent: 'center' },
  title: { color: theme.colors.text, fontSize: 24, fontWeight: '900' },
  text: { color: theme.colors.muted, marginTop: 8 },
});
