import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { theme } from '../../config/theme';

export default function ProfileScreen(): JSX.Element {
  const user = useAuthStore((state) => state.user);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profiel</Text>
      <Text style={styles.item}>Gebruiker: {user?.username ?? 'Gast'}</Text>
      <Text style={styles.item}>E-mail: {user?.email ?? '-'}</Text>
      <Text style={styles.item}>Abonnement: {user?.subscriptionType ?? 'free'}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, gap: 8 },
  title: { color: theme.colors.text, fontSize: 24, fontWeight: '900' },
  item: { color: theme.colors.muted },
});
