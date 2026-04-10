import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import type { Location as AppLocation } from '../types';

export function useLocation() {
  const [location, setLocation] = useState<AppLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    async function start() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission denied');
          setLoading(false);
          return;
        }

        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setLocation({
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
          heading: current.coords.heading ?? undefined,
          speed: current.coords.speed ?? undefined,
          accuracy: current.coords.accuracy ?? undefined,
        });

        subscription = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 5 }, (next) => {
          setLocation({
            latitude: next.coords.latitude,
            longitude: next.coords.longitude,
            heading: next.coords.heading ?? undefined,
            speed: next.coords.speed ?? undefined,
            accuracy: next.coords.accuracy ?? undefined,
          });
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Location error');
      } finally {
        setLoading(false);
      }
    }

    start();

    return () => {
      subscription?.remove();
    };
  }, []);

  return { location, error, loading };
}
