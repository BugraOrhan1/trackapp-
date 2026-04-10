import * as Notifications from 'expo-notifications';

export async function requestNotificationPermissions() {
  return Notifications.requestPermissionsAsync();
}

export async function scheduleLocalNotification(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}
