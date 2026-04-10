import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function PremiumBadge(): JSX.Element {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>PREMIUM</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { backgroundColor: '#FFD700', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  text: { color: '#111827', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
});
