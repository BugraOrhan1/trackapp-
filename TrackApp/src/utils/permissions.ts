import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

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
