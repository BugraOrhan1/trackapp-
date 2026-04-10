import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../../components/common/Button';
import PremiumBadge from '../../components/common/PremiumBadge';
import { useBLE } from '../../hooks/useBLE';
import { useSubscription } from '../../hooks/useSubscription';
import { theme } from '../../config/theme';

export default function ScannerScreen(): JSX.Element {
  const { connect, disconnect, connected, error, connecting, deviceName } = useBLE();
  const { isPremium } = useSubscription();

  if (!isPremium) {
    return (
      <View style={styles.container}>
        <PremiumBadge />
        <Text style={styles.title}>Scanner is premium</Text>
        <Text style={styles.text}>Raspberry Pi + RTL-SDR connectie is alleen beschikbaar voor Premium.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Scanner</Text>
      <Text style={styles.text}>Status: {connected ? `Verbonden met ${deviceName ?? 'TrackApp-RPI'}` : 'Niet verbonden'}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title={connected ? 'Verbreek verbinding' : 'Verbind met Pi'} onPress={connected ? disconnect : connect} loading={connecting} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 16 },
  content: { gap: 10 },
  title: { color: theme.colors.text, fontSize: 24, fontWeight: '900' },
  text: { color: theme.colors.muted },
  error: { color: theme.colors.danger },
});
