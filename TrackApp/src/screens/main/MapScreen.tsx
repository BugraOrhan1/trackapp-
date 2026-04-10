import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import MapView, { PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useLocation } from '../../hooks/useLocation';
import { useReports } from '../../hooks/useReports';
import { useSpeedCameras } from '../../hooks/useSpeedCameras';
import { useSubscription } from '../../hooks/useSubscription';
import { useMapStore } from '../../store/mapStore';
import { useAlerts } from '../../hooks/useAlerts';

import UserMarker from '../../components/map/UserMarker';
import SpeedCameraMarker from '../../components/map/SpeedCameraMarker';
import ReportMarker from '../../components/map/ReportMarker';
import EmergencyMarker from '../../components/map/EmergencyMarker';
import ProximityCircle from '../../components/map/ProximityCircle';
import AlertBanner from '../../components/alerts/AlertBanner';
import QuickReportButton from '../../components/reports/QuickReportButton';
import SpeedIndicator from '../../components/map/SpeedIndicator';
import ConnectionStatusBadge from '../../components/scanner/ConnectionStatusBadge';
import BottomSheet from '../../components/common/BottomSheet';
import NearbyAlertsList from '../../components/alerts/NearbyAlertsList';

import { COLORS, MAP_CONFIG } from '../../config/constants';
import type { MainTabScreenProps } from '../../navigation/types';

export default function MapScreen() {
  const navigation = useNavigation<MainTabScreenProps<'Map'>['navigation']>();
  const mapRef = useRef<MapView>(null);
  const { location, startWatching, permissionGranted } = useLocation();
  const { isPremium } = useSubscription();
  const { reports } = useReports(location, 10);
  const { speedCameras: cameras } = useSpeedCameras(location, 10);
  const { followUser, setFollowUser, detections, setUserLocation } = useMapStore();
  const { activeAlerts, dismissAlert } = useAlerts(location, cameras, reports, isPremium ? detections : []);

  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (permissionGranted) {
      startWatching();
    }
  }, [permissionGranted, startWatching]);

  useEffect(() => {
    if (location) {
      setUserLocation(location);
    }
  }, [location, setUserLocation]);

  useEffect(() => {
    if (location && followUser && mapReady && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }, [location?.latitude, location?.longitude, followUser, mapReady]);

  function handleRegionChange(_region: Region) {
    if (followUser) setFollowUser(false);
  }

  function centerOnUser() {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setFollowUser(true);
    }
  }

  function openScanner() {
    navigation.navigate(isPremium ? 'Scanner' : 'Paywall');
  }

  return (
    <View style={styles.container}>
      {activeAlerts.length > 0 ? <AlertBanner alert={activeAlerts[0]} onDismiss={() => dismissAlert(activeAlerts[0].id)} /> : null}

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={MAP_CONFIG.INITIAL_REGION}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        onRegionChangeComplete={handleRegionChange}
        onMapReady={() => setMapReady(true)}
      >
        {location ? <UserMarker coordinate={{ latitude: location.latitude, longitude: location.longitude }} heading={location.heading} /> : null}
        {cameras.map((camera: (typeof cameras)[number]) => <SpeedCameraMarker key={camera.id} camera={camera} onPress={() => setBottomSheetVisible(true)} />)}
        {reports.map((report: (typeof reports)[number]) => <ReportMarker key={report.id} report={report} onPress={() => setBottomSheetVisible(true)} />)}
        {isPremium ? detections.map((detection: (typeof detections)[number]) => (
          <React.Fragment key={detection.id}>
            <EmergencyMarker detection={detection} onPress={() => setBottomSheetVisible(true)} />
            <ProximityCircle center={{ latitude: location?.latitude || 0, longitude: location?.longitude || 0 }} radiusMeters={detection.distanceKm * 1000} serviceType={detection.serviceType} />
          </React.Fragment>
        )) : null}
      </MapView>

      {location?.speed ? <SpeedIndicator speed={location.speed} /> : null}
      {isPremium ? <ConnectionStatusBadge onPress={openScanner} /> : null}

      <TouchableOpacity style={[styles.centerButton, followUser && styles.centerButtonActive]} onPress={centerOnUser}>
        <Ionicons name={followUser ? 'navigate' : 'navigate-outline'} size={24} color={followUser ? COLORS.primary : COLORS.gray300} />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.scannerButton, !isPremium && styles.scannerButtonLocked]} onPress={openScanner}>
        <Ionicons name="radio" size={24} color={isPremium ? COLORS.premium : COLORS.gray500} />
        {!isPremium ? <View style={styles.lockBadge}><Ionicons name="lock-closed" size={10} color="#FFF" /></View> : null}
      </TouchableOpacity>

      <View style={styles.quickReportContainer}>
        <QuickReportButton type="speed_camera_mobile" icon="📸" label="Flitser" onPress={() => navigation.navigate('Report')} />
        <QuickReportButton type="police_control" icon="🚔" label="Controle" onPress={() => navigation.navigate('Report')} />
        <QuickReportButton type="accident" icon="🚨" label="Ongeluk" onPress={() => navigation.navigate('Report')} />
      </View>

      <TouchableOpacity style={styles.bottomSheetHandle} onPress={() => setBottomSheetVisible(true)}>
        <View style={styles.handleBar} />
        <Text style={styles.handleText}>{cameras.length + reports.length} meldingen in de buurt</Text>
      </TouchableOpacity>

      <BottomSheet visible={bottomSheetVisible} onClose={() => setBottomSheetVisible(false)}>
        <NearbyAlertsList cameras={cameras} reports={reports} detections={isPremium ? detections : []} />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.secondary },
  map: { flex: 1 },
  centerButton: { position: 'absolute', right: 16, bottom: 200, width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center' },
  centerButtonActive: { backgroundColor: COLORS.gray800 },
  scannerButton: { position: 'absolute', right: 16, bottom: 260, width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center' },
  scannerButtonLocked: { opacity: 0.7 },
  lockBadge: { position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.gray600, justifyContent: 'center', alignItems: 'center' },
  quickReportContainer: { position: 'absolute', left: 16, bottom: 200, flexDirection: 'column', gap: 12 },
  bottomSheetHandle: { position: 'absolute', bottom: 90, left: 16, right: 16, backgroundColor: COLORS.secondary, borderRadius: 16, padding: 12, alignItems: 'center' },
  handleBar: { width: 40, height: 4, backgroundColor: COLORS.gray600, borderRadius: 2, marginBottom: 8 },
  handleText: { color: COLORS.gray300, fontSize: 14 },
});
