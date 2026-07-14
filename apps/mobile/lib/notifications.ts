import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/** На нативе показываем уведомление даже когда приложение на переднем плане. */
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export type NotifyStatus = 'granted' | 'denied' | 'default' | 'unsupported';

/** Текущий статус разрешения на уведомления. */
export async function getNotifyStatus(): Promise<NotifyStatus> {
  if (Platform.OS === 'web') {
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission as NotifyStatus;
  }
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'default';
}

/** Запросить разрешение. Возвращает true, если выдано. */
export async function requestNotifyPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof Notification === 'undefined') return false;
    const p = await Notification.requestPermission();
    return p === 'granted';
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** Показать локальное уведомление (если есть разрешение). */
export async function notify(title: string, body: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(title, { body });
      }
      return;
    }
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
  } catch {
    /* ignore */
  }
}
