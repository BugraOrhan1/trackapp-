import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../config/theme';

type Props = {
  speed: number;
};

export default function SpeedIndicator({ speed }: Props): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Snelheid</Text>
      <Text style={styles.value}>{Math.round(speed * 3.6)} km/u</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  label: {
    color: theme.colors.muted,
    fontSize: 10,
    textAlign: 'center',
  },
  value: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
});