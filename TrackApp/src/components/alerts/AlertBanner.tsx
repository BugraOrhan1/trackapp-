import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../config/theme';
import type { Alert } from '../../types';

type Props = {
  alert?: Alert;
  title?: string;
  distance?: string;
  color?: string;
  onDismiss?: () => void;
};

export default function AlertBanner({ alert, title, distance, color = theme.colors.danger, onDismiss }: Props): JSX.Element {
  const resolvedTitle = alert?.title ?? title ?? '';
  const resolvedDistance = alert ? `${alert.distance} m` : distance;
  const resolvedColor = alert?.color ?? color;

  return (
    <Animated.View style={[styles.container, { borderColor: resolvedColor }]}>
      <Pressable onPress={onDismiss}>
        <Text style={styles.title}>{resolvedTitle}</Text>
        {resolvedDistance ? <Text style={styles.distance}>{resolvedDistance}</Text> : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#0f172a', borderRadius: 16, borderWidth: 1, padding: 12, marginBottom: 10 },
  title: { color: theme.colors.text, fontWeight: '800' },
  distance: { color: theme.colors.muted, marginTop: 4 },
});
