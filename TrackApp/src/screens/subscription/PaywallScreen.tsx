import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../../components/common/Button';
import { theme } from '../../config/theme';

export default function PaywallScreen(): JSX.Element {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Premium</Text>
      <View style={styles.card}>
        <Text style={styles.item}>€100/jaar of €9,99/maand</Text>
        <Text style={styles.item}>Raspberry Pi + RTL-SDR</Text>
        <Text style={styles.item}>Real-time proximity alerts</Text>
        <Text style={styles.item}>Geen advertenties</Text>
        <Text style={styles.item}>Statistieken</Text>
      </View>
      <Button title="Koop Premium" onPress={() => {}} />
      <Button title="Aankopen herstellen" onPress={() => {}} variant="secondary" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, gap: 12 },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '900' },
  card: { backgroundColor: '#0f172a', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.colors.border, gap: 8 },
  item: { color: theme.colors.text },
});
