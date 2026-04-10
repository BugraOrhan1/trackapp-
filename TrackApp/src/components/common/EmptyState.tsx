import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../config/theme';

type Props = {
  icon: string;
  title: string;
  message: string;
};

export default function EmptyState({ icon, title, message }: Props): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  message: {
    color: theme.colors.muted,
    textAlign: 'center',
  },
});