import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Request all app permissions
 */
export async function requestAllPermissions(): Promise<{
  location: boolean;
  notifications: boolean;
  backgroundLocation: boolean;
}> {
  const results = {
    location: false,
    notifications: false,
    backgroundLocation: false,
  };

  const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
  results.location = locationStatus === 'granted';

  if (results.location) {
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    results.backgroundLocation = bgStatus === 'granted';
  }

  const { status: notifStatus } = await Notifications.requestPermissionsAsync();
  results.notifications = notifStatus === 'granted';

  return results;
}

/**
 * Check if all permissions granted
 */
export async function checkPermissions() {
  const { status: locationStatus } = await Location.getForegroundPermissionsAsync();
  const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
  const { status: notifStatus } = await Notifications.getPermissionsAsync();

  return {
    location: locationStatus === 'granted',
    backgroundLocation: bgStatus === 'granted',
    notifications: notifStatus === 'granted',
  };
}

export async function ensureLocationPermission() {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') throw new Error('Location permission denied');
  return fg;
}

export async function ensureNotificationPermission() {
  const perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted) throw new Error('Notification permission denied');
  return perm;
}