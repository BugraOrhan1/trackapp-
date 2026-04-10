import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../config/theme';

export default function ScannerStatus({ connected }: { connected: boolean }): JSX.Element {
  return <View style={styles.container}><Text style={styles.text}>{connected ? 'Verbonden' : 'Niet verbonden'}</Text></View>;
}

const styles = StyleSheet.create({
  container: { padding: 12, borderRadius: 14, backgroundColor: '#0f172a' },
  text: { color: theme.colors.text, fontWeight: '700' },
});
