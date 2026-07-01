import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const STORAGE_KEY = 'dal.reminder.v1';
const ANDROID_CHANNEL_ID = 'daily-reminder';
const SCHEDULE_IDENTIFIER = 'dal.daily-reminder';

export interface ReminderConfig {
  enabled: boolean;
  hour: number;
  minute: number;
}

export const DEFAULT_REMINDER: ReminderConfig = { enabled: false, hour: 21, minute: 0 };

export async function loadReminderConfig(): Promise<ReminderConfig> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_REMINDER;
    const parsed = JSON.parse(raw) as Partial<ReminderConfig>;
    return {
      enabled: !!parsed.enabled,
      hour: clampInt(parsed.hour ?? DEFAULT_REMINDER.hour, 0, 23),
      minute: clampInt(parsed.minute ?? DEFAULT_REMINDER.minute, 0, 59),
    };
  } catch {
    return DEFAULT_REMINDER;
  }
}

export async function saveReminderConfig(cfg: ReminderConfig): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export const REMINDER_STORAGE_KEY = STORAGE_KEY;

/** Initialise foreground-display behaviour and the Android channel. Idempotent. */
export async function initNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: '每日提醒',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 180, 80, 180],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    } catch {
      // ignore — channel set-up is best-effort
    }
  }
}

/** Request permission. Returns true if granted (or already granted). */
export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (existing.canAskAgain === false) return false;
  const next = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: false, allowBadge: false },
  });
  return next.granted;
}

/** Cancel any existing scheduled reminder. Safe to call any time. */
export async function cancelReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.identifier === SCHEDULE_IDENTIFIER || n.content.data?.kind === 'daily-reminder')
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
  } catch {
    // best-effort
  }
}

/** Compute the next fire time given the reminder hour/minute, current time,
 *  and whether the user has already recorded today. Today is skipped if the
 *  user has already recorded, or if today's time has passed. */
function nextFireDate(hour: number, minute: number, hasRecordToday: boolean, now: Date): Date {
  const fire = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
  if (hasRecordToday || fire.getTime() <= now.getTime()) {
    fire.setDate(fire.getDate() + 1);
  }
  return fire;
}

/** Apply a config: cancel + schedule the next single fire based on state.
 *  Called on startup, reminder toggles, time changes, and any activity change.
 *  Returns the effective enabled state — may be false if the user denied
 *  permission. */
export async function applyReminderConfig(cfg: ReminderConfig, hasRecordToday: boolean): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  await cancelReminder();
  if (!cfg.enabled) return false;
  const ok = await ensurePermission();
  if (!ok) return false;
  const fire = nextFireDate(cfg.hour, cfg.minute, hasRecordToday, new Date());
  await Notifications.scheduleNotificationAsync({
    identifier: SCHEDULE_IDENTIFIER,
    content: {
      title: '今天记一下吧',
      body: '几句话，留住此刻。',
      data: { kind: 'daily-reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fire,
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
    },
  });
  return true;
}

function clampInt(n: number, lo: number, hi: number): number {
  const i = Math.floor(Number(n));
  if (!Number.isFinite(i)) return lo;
  return Math.min(hi, Math.max(lo, i));
}
