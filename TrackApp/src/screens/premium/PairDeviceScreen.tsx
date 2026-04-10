import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useBLE } from '../../hooks/useBLE';
import { COLORS, SIZES } from '../../config/constants';

export default function PairDeviceScreen(): JSX.Element {
  const navigation = useNavigation();
  const { scanForDevices, connect, foundDevices, isScanning } = useBLE();
  const [scanning, setScanning] = useState(false);

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
      await connect(deviceId);
      Alert.alert('Verbonden', 'Apparaat gekoppeld.');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Verbinding mislukt', error.message || 'Kon niet verbinden');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.gray300} />
        </TouchableOpacity>
        <Text style={styles.title}>Apparaat koppelen</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.text}>Zoek naar TrackApp-RPI op het netwerk en maak verbinding.</Text>

        <TouchableOpacity style={styles.scanButton} onPress={handleScan} disabled={scanning || isScanning}>
          {scanning || isScanning ? <ActivityIndicator color="#FFF" /> : <Text style={styles.scanText}>Zoek apparaten</Text>}
        </TouchableOpacity>

        {foundDevices.length > 0 ? (
          <FlatList
            data={foundDevices}
            keyExtractor={(item: { id: string }) => item.id}
            renderItem={({ item }: { item: { id: string; name?: string } }) => (
              <TouchableOpacity style={styles.deviceItem} onPress={() => handleConnect(item.id)}>
                <Ionicons name="hardware-chip" size={24} color={COLORS.primary} />
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>{item.name ?? 'Onbekend apparaat'}</Text>
                  <Text style={styles.deviceId}>{item.id}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.gray500} />
              </TouchableOpacity>
            )}
          />
        ) : (
          <Text style={styles.empty}>Nog geen apparaten gevonden.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.secondary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SIZES.md, paddingTop: 60, paddingBottom: SIZES.md },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  title: { color: COLORS.gray100, fontSize: 24, fontWeight: '900' },
  content: { flex: 1, padding: SIZES.lg, gap: SIZES.md },
  text: { color: COLORS.gray400 },
  scanButton: { backgroundColor: COLORS.primary, borderRadius: 12, padding: SIZES.md, alignItems: 'center' },
  scanText: { color: '#FFF', fontWeight: '700' },
  deviceItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.gray800, borderRadius: 14, padding: SIZES.md, marginBottom: SIZES.sm },
  deviceInfo: { flex: 1, marginLeft: SIZES.md },
  deviceName: { color: COLORS.gray100, fontWeight: '700' },
  deviceId: { color: COLORS.gray500, fontSize: 12, marginTop: 2 },
  empty: { color: COLORS.gray500, textAlign: 'center', marginTop: SIZES.lg },
});
