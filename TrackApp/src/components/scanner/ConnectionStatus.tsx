import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../config/theme';

export default function ConnectionStatus({ connected, deviceName }: { connected: boolean; deviceName?: string }): JSX.Element {
  return <View style={styles.container}><Text style={styles.text}>{connected ? `Verbonden met ${deviceName ?? 'TrackApp-RPI'}` : 'Niet verbonden'}</Text></View>;
}

const styles = StyleSheet.create({
  container: { padding: 12, borderRadius: 14, backgroundColor: '#0f172a' },
  text: { color: theme.colors.text, fontWeight: '700' },
});
