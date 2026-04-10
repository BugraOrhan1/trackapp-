import { useEffect } from 'react';
import { Alert, Vibration } from 'react-native';
import { CAMERA_ALERT_THRESHOLD_M, CONTROL_ALERT_THRESHOLD_M } from '../config/constants';
import { useMapStore } from '../store/mapStore';
import type { Report } from '../types';

export function useAlerts() {
  const location = useMapStore((state) => state.userLocation);
  const reports = useMapStore((state) => state.nearbyReports);
  const pushAlert = useMapStore((state) => state.pushAlert);

  useEffect(() => {
    if (!location) return;

    const nearby = reports.find((report) => {
      const threshold = report.type === 'police_control' ? CONTROL_ALERT_THRESHOLD_M : CAMERA_ALERT_THRESHOLD_M;
      return distanceMeters(location.latitude, location.longitude, report.latitude, report.longitude) <= threshold;
    });

    if (nearby) {
      const label = alertLabelForReport(nearby);
      pushAlert(label);
      Alert.alert('TrackApp', label);
      Vibration.vibrate([0, 100, 100, 100]);
    }
  }, [location?.latitude, location?.longitude, reports.length]);
}

function alertLabelForReport(report: Report): string {
  switch (report.type) {
    case 'speed_camera_mobile':
      return 'Mobiele flitser in de buurt';
    case 'police_control':
      return 'Politiecontrole in de buurt';
    case 'accident':
      return 'Ongeluk in de buurt';
    case 'traffic_jam':
      return 'File in de buurt';
    case 'roadwork':
      return 'Wegwerkzaamheden in de buurt';
    case 'danger':
      return 'Gevaar in de buurt';
    default:
      return 'Melding in de buurt';
  }
}

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
