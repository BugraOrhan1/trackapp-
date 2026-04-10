import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../config/constants';

type Props = {
  visible: boolean;
};

export default function AdBanner({ visible }: Props): JSX.Element | null {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Advertentie</Text>
      <Text style={styles.text}>Upgrade naar Premium voor geen reclame.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.gray700,
    marginVertical: 8,
  },
  label: {
    color: COLORS.premium,
    fontWeight: '800',
    marginBottom: 4,
  },
  text: {
    color: COLORS.gray100,
  },
});
