import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../../hooks/useSubscription';
import { useScannerStore } from '../../store/scannerStore';
import { COLORS } from '../../config/constants';

interface ConnectionStatusBadgeProps {
  onPress: () => void;
}

export default function ConnectionStatusBadge({ onPress }: ConnectionStatusBadgeProps): JSX.Element {
  const { isPremium } = useSubscription();
  const isConnected = useScannerStore((state) => state.isConnected);
  const deviceName = useScannerStore((state) => state.deviceName);

  return (
    <Pressable onPress={onPress} style={[styles.container, isConnected ? styles.connected : styles.disconnected]}>
      <View style={[styles.dot, isConnected ? styles.dotConnected : styles.dotDisconnected]} />
      <View style={styles.textWrap}>
        <Text style={styles.text}>{isConnected ? 'Pi Connected' : 'Scanner'}</Text>
        {deviceName ? <Text style={styles.subText}>{deviceName}</Text> : null}
      </View>
      {!isPremium ? <Ionicons name="lock-closed" size={14} color={COLORS.gray400} /> : <Ionicons name="bluetooth" size={14} color={COLORS.gray400} />}
      <Ionicons name="chevron-forward" size={14} color={COLORS.gray400} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    zIndex: 20,
  },
  connected: {
    backgroundColor: '#0f172a',
    borderColor: COLORS.success,
  },
  disconnected: {
    backgroundColor: '#0f172a',
    borderColor: COLORS.gray700,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotConnected: {
    backgroundColor: COLORS.success,
  },
  dotDisconnected: {
    backgroundColor: COLORS.gray500,
  },
  textWrap: {
    minWidth: 74,
  },
  text: {
    color: COLORS.gray100,
    fontWeight: '800',
    fontSize: 12,
  },
  subText: {
    color: COLORS.gray400,
    fontSize: 10,
    marginTop: 1,
  },
});