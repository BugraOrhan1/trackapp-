import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useMapStore } from '../../store/mapStore';
import { theme } from '../../config/theme';

export default function AlertsScreen(): JSX.Element {
  const alerts = useMapStore((state) => state.activeAlerts);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Actieve alerts</Text>
      {alerts.length ? alerts.map((alert) => <Text key={alert} style={styles.item}>{alert}</Text>) : <Text style={styles.item}>Geen alerts</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, gap: 8 },
  title: { color: theme.colors.text, fontSize: 24, fontWeight: '900' },
  item: { color: theme.colors.muted },
});
