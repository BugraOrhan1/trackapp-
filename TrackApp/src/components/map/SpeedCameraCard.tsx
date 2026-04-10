import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../config/theme';
import type { SpeedCamera } from '../../types';

type Props = {
  camera: SpeedCamera;
  onPress?: () => void;
};

export default function SpeedCameraCard({ camera, onPress }: Props): JSX.Element {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <Text style={styles.title}>📸 {camera.roadName ?? 'Flitser'}</Text>
      <Text style={styles.meta}>{camera.type}</Text>
      {typeof camera.distance === 'number' ? <Text style={styles.distance}>{Math.round(camera.distance)} m</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    gap: 4,
  },
  title: {
    color: theme.colors.text,
    fontWeight: '800',
  },
  meta: {
    color: theme.colors.muted,
  },
  distance: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
});