import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Callout, Marker } from 'react-native-maps';
import type { Report } from '../../types';
import { COLORS } from '../../config/constants';
import { formatDistance, formatRelativeTime, formatReportType } from '../../utils/formatters';

type Props = {
  report: Report;
  onPress?: () => void;
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

const colors: Record<Report['type'], string> = {
  speed_camera_mobile: COLORS.primary,
  police_control: COLORS.policeControl,
  accident: COLORS.danger,
  traffic_jam: COLORS.warning,
  roadwork: COLORS.roadwork,
  danger: COLORS.warning,
  other: COLORS.gray400,
};

export default function ReportMarker({ report, onPress }: Props): JSX.Element {
  const resolvedColor = colors[report.type];
  const isFading = useMemo(() => {
    const expiresAt = report.expiresAt instanceof Date ? report.expiresAt : new Date(report.expiresAt);
    return expiresAt.getTime() - Date.now() < 15 * 60 * 1000;
  }, [report.expiresAt]);

  return (
    <Marker coordinate={{ latitude: report.latitude, longitude: report.longitude }} anchor={{ x: 0.5, y: 0.5 }} onPress={onPress} opacity={isFading ? 0.45 : 1}>
      <View style={styles.marker}>
        <Text style={styles.icon}>{icons[report.type]}</Text>
      </View>
      <Callout tooltip>
        <View style={styles.callout}>
          <Text style={styles.title}>{formatReportType(report.type)}</Text>
          {report.description ? <Text style={styles.description}>{report.description}</Text> : null}
          {report.address ? <Text style={styles.meta}>{report.address}</Text> : null}
          <View style={styles.row}>
            <Text style={styles.meta}>👍 {report.upvotes}</Text>
            <Text style={styles.meta}>👎 {report.downvotes}</Text>
          </View>
          {typeof report.distance === 'number' ? <Text style={[styles.meta, styles.distance]}>{formatDistance(report.distance)}</Text> : null}
          <Text style={styles.meta}>{formatRelativeTime(report.createdAt)}</Text>
        </View>
      </Callout>
    </Marker>
  );
}

const styles = StyleSheet.create({
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#121826',
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 16,
  },
  callout: {
    minWidth: 190,
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.gray700,
  },
  title: {
    color: COLORS.gray100,
    fontWeight: '800',
  },
  description: {
    color: COLORS.gray300,
    marginTop: 6,
  },
  meta: {
    color: COLORS.gray400,
    marginTop: 4,
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  distance: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
