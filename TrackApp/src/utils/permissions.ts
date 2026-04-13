import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

type NotificationPermissionLike = {
  status?: string;
  granted?: boolean;
};

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

  const notifPermission = (await Notifications.requestPermissionsAsync()) as NotificationPermissionLike;
  results.notifications = notifPermission.status === 'granted' || notifPermission.granted === true;

  return results;
}

/**
 * Check if all permissions granted
 */
export async function checkPermissions() {
  const { status: locationStatus } = await Location.getForegroundPermissionsAsync();
  const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
  const notifPermission = (await Notifications.getPermissionsAsync()) as NotificationPermissionLike;

  return {
    location: locationStatus === 'granted',
    backgroundLocation: bgStatus === 'granted',
    notifications: notifPermission.status === 'granted' || notifPermission.granted === true,
  };
}

export async function ensureLocationPermission() {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') throw new Error('Location permission denied');
  return fg;
}

export async function ensureNotificationPermission() {
  const perm = (await Notifications.requestPermissionsAsync()) as NotificationPermissionLike;
  if (perm.status !== 'granted' && perm.granted !== true) throw new Error('Notification permission denied');
  return perm;
}