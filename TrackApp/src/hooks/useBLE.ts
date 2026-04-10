import { useState } from 'react';
import { bleService } from '../services/ble';
import { useScannerStore } from '../store/scannerStore';

export function useBLE() {
  const { connected, deviceName, detections, error, setConnected, setDetections, setError } = useScannerStore();
  const [connecting, setConnecting] = useState(false);

  async function connect() {
    setConnecting(true);
    try {
      const state = await bleService.connect();
      setConnected(state.connected, state.deviceName);
      if (state.error) setError(state.error);
      const current = await bleService.readDetections();
      if (current) setDetections(current);
      return state.connected;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'BLE connection failed');
      return false;
    } finally {
      setConnecting(false);
    }
  }

  async function disconnect() {
    await bleService.disconnect();
    setConnected(false);
  }

  return {
    connected,
    deviceName,
    detections,
    error,
    connecting,
    connect,
    disconnect,
    isPremiumRequired: true,
  };
}

