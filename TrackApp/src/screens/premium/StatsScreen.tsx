import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Share } from 'react-native';
import { useScannerStore } from '../../store/scannerStore';
import { theme } from '../../config/theme';
import { COLORS, SIZES } from '../../config/constants';
import { formatEmergencyService, formatRelativeTime } from '../../utils/formatters';
import type { Detection } from '../../types';

export default function StatsScreen(): JSX.Element {
  const detections = useScannerStore((state: { detections: Detection[] }) => state.detections);

  const total = detections.length;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const thisWeek = detections.filter((detection: Detection) => new Date(detection.createdAt).getTime() >= sevenDaysAgo);
  const thisMonth = detections.filter((detection: Detection) => new Date(detection.createdAt).getTime() >= thirtyDaysAgo);
  const grouped: Record<string, number> = detections.reduce((accumulator: Record<string, number>, detection: Detection) => {
    accumulator[detection.serviceType] = (accumulator[detection.serviceType] ?? 0) + 1;
    return accumulator;
  }, {});
  const groupedEntries = Object.entries(grouped) as Array<[string, number]>;
  const topEntry = groupedEntries.sort((left, right) => right[1] - left[1])[0];

  async function handleExport() {
    const csv = [
      'service_type,rssi,distance_km,frequency,created_at',
      ...detections.map((detection: Detection) => [
        detection.serviceType,
        detection.rssi,
        detection.distanceKm,
        detection.frequency,
        new Date(detection.createdAt).toISOString(),
      ].join(',')),
    ].join('\n');

    await Share.share({ message: csv, title: 'TrackApp export' });
  }

  const recentDetections = [...detections].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()).slice(0, 5);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>Premium</Text>
      <Text style={styles.title}>Statistieken</Text>
      <Text style={styles.subtitle}>Inzicht in detecties, activiteit en het verkeer dat je scanner oppikt.</Text>

      <View style={styles.grid}>
        <StatCard label="Totaal" value={`${total}`} />
        <StatCard label="Deze week" value={`${thisWeek.length}`} />
        <StatCard label="Deze maand" value={`${thisMonth.length}`} />
        <StatCard label="Top type" value={topEntry ? formatEmergencyService(topEntry[0]) : '-'} />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Detecties per type</Text>
          <Pressable onPress={handleExport} style={styles.exportButton}>
            <Text style={styles.exportText}>CSV export</Text>
          </Pressable>
        </View>

        {groupedEntries.length === 0 ? (
          <Text style={styles.empty}>Nog geen detecties beschikbaar.</Text>
        ) : (
          <View style={styles.bars}>
            {groupedEntries.map(([serviceType, count]) => {
              const maxCount = Math.max(...groupedEntries.map(([, value]) => value));

              return (
                <View key={serviceType} style={styles.barRow}>
                  <Text style={styles.barLabel}>{formatEmergencyService(serviceType)}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${(count / maxCount) * 100}%` }]} />
                  </View>
                  <Text style={styles.barValue}>{count}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recente route-geschiedenis</Text>
        {recentDetections.length === 0 ? (
          <Text style={styles.empty}>Geen recente detecties.</Text>
        ) : (
          recentDetections.map((detection) => (
            <View key={detection.id} style={styles.routeRow}>
              <View style={styles.routeIcon}>
                <Text style={styles.routeIconText}>•</Text>
              </View>
              <View style={styles.routeInfo}>
                <Text style={styles.routeTitle}>{formatEmergencyService(detection.serviceType)}</Text>
                <Text style={styles.routeMeta}>
                  {detection.distanceKm.toFixed(1)} km • RSSI {detection.rssi} • {formatRelativeTime(new Date(detection.createdAt))}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: SIZES.lg, paddingBottom: 48 },
  kicker: { color: COLORS.premium, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  title: { color: theme.colors.text, fontSize: 30, fontWeight: '900' },
  subtitle: { color: theme.colors.muted, marginTop: 8, marginBottom: 20, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: '48%', backgroundColor: '#0f172a', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: theme.colors.border },
  statValue: { color: theme.colors.text, fontSize: 26, fontWeight: '900' },
  statLabel: { color: theme.colors.muted, marginTop: 4 },
  section: { marginTop: 20, backgroundColor: '#0f172a', borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, padding: 16, gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
  exportButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#172033' },
  exportText: { color: theme.colors.text, fontWeight: '700', fontSize: 12 },
  bars: { gap: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { width: 130, color: theme.colors.text, fontSize: 12 },
  barTrack: { flex: 1, height: 10, borderRadius: 999, backgroundColor: '#172033', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999, backgroundColor: COLORS.primary },
  barValue: { width: 24, textAlign: 'right', color: theme.colors.text, fontWeight: '700' },
  empty: { color: theme.colors.muted },
  routeRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  routeIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#172033', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  routeIconText: { color: COLORS.primary, fontSize: 18, lineHeight: 18 },
  routeInfo: { flex: 1 },
  routeTitle: { color: theme.colors.text, fontWeight: '700' },
  routeMeta: { color: theme.colors.muted, marginTop: 2, fontSize: 12 },
});
