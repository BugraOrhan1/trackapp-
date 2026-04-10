import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Detection } from '../../types';
import { COLORS } from '../../config/constants';
import { formatEmergencyService, formatDistanceKm } from '../../utils/formatters';

interface DetectionCardProps {
  detection: Detection;
}

const colorByService: Record<Detection['serviceType'], string> = {
  police: COLORS.police,
  ambulance: COLORS.warning,
  fire: COLORS.danger,
  defense: COLORS.success,
  unknown: COLORS.gray500,
};

const iconByService: Record<Detection['serviceType'], string> = {
  police: '🚓',
  ambulance: '🚑',
  fire: '🚒',
  defense: '🎖️',
  unknown: '📡',
};

export default function DetectionCard({ detection }: DetectionCardProps): JSX.Element {
  const signalBars = Math.max(1, Math.min(5, Math.round((Math.abs(detection.rssi) - 40) / 10)));

  return (
    <View style={[styles.card, { borderLeftColor: colorByService[detection.serviceType] }]}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{iconByService[detection.serviceType]}</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>{formatEmergencyService(detection.serviceType)}</Text>
          <Text style={styles.meta}>{formatDistanceKm(detection.distanceKm)}</Text>
        </View>
        <Text style={styles.bearing}>{typeof detection.bearing === 'number' ? `${Math.round(detection.bearing)}°` : '→'}</Text>
      </View>

      <View style={styles.details}>
        <Text style={styles.detail}>Frequentie: {detection.frequency.toFixed(2)} MHz</Text>
        <Text style={styles.detail}>RSSI: {Math.round(detection.rssi)} dBm</Text>
      </View>

      <View style={styles.signalRow}>
        {Array.from({ length: 5 }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.signalBar,
              index < signalBars ? { backgroundColor: colorByService[detection.serviceType] } : styles.signalBarMuted,
              { height: 4 + index * 3 },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.gray700,
    borderLeftWidth: 4,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#121826',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 18 },
  content: { flex: 1 },
  title: { color: COLORS.gray100, fontWeight: '800' },
  meta: { color: COLORS.gray400, marginTop: 2, fontSize: 12 },
  bearing: { color: COLORS.gray100, fontSize: 18, fontWeight: '900' },
  details: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  detail: { color: COLORS.gray300, fontSize: 12 },
  signalRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  signalBar: { width: 6, borderRadius: 999, backgroundColor: COLORS.gray400 },
  signalBarMuted: { backgroundColor: '#2a3345' },
});
