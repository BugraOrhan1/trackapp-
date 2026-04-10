import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../config/theme';
import type { Report } from '../../types';

export default function ReportCard({ report }: { report: Report }): JSX.Element {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{report.type}</Text>
      <Text style={styles.meta}>{report.address ?? 'Onbekend adres'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#0f172a', borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: 14 },
  title: { color: theme.colors.text, fontWeight: '800', marginBottom: 4 },
  meta: { color: theme.colors.muted },
});
