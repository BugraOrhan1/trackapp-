import React, { useMemo } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import type { Detection, Report, SpeedCamera } from '../../types';
import { COLORS } from '../../config/constants';
import SpeedCameraCard from '../map/SpeedCameraCard';
import ReportCard from '../reports/ReportCard';
import DetectionCard from '../scanner/DetectionCard';

type Props = {
  cameras: SpeedCamera[];
  reports: Report[];
  detections: Detection[];
};

type SectionItem =
  | { kind: 'camera'; item: SpeedCamera }
  | { kind: 'report'; item: Report }
  | { kind: 'detection'; item: Detection };

export default function NearbyAlertsList({ cameras, reports, detections }: Props): JSX.Element {
  const sections = useMemo(() => {
    const sortedCameras = [...cameras].sort((left, right) => (left.distance ?? 99999) - (right.distance ?? 99999));
    const sortedReports = [...reports].sort((left, right) => (left.distance ?? 99999) - (right.distance ?? 99999));
    const sortedDetections = [...detections].sort((left, right) => (left.distanceKm ?? 99999) - (right.distanceKm ?? 99999));

    return [
      {
        title: `📸 Flitsers (${sortedCameras.length})`,
        data: sortedCameras.map((item) => ({ kind: 'camera' as const, item })),
      },
      {
        title: `📍 Meldingen (${sortedReports.length})`,
        data: sortedReports.map((item) => ({ kind: 'report' as const, item })),
      },
      ...(sortedDetections.length > 0
        ? [
            {
              title: `🚨 Hulpdiensten (${sortedDetections.length})`,
              data: sortedDetections.map((item) => ({ kind: 'detection' as const, item })),
            },
          ]
        : []),
    ];
  }, [cameras, detections, reports]);

  if (sections.every((section) => section.data.length === 0)) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.empty}>Geen waarschuwingen in de buurt</Text>
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item, index) => `${item.kind}-${index}`}
      renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
      renderItem={({ item }) => {
        if (item.kind === 'camera') return <SpeedCameraCard camera={item.item} />;
        if (item.kind === 'report') return <ReportCard report={item.item} onVote={() => undefined} />;
        return <DetectionCard detection={item.item} />;
      }}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={styles.content}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 12,
    gap: 10,
  },
  sectionHeader: {
    color: COLORS.gray100,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 8,
    marginBottom: 8,
  },
  emptyWrap: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  empty: {
    color: COLORS.gray400,
  },
});