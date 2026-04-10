import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useLocation } from '../../hooks/useLocation';
import { useReports } from '../../hooks/useReports';
import { useSpeedCameras } from '../../hooks/useSpeedCameras';
import { useSubscription } from '../../hooks/useSubscription';
import { useMapStore } from '../../store/mapStore';

import ReportCard from '../../components/reports/ReportCard';
import SpeedCameraCard from '../../components/map/SpeedCameraCard';
import DetectionCard from '../../components/scanner/DetectionCard';
import EmptyState from '../../components/common/EmptyState';

import { COLORS, SIZES } from '../../config/constants';
import type { Report, SpeedCamera, Detection } from '../../types';

type TabType = 'all' | 'cameras' | 'reports' | 'emergency';

export default function AlertsScreen() {
  const { location } = useLocation();
  const { reports, refresh: refreshReports, voteReport } = useReports(location, 20);
  const { cameras, refresh: refreshCameras } = useSpeedCameras(location, 20);
  const { isPremium } = useSubscription();
  const { detections } = useMapStore();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([refreshReports(), refreshCameras()]);
    setRefreshing(false);
  }

  function getFilteredData(): (SpeedCamera | Report | Detection)[] {
    switch (activeTab) {
      case 'cameras':
        return cameras;
      case 'reports':
        return reports;
      case 'emergency':
        return isPremium ? detections : [];
      case 'all':
      default:
        return [
          ...cameras.map((c: SpeedCamera) => ({ ...c, _type: 'camera' as const })),
          ...reports.map((r: Report) => ({ ...r, _type: 'report' as const })),
          ...(isPremium ? detections.map((d: Detection) => ({ ...d, _type: 'detection' as const })) : []),
        ].sort((a: any, b: any) => (a.distance || 999) - (b.distance || 999));
    }
  }

  function renderItem({ item }: { item: any }) {
    if (item._type === 'camera' || 'speedLimit' in item) return <SpeedCameraCard camera={item} />;
    if (item._type === 'detection' || 'serviceType' in item) return <DetectionCard detection={item} />;
    return <ReportCard report={item} onVote={(voteType) => voteReport(item.id, voteType)} />;
  }

  const data = getFilteredData();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Meldingen</Text>
        <Text style={styles.subtitle}>In de buurt ({data.length})</Text>
      </View>

      <View style={styles.tabs}>
        {(['all', 'cameras', 'reports', 'emergency'] as TabType[]).map((tab) => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'all' && 'Alles'}{tab === 'cameras' && '📸 Flitsers'}{tab === 'reports' && '📍 Meldingen'}{tab === 'emergency' && '🚨 Hulpdiensten'}
            </Text>
            {tab === 'emergency' && !isPremium ? <Ionicons name="lock-closed" size={12} color={COLORS.gray500} /> : null}
          </TouchableOpacity>
        ))}
      </View>

      {data.length === 0 ? (
        <EmptyState icon="📍" title="Geen meldingen" message={activeTab === 'emergency' && !isPremium ? 'Upgrade naar Premium om hulpdiensten detectie te gebruiken' : 'Er zijn geen meldingen in je buurt'} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item: any) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.secondary },
  header: { paddingHorizontal: SIZES.lg, paddingTop: 60, paddingBottom: SIZES.md },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.gray100 },
  subtitle: { fontSize: 14, color: COLORS.gray500, marginTop: SIZES.xs },
  tabs: { flexDirection: 'row', paddingHorizontal: SIZES.md, marginBottom: SIZES.md },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, marginRight: SIZES.sm, borderRadius: 20, backgroundColor: COLORS.gray800 },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 13, color: COLORS.gray400, marginRight: 4 },
  tabTextActive: { color: '#FFF', fontWeight: '600' },
  listContent: { padding: SIZES.md, paddingBottom: 100 },
});
