import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Button from '../../components/common/Button';
import { useBLE } from '../../hooks/useBLE';
import { theme } from '../../config/theme';

export default function PairDeviceScreen(): JSX.Element {
  const { connect, connecting } = useBLE();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Apparaat koppelen</Text>
      <Text style={styles.text}>Zoek naar TrackApp-RPI op het netwerk en maak verbinding.</Text>
      <Button title="Zoek en verbind" onPress={connect} loading={connecting} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 16, justifyContent: 'center', gap: 12 },
  title: { color: theme.colors.text, fontSize: 24, fontWeight: '900' },
  text: { color: theme.colors.muted },
});
