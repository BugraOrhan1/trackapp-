import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configureer notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const notificationsService = {
  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  },

  /**
   * Stuur lokale notificatie
   */
  async sendNotification(
    title: string,
    body: string,
    data?: any
  ) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: null, // Immediate
    });
  },

  /**
   * Scheduled notification
   */
  async scheduleNotification(
    title: string,
    body: string,
    seconds: number,
    data?: any
  ) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: {
        seconds,
      },
    });
  },

  /**
   * Cancel all notifications
   */
  async cancelAll() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },
};
