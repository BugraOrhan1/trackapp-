import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import MapView from '../../components/map/MapView';
import AlertBanner from '../../components/alerts/AlertBanner';
import Button from '../../components/common/Button';
import AdBanner from '../../components/common/AdBanner';
import { useLocation } from '../../hooks/useLocation';
import { useReports } from '../../hooks/useReports';
import { useSpeedCameras } from '../../hooks/useSpeedCameras';
import { useAlerts } from '../../hooks/useAlerts';
import { useMapStore } from '../../store/mapStore';
import { useSubscription } from '../../hooks/useSubscription';
import { theme } from '../../config/theme';

export default function MapScreen(): JSX.Element {
  const { location } = useLocation();
  const { reports } = useReports(location, 10);
  const { speedCameras } = useSpeedCameras(location, 10);
  const alerts = useMapStore((state: { activeAlerts: string[] }) => state.activeAlerts);
  const { isPremium } = useSubscription();
  const currentAlert = alerts[0];

  useAlerts();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>TrackApp</Text>
        <Text style={styles.subtitle}>Google Maps + meldingen + premium scanner</Text>
      </View>

      <View style={styles.mapWrap}>
        <MapView center={location} reports={reports} cameras={speedCameras} />
      </View>

      <View style={styles.overlay}>
        <Text style={styles.speed}>Snelheid: {location?.speed ? `${Math.round(location.speed * 3.6)} km/u` : '—'}</Text>
        {!isPremium ? <AdBanner /> : null}
        {currentAlert ? <AlertBanner title={currentAlert} /> : null}
        <View style={styles.actions}>
          <Button title="Rapport maken" onPress={() => {}} />
          <Button title="Scanner" onPress={() => {}} variant="secondary" />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { color: theme.colors.text, fontSize: 24, fontWeight: '900' },
  subtitle: { color: theme.colors.muted, marginTop: 4 },
  mapWrap: { flex: 1, marginHorizontal: 16, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  overlay: { padding: 16, gap: 10 },
  speed: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8 },
});
