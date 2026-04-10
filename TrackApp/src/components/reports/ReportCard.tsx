import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Report } from '../../types';
import { COLORS } from '../../config/constants';
import { formatDistance, formatRelativeTime, formatReportType } from '../../utils/formatters';

type Props = {
  report: Report;
  onVote: (voteType: 'up' | 'down') => void;
};

const icons: Record<Report['type'], string> = {
  speed_camera_mobile: '📸',
  police_control: '🚔',
  accident: '🚨',
  traffic_jam: '🚗',
  roadwork: '🚧',
  danger: '⚠️',
  other: '📍',
};

const borderColors: Record<Report['type'], string> = {
  speed_camera_mobile: COLORS.primary,
  police_control: COLORS.policeControl,
  accident: COLORS.danger,
  traffic_jam: COLORS.warning,
  roadwork: COLORS.roadwork,
  danger: COLORS.warning,
  other: COLORS.gray500,
};

export default function ReportCard({ report, onVote }: Props): JSX.Element {
  return (
    <View style={[styles.card, { borderLeftColor: borderColors[report.type] }]}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{icons[report.type]}</Text>
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{formatReportType(report.type)}</Text>
          <Text style={styles.meta}>{report.address ?? 'Onbekend adres'}</Text>
        </View>
        <Text style={styles.time}>{formatRelativeTime(report.createdAt)}</Text>
      </View>

      {report.description ? <Text style={styles.description}>{report.description}</Text> : null}

      <View style={styles.footer}>
        <Text style={styles.distance}>{typeof report.distance === 'number' ? formatDistance(report.distance) : 'Afstand onbekend'}</Text>
        <View style={styles.votes}>
          <Pressable onPress={() => onVote('up')} style={styles.voteButton}>
            <Ionicons name="thumbs-up" size={16} color={COLORS.success} />
            <Text style={styles.voteText}>{report.upvotes}</Text>
          </Pressable>
          <Pressable onPress={() => onVote('down')} style={styles.voteButton}>
            <Ionicons name="thumbs-down" size={16} color={COLORS.danger} />
            <Text style={styles.voteText}>{report.downvotes}</Text>
          </Pressable>
        </View>
      </View>
    </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  headerContent: { flex: 1 },
  title: { color: COLORS.gray100, fontWeight: '800' },
  meta: { color: COLORS.gray400, marginTop: 2, fontSize: 12 },
  time: { color: COLORS.gray500, fontSize: 11 },
  description: { color: COLORS.gray200, lineHeight: 19 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  distance: { color: COLORS.gray300, fontSize: 12, fontWeight: '700' },
  votes: { flexDirection: 'row', gap: 8 },
  voteButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#121826', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  voteText: { color: COLORS.gray100, fontWeight: '700' },
});
