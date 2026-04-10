import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../config/theme';

type Props = { title: string; distance?: string; color?: string; onDismiss?: () => void };

export default function AlertBanner({ title, distance, color = theme.colors.danger, onDismiss }: Props): JSX.Element {
  return (
    <Animated.View style={[styles.container, { borderColor: color }]}>
      <Pressable onPress={onDismiss}>
        <Text style={styles.title}>{title}</Text>
        {distance ? <Text style={styles.distance}>{distance}</Text> : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#0f172a', borderRadius: 16, borderWidth: 1, padding: 12, marginBottom: 10 },
  title: { color: theme.colors.text, fontWeight: '800' },
  distance: { color: theme.colors.muted, marginTop: 4 },
});
