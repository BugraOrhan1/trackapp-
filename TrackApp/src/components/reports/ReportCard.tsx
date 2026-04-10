import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../config/theme';
import type { Report } from '../../types';
import { formatReportType } from '../../utils/formatters';

type Props = {
  report: Report;
  onVote?: (voteType: 'up' | 'down') => void;
};

export default function ReportCard({ report, onVote }: Props): JSX.Element {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{formatReportType(report.type)}</Text>
      <Text style={styles.meta}>{report.address ?? 'Onbekend adres'}</Text>
      <View style={styles.actions}>
        {onVote ? (
          <>
            <Pressable onPress={() => onVote('up')} style={styles.voteButton}>
              <Text style={styles.voteText}>👍 {report.upvotes}</Text>
            </Pressable>
            <Pressable onPress={() => onVote('down')} style={styles.voteButton}>
              <Text style={styles.voteText}>👎 {report.downvotes}</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#0f172a', borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: 14, gap: 4 },
  title: { color: theme.colors.text, fontWeight: '800', marginBottom: 4 },
  meta: { color: theme.colors.muted },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  voteButton: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#121a2a' },
  voteText: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
});
