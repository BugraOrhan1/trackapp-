import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { Device } from 'react-native-ble-plx';

import { useBLE } from '../../hooks/useBLE';
import { useSubscription } from '../../hooks/useSubscription';
import { useMapStore } from '../../store/mapStore';
import type { Detection } from '../../types';

import DetectionCard from '../../components/scanner/DetectionCard';
import EmptyState from '../../components/common/EmptyState';

import { COLORS, SIZES } from '../../config/constants';

export default function ScannerScreen() {
  const navigation = useNavigation();
  const { isPremium } = useSubscription();
  const { isConnected, isScanning, detections, loading, error, connect, disconnect, startScanner, stopScanner, scanForDevices, foundDevices } = useBLE();
  const { setDetections } = useMapStore();

  const [scanningForDevices, setScanningForDevices] = useState(false);

  useEffect(() => {
    if (!isPremium) {
      navigation.navigate('Paywall' as never);
    }
  }, [isPremium, navigation]);

  useEffect(() => {
    setDetections(detections);
  }, [detections, setDetections]);

  async function handleScanForDevices() {
    try {
      setScanningForDevices(true);
      await scanForDevices();
    } catch (err: any) {
      Alert.alert('Scan fout', err.message);
    } finally {
      setScanningForDevices(false);
    }
  }

  async function handleConnect(deviceId: string) {
    try {
      await connect(deviceId);
      Alert.alert('Verbonden!', 'Raspberry Pi is verbonden.');
    } catch (err: any) {
      Alert.alert('Verbinding mislukt', err.message);
    }
  }

  async function handleStartStop() {
    try {
      if (isScanning) {
        await stopScanner();
      } else {
        await startScanner();
      }
    } catch (err: any) {
      Alert.alert('Fout', err.message);
    }
  }

  if (!isPremium) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={COLORS.gray300} />
        </TouchableOpacity>
        <Text style={styles.title}>🎯 Scanner</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.statusCard, isConnected ? styles.statusCardConnected : styles.statusCardDisconnected]}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, isConnected ? styles.statusDotConnected : styles.statusDotDisconnected]} />
          <Text style={styles.statusText}>{isConnected ? 'Verbonden met Raspberry Pi' : 'Niet verbonden'}</Text>
        </View>

        {isConnected ? (
          <View style={styles.statusActions}>
            <TouchableOpacity style={[styles.actionButton, isScanning ? styles.actionButtonStop : styles.actionButtonStart]} onPress={handleStartStop} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" size="small" /> : <><Ionicons name={isScanning ? 'stop' : 'play'} size={20} color="#FFF" /><Text style={styles.actionButtonText}>{isScanning ? 'Stop' : 'Start'} Scanner</Text></>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.disconnectButton} onPress={disconnect}>
              <Ionicons name="bluetooth" size={20} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.connectButton} onPress={handleScanForDevices} disabled={scanningForDevices}>
            {scanningForDevices ? <ActivityIndicator color="#FFF" size="small" /> : <><Ionicons name="search" size={20} color="#FFF" /><Text style={styles.connectButtonText}>Zoek Raspberry Pi</Text></>}
          </TouchableOpacity>
        )}
      </View>

      {!isConnected && foundDevices.length > 0 ? (
        <View style={styles.devicesCard}>
          <Text style={styles.sectionTitle}>Gevonden apparaten</Text>
          {foundDevices.map((device: Device) => (
            <TouchableOpacity key={device.id} style={styles.deviceItem} onPress={() => handleConnect(device.id)}>
              <Ionicons name="hardware-chip" size={24} color={COLORS.primary} />
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>{device.name ?? 'Onbekend'}</Text>
                <Text style={styles.deviceId}>{device.id}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray500} />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {isConnected ? (
        <>
          <View style={styles.detectionsHeader}>
            <Text style={styles.sectionTitle}>Live Detecties ({detections.length})</Text>
            {isScanning ? <View style={styles.liveIndicator}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View> : null}
          </View>

          {detections.length === 0 ? (
            <EmptyState icon="📡" title={isScanning ? 'Aan het scannen...' : 'Geen detecties'} message={isScanning ? 'Wacht op hulpdiensten in de buurt' : 'Start de scanner om hulpdiensten te detecteren'} />
          ) : (
            <FlatList data={detections} keyExtractor={(item: Detection) => item.id} renderItem={({ item }: { item: Detection }) => <DetectionCard detection={item} />} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} />
          )}
        </>
      ) : null}

      {error ? <View style={styles.errorBanner}><Ionicons name="warning" size={20} color={COLORS.danger} /><Text style={styles.errorText}>{error}</Text></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.secondary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SIZES.md, paddingTop: 60, paddingBottom: SIZES.md },
  closeButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: COLORS.gray100 },
  statusCard: { margin: SIZES.md, borderRadius: 16, padding: SIZES.md, borderWidth: 1 },
  statusCardConnected: { backgroundColor: '#1A3D1A', borderColor: COLORS.success },
  statusCardDisconnected: { backgroundColor: COLORS.gray800, borderColor: COLORS.gray700 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SIZES.md },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: SIZES.sm },
  statusDotConnected: { backgroundColor: COLORS.success },
  statusDotDisconnected: { backgroundColor: COLORS.gray500 },
  statusText: { fontSize: 16, color: COLORS.gray200 },
  statusActions: { flexDirection: 'row', gap: SIZES.sm },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: SIZES.md, borderRadius: 12, gap: SIZES.sm },
  actionButtonStart: { backgroundColor: COLORS.success },
  actionButtonStop: { backgroundColor: COLORS.danger },
  actionButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  disconnectButton: { width: 48, height: 48, borderRadius: 12, backgroundColor: COLORS.gray700, justifyContent: 'center', alignItems: 'center' },
  connectButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, padding: SIZES.md, borderRadius: 12, gap: SIZES.sm },
  connectButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  devicesCard: { margin: SIZES.md, backgroundColor: COLORS.gray800, borderRadius: 16, padding: SIZES.md },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.gray200, marginBottom: SIZES.md },
  deviceItem: { flexDirection: 'row', alignItems: 'center', padding: SIZES.md, backgroundColor: COLORS.gray700, borderRadius: 12, marginBottom: SIZES.sm },
  deviceInfo: { flex: 1, marginLeft: SIZES.md },
  deviceName: { fontSize: 16, color: COLORS.gray100, fontWeight: '500' },
  deviceId: { fontSize: 12, color: COLORS.gray500, marginTop: 2 },
  detectionsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SIZES.lg, marginTop: SIZES.md },
  liveIndicator: { flexDirection: 'row', alignItems: 'center' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.danger, marginRight: 6 },
  liveText: { fontSize: 12, fontWeight: 'bold', color: COLORS.danger },
  listContent: { padding: SIZES.md, paddingBottom: 100 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3D1A1A', margin: SIZES.md, padding: SIZES.md, borderRadius: 12, gap: SIZES.sm },
  errorText: { flex: 1, color: COLORS.danger, fontSize: 14 },
});
