import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../config/constants';

type Props = {
  small?: boolean;
};

export default function PremiumBadge({ small = false }: Props): JSX.Element {
  return (
    <View style={[styles.badge, small && styles.smallBadge]}>
      <Text style={[styles.text, small && styles.smallText]}>💎 PREMIUM</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: COLORS.premium,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  smallBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  smallText: {
    fontSize: 10,
  },
});
