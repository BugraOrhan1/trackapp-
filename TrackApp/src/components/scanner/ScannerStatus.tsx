import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../config/constants';

export default function ScannerStatus({ connected }: { connected: boolean }): JSX.Element {
  return (
    <View style={[styles.container, connected ? styles.connected : styles.disconnected]}>
      <Text style={styles.text}>{connected ? 'Verbonden' : 'Niet verbonden'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, borderRadius: 14, backgroundColor: '#0f172a' },
  connected: { borderWidth: 1, borderColor: COLORS.success },
  disconnected: { borderWidth: 1, borderColor: COLORS.gray700 },
  text: { color: COLORS.gray100, fontWeight: '700' },
});
