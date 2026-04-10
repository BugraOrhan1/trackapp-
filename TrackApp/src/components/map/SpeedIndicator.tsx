import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../config/constants';

type Props = {
  speed: number;
};

function getSpeedColor(kmh: number): string {
  if (kmh < 50) return COLORS.success;
  if (kmh < 80) return COLORS.warning;
  if (kmh < 100) return COLORS.primary;
  return COLORS.danger;
}

export default function SpeedIndicator({ speed }: Props): JSX.Element {
  const speedKmh = Math.round(speed * 3.6);
  const color = getSpeedColor(speedKmh);

  return (
    <View style={[styles.container, { borderColor: color }]}>
      <Text style={[styles.label, { color }]}>Snelheid</Text>
      <Text style={[styles.value, { color }]}>{speedKmh} km/u</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 16,
    backgroundColor: '#0f172a',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  label: {
    fontSize: 10,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  value: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
});