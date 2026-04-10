import { create } from 'zustand';
import type { Detection } from '../types';

interface ScannerState {
  connected: boolean;
  deviceName?: string;
  detections: Detection[];
  error?: string;
  setConnected: (connected: boolean, deviceName?: string) => void;
  setDetections: (detections: Detection[]) => void;
  setError: (error?: string) => void;
}

export const useScannerStore = create<ScannerState>((set) => ({
  connected: false,
  deviceName: undefined,
  detections: [],
  error: undefined,
  setConnected: (connected, deviceName) => set({ connected, deviceName, error: undefined }),
  setDetections: (detections) => set({ detections }),
  setError: (error) => set({ error }),
}));
