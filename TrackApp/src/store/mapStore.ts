import { create } from 'zustand';
import type { Location, Report, SpeedCamera, Detection } from '../types';

interface MapState {
  userLocation: Location | null;
  mapRegion: Location | null;
  nearbySpeedCameras: SpeedCamera[];
  nearbyReports: Report[];
  activeDetections: Detection[];
  activeAlerts: string[];
  setUserLocation: (location: Location | null) => void;
  setMapRegion: (region: Location | null) => void;
  setNearbySpeedCameras: (items: SpeedCamera[]) => void;
  setNearbyReports: (items: Report[]) => void;
  setActiveDetections: (items: Detection[]) => void;
  pushAlert: (message: string) => void;
  clearAlerts: () => void;
}

export const useMapStore = create<MapState>((set) => ({
  userLocation: null,
  mapRegion: null,
  nearbySpeedCameras: [],
  nearbyReports: [],
  activeDetections: [],
  activeAlerts: [],
  setUserLocation: (location) => set({ userLocation: location }),
  setMapRegion: (mapRegion) => set({ mapRegion }),
  setNearbySpeedCameras: (nearbySpeedCameras) => set({ nearbySpeedCameras }),
  setNearbyReports: (nearbyReports) => set({ nearbyReports }),
  setActiveDetections: (activeDetections) => set({ activeDetections }),
  pushAlert: (message) => set((state) => ({ activeAlerts: [message, ...state.activeAlerts].slice(0, 5) })),
  clearAlerts: () => set({ activeAlerts: [] }),
}));
