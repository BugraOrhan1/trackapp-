import { create } from 'zustand';
import type { Detection } from '../types';

interface ScannerState {
  isConnected: boolean;
  isScanning: boolean;
  deviceId: string | null;
  deviceName?: string;
  detections: Detection[];
  error?: string;
  setConnected: (connected: boolean, deviceName?: string) => void;
  setScanning: (scanning: boolean) => void;
  setDevice: (id: string | null, name: string | null) => void;
  setDetections: (detections: Detection[]) => void;
  setError: (error?: string) => void;
  reset: () => void;
}

export const useScannerStore = create<ScannerState>((set: any) => ({
  isConnected: false,
  isScanning: false,
  deviceId: null,
  deviceName: undefined,
  detections: [],
  error: undefined,
  setConnected: (connected: boolean, deviceName?: string) => set({ isConnected: connected, deviceName, error: undefined }),
  setScanning: (isScanning: boolean) => set({ isScanning }),
  setDevice: (deviceId: string | null, deviceName: string | null) => set({ deviceId, deviceName: deviceName ?? undefined }),
  setDetections: (detections: Detection[]) => set({ detections }),
  setError: (error?: string) => set({ error }),
  reset: () => set({
    isConnected: false,
    isScanning: false,
    deviceId: null,
    deviceName: undefined,
    detections: [],
    error: undefined,
  }),
}));