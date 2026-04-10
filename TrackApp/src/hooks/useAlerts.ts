import { useState, useEffect, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { notificationsService } from '../services/notifications';
import { calculateDistance } from '../utils/distance';
import { ALERT_THRESHOLDS, COLORS } from '../config/constants';
import { useMapStore } from '../store/mapStore';
import type {
  UserLocation,
  SpeedCamera,
  Report,
  Detection,
  Alert,
} from '../types';

declare const require: (path: string) => unknown;

const alertSounds = {
  'alert-camera.mp3': '../../assets/sounds/alert-camera.mp3',
  'alert-police.mp3': '../../assets/sounds/alert-police.mp3',
  'alert-emergency.mp3': '../../assets/sounds/alert-emergency.mp3',
} as const;

const soundAssets = {
  'alert-camera.mp3': require('../../assets/sounds/alert-camera.mp3'),
  'alert-police.mp3': require('../../assets/sounds/alert-police.mp3'),
  'alert-emergency.mp3': require('../../assets/sounds/alert-emergency.mp3'),
} as const;

export function useAlerts(
  userLocation?: UserLocation | null,
  speedCameras?: SpeedCamera[],
  reports?: Report[],
  detections?: Detection[]
) {
  const storeLocation = useMapStore((state: { userLocation: UserLocation | null }) => state.userLocation);
  const storeCameras = useMapStore((state: { speedCameras: SpeedCamera[] }) => state.speedCameras);
  const storeReports = useMapStore((state: { reports: Report[] }) => state.reports);
  const storeDetections = useMapStore((state: { detections: Detection[] }) => state.detections);

  const location = userLocation ?? storeLocation;
  const cameraList = speedCameras ?? storeCameras;
  const reportList = reports ?? storeReports;
  const detectionList = detections ?? storeDetections;
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [lastAlertIds, setLastAlertIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (location) {
      checkAlerts();
    }
  }, [
    location?.latitude,
    location?.longitude,
    cameraList.length,
    reportList.length,
    detectionList.length,
  ]);

  async function checkAlerts() {
    if (!location) return;

    const newAlerts: Alert[] = [];

    cameraList.forEach((camera: SpeedCamera) => {
      const distance = camera.distance || calculateDistance(
        location.latitude,
        location.longitude,
        camera.latitude,
        camera.longitude
      );

      if (distance <= ALERT_THRESHOLDS.SPEED_CAMERA) {
        const alertId = `camera-${camera.id}`;
        if (!lastAlertIds.has(alertId)) {
          newAlerts.push({
            id: alertId,
            type: 'speed_camera',
            title: '📸 Flitser!',
            message: `${camera.type === 'fixed' ? 'Vaste flitser' : 'Mobiele flitser'} over ${Math.round(distance)}m`,
            distance: Math.round(distance),
            color: COLORS.speedCameraFixed,
            sound: 'alert-camera.mp3',
          });
        }
      }
    });

    reportList
      .filter((r: Report) => r.type === 'police_control')
      .forEach((report: Report) => {
        const distance = report.distance || calculateDistance(
          location.latitude,
          location.longitude,
          report.latitude,
          report.longitude
        );

        if (distance <= ALERT_THRESHOLDS.POLICE_CONTROL) {
          const alertId = `report-${report.id}`;
          if (!lastAlertIds.has(alertId)) {
            newAlerts.push({
              id: alertId,
              type: 'police',
              title: '🚔 Politiecontrole!',
              message: `Politiecontrole over ${Math.round(distance)}m`,
              distance: Math.round(distance),
              color: COLORS.policeControl,
              sound: 'alert-police.mp3',
            });
          }
        }
      });

    reportList
      .filter((r: Report) => r.type === 'accident')
      .forEach((report: Report) => {
        const distance = report.distance || calculateDistance(
          location.latitude,
          location.longitude,
          report.latitude,
          report.longitude
        );

        if (distance <= ALERT_THRESHOLDS.ACCIDENT) {
          const alertId = `accident-${report.id}`;
          if (!lastAlertIds.has(alertId)) {
            newAlerts.push({
              id: alertId,
              type: 'accident',
              title: '🚨 Ongeluk!',
              message: `Ongeluk gemeld ${Math.round(distance / 1000)}km verderop`,
              distance: Math.round(distance),
              color: COLORS.accident,
            });
          }
        }
      });

    detectionList.forEach((detection: Detection) => {
      const distance = detection.distanceKm * 1000;

      if (distance <= ALERT_THRESHOLDS.EMERGENCY_SERVICE) {
        const alertId = `emergency-${detection.id}`;
        if (!lastAlertIds.has(alertId)) {
          const serviceNames: Record<string, string> = {
            police: '🚓 Politie',
            ambulance: '🚑 Ambulance',
            fire: '🚒 Brandweer',
            defense: '🎖️ Defensie',
          };

          newAlerts.push({
            id: alertId,
            type: 'emergency',
            title: `${serviceNames[detection.serviceType] || '🚨 Hulpdienst'}`,
            message: `${serviceNames[detection.serviceType] || 'Hulpdienst'} gedetecteerd op ${detection.distanceKm.toFixed(1)}km`,
            distance: Math.round(distance),
            color: COLORS.premium,
            sound: 'alert-emergency.mp3',
          });
        }
      }
    });

    if (newAlerts.length > 0) {
      setActiveAlerts((prev: Alert[]) => [...prev, ...newAlerts]);
      const newIds = new Set(lastAlertIds);
      newAlerts.forEach(alert => newIds.add(alert.id));
      setLastAlertIds(newIds);

      for (const alert of newAlerts) {
        await triggerAlert(alert);
      }
    }

    setActiveAlerts((prev: Alert[]) => prev.filter((alert: Alert) => true));
  }

  async function triggerAlert(alert: Alert) {
    if (alert.sound) {
      try {
        const { sound } = await Audio.Sound.createAsync(
          soundAssets[alert.sound as keyof typeof soundAssets]
        );
        await sound.playAsync();
      } catch (err) {
        console.error('Audio fout:', err);
      }
    }

    await Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Warning
    );

    await notificationsService.sendNotification(
      alert.title,
      alert.message,
      { type: alert.type, id: alert.id }
    );
  }

  const dismissAlert = useCallback((alertId: string) => {
    setActiveAlerts((prev: Alert[]) => prev.filter((a: Alert) => a.id !== alertId));
  }, []);

  const clearAllAlerts = useCallback(() => {
    setActiveAlerts([]);
  }, []);

  return {
    activeAlerts,
    dismissAlert,
    clearAllAlerts,
  };
}