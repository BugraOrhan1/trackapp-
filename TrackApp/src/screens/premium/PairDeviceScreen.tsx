import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { Device } from 'react-native-ble-plx';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useBLE } from '../../hooks/useBLE';
import { COLORS, SIZES } from '../../config/constants';
import type { MainStackScreenProps } from '../../navigation/types';
import { useScannerStore } from '../../store/scannerStore';

const PAIRING_STORAGE_KEY = 'trackapp.paired-device';

export default function PairDeviceScreen(): JSX.Element {
  const navigation = useNavigation<MainStackScreenProps<'PairDevice'>['navigation']>();
  const { scanForDevices, connect, foundDevices, isScanning } = useBLE();
  const setConnected = useScannerStore((state: { setConnected: (connected: boolean, deviceName?: string) => void }) => state.setConnected);
  const setDevice = useScannerStore((state: { setDevice: (deviceId: string | null, deviceName: string | null) => void }) => state.setDevice);
  const [scanning, setScanning] = useState(false);
  const [savedDeviceName, setSavedDeviceName] = useState<string | null>(null);

  useEffect(() => {
    void loadPairedDevice();
  }, []);

  async function loadPairedDevice() {
    const saved = await AsyncStorage.getItem(PAIRING_STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as { id: string; name: string | null };
      setSavedDeviceName(parsed.name);
      setDevice(parsed.id, parsed.name);
    } catch {
      setSavedDeviceName(null);
    }
  }

  async function savePairedDevice(deviceId: string, deviceName: string | null) {
    await AsyncStorage.setItem(PAIRING_STORAGE_KEY, JSON.stringify({ id: deviceId, name: deviceName }));
    setSavedDeviceName(deviceName);
    setDevice(deviceId, deviceName);
    setConnected(true, deviceName ?? undefined);
  }

  async function handleScan() {
    try {
      setScanning(true);
      await scanForDevices();
    } catch (error: any) {
      Alert.alert('Scan fout', error.message || 'Kon geen apparaten vinden');
    } finally {
      setScanning(false);
    }
  }

  async function handleConnect(deviceId: string) {
    try {
      const device = foundDevices.find((item: Device) => item.id === deviceId) ?? null;
      await connect(deviceId);
      await savePairedDevice(deviceId, device?.name ?? 'TrackApp scanner');
      Alert.alert('Verbonden', 'Apparaat gekoppeld.');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Verbinding mislukt', error.message || 'Kon niet verbinden');
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.gray300} />
        </TouchableOpacity>
        <Text style={styles.title}>Apparaat koppelen</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.text}>Zoek naar TrackApp-RPI op het netwerk en maak verbinding.</Text>
          <Text style={styles.hint}>Zet je Raspberry Pi aan, wacht op Bluetooth-advertising en tik daarna op een gevonden device.</Text>
        </View>

        {savedDeviceName ? (
          <View style={styles.savedCard}>
            <Ionicons name="checkmark-done-circle" size={22} color={COLORS.success} />
            <View style={styles.savedInfo}>
              <Text style={styles.savedTitle}>Laatste koppeling</Text>
              <Text style={styles.savedText}>{savedDeviceName}</Text>
            </View>
          </View>
        ) : null}

        <TouchableOpacity style={styles.scanButton} onPress={handleScan} disabled={scanning || isScanning}>
          {scanning || isScanning ? <ActivityIndicator color="#FFF" /> : <Text style={styles.scanText}>Zoek apparaten</Text>}
        </TouchableOpacity>

        {foundDevices.length > 0 ? (
          <FlatList
            data={foundDevices}
            keyExtractor={(item: Device) => item.id}
            renderItem={({ item }: { item: Device }) => (
              <TouchableOpacity style={styles.deviceItem} onPress={() => handleConnect(item.id)}>
                <Ionicons name="hardware-chip" size={24} color={COLORS.primary} />
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>{item.name ?? 'Onbekend apparaat'}</Text>
                  <Text style={styles.deviceId}>{item.id}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.gray500} />
              </TouchableOpacity>
            )}
            scrollEnabled={false}
          />
        ) : (
          <Text style={styles.empty}>Nog geen apparaten gevonden.</Text>
        )}

        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Setup stappen</Text>
          <Text style={styles.instruction}>1. Start de Bluetooth scanner op je Raspberry Pi.</Text>
          <Text style={styles.instruction}>2. Zorg dat TrackApp-RPI zichtbaar adverteert.</Text>
          <Text style={styles.instruction}>3. Tik op het apparaat in de lijst om te koppelen.</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.secondary },
  contentContainer: { paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SIZES.md, paddingTop: 60, paddingBottom: SIZES.md },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  title: { color: COLORS.gray100, fontSize: 24, fontWeight: '900' },
  content: { paddingHorizontal: SIZES.lg, paddingBottom: SIZES.lg, gap: SIZES.md },
  text: { color: COLORS.gray100, fontWeight: '700' },
  hint: { color: COLORS.gray500, marginTop: 8, lineHeight: 20 },
  card: { backgroundColor: COLORS.gray800, borderRadius: 16, padding: SIZES.md, gap: 4 },
  savedCard: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, backgroundColor: '#15311e', borderRadius: 14, padding: SIZES.md },
  savedInfo: { flex: 1 },
  savedTitle: { color: COLORS.gray100, fontWeight: '800' },
  savedText: { color: COLORS.gray300, marginTop: 2 },
  scanButton: { backgroundColor: COLORS.primary, borderRadius: 12, padding: SIZES.md, alignItems: 'center' },
  scanText: { color: '#FFF', fontWeight: '700' },
  deviceItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.gray800, borderRadius: 14, padding: SIZES.md, marginBottom: SIZES.sm },
  deviceInfo: { flex: 1, marginLeft: SIZES.md },
  deviceName: { color: COLORS.gray100, fontWeight: '700' },
  deviceId: { color: COLORS.gray500, fontSize: 12, marginTop: 2 },
  empty: { color: COLORS.gray500, textAlign: 'center', marginTop: SIZES.lg },
  instructionsCard: { backgroundColor: COLORS.gray800, borderRadius: 16, padding: SIZES.md, gap: 8, marginTop: SIZES.sm },
  instructionsTitle: { color: COLORS.gray100, fontWeight: '800', fontSize: 16 },
  instruction: { color: COLORS.gray300, lineHeight: 20 },
});
