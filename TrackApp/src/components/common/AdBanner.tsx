import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../config/theme';

export default function AdBanner(): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Advertentie</Text>
      <Text style={styles.text}>Upgrade naar Premium voor reclamevrij rijden.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#0f172a', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: theme.colors.border, marginVertical: 8 },
  label: { color: theme.colors.premium, fontWeight: '800', marginBottom: 4 },
  text: { color: theme.colors.text },
});
