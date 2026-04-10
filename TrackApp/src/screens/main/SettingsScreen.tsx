import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { theme } from '../../config/theme';

export default function SettingsScreen(): JSX.Element {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Instellingen</Text>
      <Text style={styles.item}>Locatie, notificaties en kaartstijl komen hier.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, gap: 8 },
  title: { color: theme.colors.text, fontSize: 24, fontWeight: '900' },
  item: { color: theme.colors.muted },
});
