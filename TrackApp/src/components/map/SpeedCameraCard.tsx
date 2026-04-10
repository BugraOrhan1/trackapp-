import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SpeedCamera } from '../../types';
import { COLORS } from '../../config/constants';
import { formatDistance } from '../../utils/formatters';

type Props = {
  camera: SpeedCamera;
  onPress?: () => void;
};

const cameraColors: Record<SpeedCamera['type'], string> = {
  fixed: COLORS.speedCameraFixed,
  trajectory: COLORS.speedCameraTrajectory,
  red_light: COLORS.speedCameraFixed,
};

const icons: Record<SpeedCamera['type'], string> = {
  fixed: '📷',
  trajectory: '📹',
  red_light: '🚦',
};

export default function SpeedCameraCard({ camera, onPress }: Props): JSX.Element {
  return (
    <Pressable onPress={onPress} style={[styles.card, { borderLeftColor: cameraColors[camera.type] }]}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { borderColor: cameraColors[camera.type] }]}>
          <Text style={styles.icon}>{icons[camera.type]}</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>{camera.roadName ?? 'Flitser'}</Text>
          <Text style={styles.meta}>{camera.type === 'fixed' ? 'Vaste flitser' : camera.type === 'trajectory' ? 'Trajectcontrole' : 'Roodlichtcamera'}</Text>
          {camera.direction ? <Text style={styles.meta}>Richting: {camera.direction}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.gray500} />
      </View>
      <View style={styles.footer}>
        {typeof camera.speedLimit === 'number' ? <Text style={styles.limit}>{camera.speedLimit} km/u</Text> : <Text style={styles.limit}>Onbekende limiet</Text>}
        {typeof camera.distance === 'number' ? <Text style={styles.distance}>{formatDistance(camera.distance)}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.gray700,
    borderLeftWidth: 4,
    padding: 14,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121826',
  },
  icon: {
    fontSize: 18,
  },
  content: {
    flex: 1,
  },
  title: {
    color: COLORS.gray100,
    fontWeight: '800',
    fontSize: 15,
  },
  meta: {
    color: COLORS.gray400,
    marginTop: 2,
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  limit: {
    color: COLORS.gray100,
    fontWeight: '700',
  },
  distance: {
    color: COLORS.primary,
    fontWeight: '800',
  },
});