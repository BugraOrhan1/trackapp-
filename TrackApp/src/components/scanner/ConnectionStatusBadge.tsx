import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../config/theme';

type Props = {
  onPress: () => void;
};

export default function ConnectionStatusBadge({ onPress }: Props): JSX.Element {
  return (
    <Pressable onPress={onPress} style={styles.container}>
      <View style={styles.dot} />
      <Text style={styles.text}>Scanner</Text>
      <Ionicons name="chevron-forward" size={14} color={theme.colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    bottom: 250,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.success,
  },
  text: {
    color: theme.colors.text,
    fontWeight: '700',
  },
});