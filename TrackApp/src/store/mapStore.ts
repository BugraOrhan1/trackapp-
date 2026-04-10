import { create } from 'zustand';
import type { UserLocation, SpeedCamera, Report, Detection } from '../types';

interface MapState {
  userLocation: UserLocation | null;
  followUser: boolean;
  speedCameras: SpeedCamera[];
  reports: Report[];
  detections: Detection[];
  selectedMarkerId: string | null;

  setUserLocation: (location: UserLocation) => void;
  setFollowUser: (follow: boolean) => void;
  setSpeedCameras: (cameras: SpeedCamera[]) => void;
  setReports: (reports: Report[]) => void;
  setDetections: (detections: Detection[]) => void;
  setSelectedMarkerId: (id: string | null) => void;

  clearAll: () => void;

  mapRegion: UserLocation | null;
  nearbySpeedCameras: SpeedCamera[];
  nearbyReports: Report[];
  activeDetections: Detection[];
  activeAlerts: string[];
  setMapRegion: (region: UserLocation | null) => void;
  setNearbySpeedCameras: (items: SpeedCamera[]) => void;
  setNearbyReports: (items: Report[]) => void;
  setActiveDetections: (items: Detection[]) => void;
  pushAlert: (message: string) => void;
  clearAlerts: () => void;
}

export const useMapStore = create<MapState>((set: any) => ({
  userLocation: null,
  followUser: true,
  speedCameras: [],
  reports: [],
  detections: [],
  selectedMarkerId: null,
  mapRegion: null,
  nearbySpeedCameras: [],
  nearbyReports: [],
  activeDetections: [],
  activeAlerts: [],

  setUserLocation: (location: UserLocation) => set({ userLocation: location }),
  setFollowUser: (follow: boolean) => set({ followUser: follow }),
  setSpeedCameras: (cameras: SpeedCamera[]) => set({ speedCameras: cameras, nearbySpeedCameras: cameras }),
  setReports: (reports: Report[]) => set({ reports, nearbyReports: reports }),
  setDetections: (detections: Detection[]) => set({ detections, activeDetections: detections }),
  setSelectedMarkerId: (id: string | null) => set({ selectedMarkerId: id }),
  clearAll: () => set({
    speedCameras: [],
    reports: [],
    detections: [],
    selectedMarkerId: null,
  }),

  setMapRegion: (mapRegion: UserLocation | null) => set({ mapRegion }),
  setNearbySpeedCameras: (nearbySpeedCameras: SpeedCamera[]) => set({ nearbySpeedCameras, speedCameras: nearbySpeedCameras }),
  setNearbyReports: (nearbyReports: Report[]) => set({ nearbyReports, reports: nearbyReports }),
  setActiveDetections: (activeDetections: Detection[]) => set({ activeDetections, detections: activeDetections }),
  pushAlert: (message: string) => set((state: MapState) => ({ activeAlerts: [message, ...state.activeAlerts].slice(0, 5) })),
  clearAlerts: () => set({ activeAlerts: [] }),
}));