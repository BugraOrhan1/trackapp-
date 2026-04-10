import { useState, useEffect } from 'react';
import { speedCamerasService } from '../services/speedCameras';
import type { SpeedCamera, UserLocation } from '../types';

export function useSpeedCameras(
  userLocation: UserLocation | null,
  radiusKm: number = 10
) {
  const [cameras, setCameras] = useState<SpeedCamera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userLocation) {
      fetchCameras();
    }
  }, [userLocation?.latitude, userLocation?.longitude, radiusKm]);

  async function fetchCameras() {
    if (!userLocation) return;

    try {
      setLoading(true);
      const data = await speedCamerasService.getSpeedCamerasNearby(
        userLocation.latitude,
        userLocation.longitude,
        radiusKm
      );
      setCameras(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Fout bij laden flitsers');
    } finally {
      setLoading(false);
    }
  }

  return {
    cameras,
    speedCameras: cameras,
    loading,
    error,
    refresh: fetchCameras,
  };
}