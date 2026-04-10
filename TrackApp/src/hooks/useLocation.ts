import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { locationService } from '../services/location';
import type { UserLocation } from '../types';

export function useLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [subscription, setSubscription] = useState<Location.LocationSubscription | null>(null);

  useEffect(() => {
    requestPermissions();
    return () => {
      stopWatching();
    };
  }, []);

  async function requestPermissions() {
    try {
      const granted = await locationService.requestPermissions();
      setPermissionGranted(granted);
      
      if (granted) {
        await getCurrentLocation();
      } else {
        setError('Locatie permissie niet gegeven');
      }
    } catch (err: any) {
      setError(err.message || 'Permissie fout');
    } finally {
      setLoading(false);
    }
  }

  async function getCurrentLocation() {
    try {
      setLoading(true);
      const loc = await locationService.getCurrentLocation();
      setLocation(loc);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Locatie fout');
    } finally {
      setLoading(false);
    }
  }

  const startWatching = useCallback(async () => {
    if (!permissionGranted) {
      setError('Geen locatie permissie');
      return;
    }

    try {
      const sub = await locationService.watchLocation((loc) => {
        setLocation(loc);
      });
      setSubscription(sub);
    } catch (err: any) {
      setError(err.message || 'Watch fout');
    }
  }, [permissionGranted]);

  async function stopWatching() {
    if (subscription) {
      await locationService.stopWatching(subscription);
      setSubscription(null);
    }
  }

  return {
    location,
    loading,
    error,
    permissionGranted,
    isWatching: subscription !== null,
    getCurrentLocation,
    startWatching,
    stopWatching,
    requestPermissions,
  };
}