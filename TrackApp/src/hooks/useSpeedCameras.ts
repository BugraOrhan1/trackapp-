import { useEffect, useState } from 'react';
import type { Location, SpeedCamera } from '../types';
import { fetchSpeedCameras } from '../services/supabase';
import { haversineDistanceKm } from '../utils/distance';

export function useSpeedCameras(center: Location | null, radiusKm = 10) {
  const [items, setItems] = useState<SpeedCamera[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const cameras = await fetchSpeedCameras();
      const filtered = center
        ? cameras.filter((camera) => haversineDistanceKm(center.latitude, center.longitude, camera.latitude, camera.longitude) <= radiusKm)
        : cameras;
      if (mounted) {
        setItems(filtered);
        setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [center?.latitude, center?.longitude, radiusKm]);

  return { speedCameras: items, loading };
}
