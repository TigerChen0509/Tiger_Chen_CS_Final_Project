import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { Task } from '../types/task';

let notificationsAvailable = false;

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  notificationsAvailable = true;
} catch (e) {
  console.warn('Notifications not available on this platform');
}

export async function registerForPushNotifications(): Promise<boolean> {
  if (!notificationsAvailable) return false;
  if (!Device.isDevice) {
    console.warn('Must use physical device for push notifications');
    return false;
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('tasktock-alarms', {
        name: 'TaskTock Alarms',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (e) {
    console.warn('Failed to register for push notifications:', e);
    return false;
  }
}

export async function scheduleTaskAlarm(task: Task): Promise<string | null> {
  if (!notificationsAvailable) return null;
  if (!task.alarm_enabled) return null;

  const dueDate = new Date(task.due_date);
  const now = new Date();

  if (dueDate <= now) return null;

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'TaskTock',
        body: `Task Due: ${task.title}`,
        data: { task_id: task.task_id },
        sound: true,
        ...(Platform.OS === 'android' && { channelId: 'tasktock-alarms' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: dueDate,
      },
    });
    return id;
  } catch (error) {
    console.warn('Failed to schedule alarm:', error);
    return null;
  }
}

export async function scheduleSnoozeAlarm(task: Task, minutes: number): Promise<string | null> {
  if (!notificationsAvailable) return null;

  const snoozeTime = new Date();
  snoozeTime.setMinutes(snoozeTime.getMinutes() + minutes);

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'TaskTock - Snoozed',
        body: `Snoozed: ${task.title}`,
        data: { task_id: task.task_id },
        sound: true,
        ...(Platform.OS === 'android' && { channelId: 'tasktock-alarms' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: snoozeTime,
      },
    });
    return id;
  } catch (error) {
    console.warn('Failed to schedule snooze alarm:', error);
    return null;
  }
}

export async function cancelAllAlarms(): Promise<void> {
  if (!notificationsAvailable) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn('Failed to cancel alarms:', e);
  }
}
