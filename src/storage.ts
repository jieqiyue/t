import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_TAGS, ThemeId } from './theme';
import {
  Activity,
  ActivityItem,
  ActivityOverviewStyle,
  ActivityTag,
  CategoryId,
  MoodId,
  WeatherId,
} from './types';

const KEY = 'dal.activities.v1';
const SEED_FLAG = 'dal.seeded.v1';
const OVERVIEW_STYLE_KEY = 'dal.activityOverviewStyle.v1';
const TAGS_KEY = 'dal.tags.v1';
const ITEMS_KEY = 'dal.activityItems.v1';
const THEME_KEY = 'dal.theme.v1';

export async function loadThemeId(): Promise<ThemeId> {
  try {
    const raw = await AsyncStorage.getItem(THEME_KEY);
    if (raw === 'cream' || raw === 'dusk' || raw === 'caramel' || raw === 'night') return raw;
  } catch (e) {
    // fall through
  }
  return 'cream';
}

export async function saveThemeId(id: ThemeId): Promise<void> {
  await AsyncStorage.setItem(THEME_KEY, id);
}

export async function loadActivities(): Promise<Activity[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Activity[];
  } catch (e) {
    // fall through to seed / empty
  }
  // First launch: plant some sample data so the app isn't empty.
  const seeded = await AsyncStorage.getItem(SEED_FLAG);
  if (!seeded) {
    const sample = buildSeed();
    await saveActivities(sample);
    await AsyncStorage.setItem(SEED_FLAG, '1');
    return sample;
  }
  return [];
}

export async function saveActivities(list: Activity[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function loadTags(): Promise<ActivityTag[]> {
  try {
    const raw = await AsyncStorage.getItem(TAGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ActivityTag[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    // fall through to defaults
  }
  const tags = DEFAULT_TAGS;
  await saveTags(tags);
  return tags;
}

export async function saveTags(list: ActivityTag[]): Promise<void> {
  await AsyncStorage.setItem(TAGS_KEY, JSON.stringify(list));
}

export async function loadActivityItems(activities: Activity[]): Promise<ActivityItem[]> {
  try {
    const raw = await AsyncStorage.getItem(ITEMS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ActivityItem[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    // fall through to derived items
  }
  const items = buildItemsFromActivities(activities);
  await saveActivityItems(items);
  return items;
}

export async function saveActivityItems(list: ActivityItem[]): Promise<void> {
  await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(list));
}

export async function loadActivityOverviewStyle(): Promise<ActivityOverviewStyle> {
  try {
    const raw = await AsyncStorage.getItem(OVERVIEW_STYLE_KEY);
    return raw === 'cloud' || raw === 'rank' ? raw : 'rank';
  } catch (e) {
    return 'rank';
  }
}

export async function saveActivityOverviewStyle(style: ActivityOverviewStyle): Promise<void> {
  await AsyncStorage.setItem(OVERVIEW_STYLE_KEY, style);
}

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([
    KEY,
    SEED_FLAG,
    OVERVIEW_STYLE_KEY,
    TAGS_KEY,
    ITEMS_KEY,
    THEME_KEY,
  ]);
}

let counter = 0;
function newId(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter}`;
}

function at(year: number, month: number, day: number, h: number, m = 0): number {
  return new Date(year, month, day, h, m).getTime();
}

function push(
  list: Activity[],
  title: string,
  category: CategoryId,
  ts: number,
  extra?: { note?: string; mood?: MoodId; weather?: WeatherId },
) {
  list.push({ id: newId(), title, category, tagId: category, timestamp: ts, ...extra });
}

function buildItemsFromActivities(activities: Activity[]): ActivityItem[] {
  const map = new Map<string, ActivityItem>();

  for (const activity of activities) {
    const key = `${activity.title}::${activity.tagId || activity.category}`;
    if (map.has(key)) continue;
    map.set(key, {
      id: `item-${slug(activity.title)}-${activity.tagId || activity.category}`,
      title: activity.title,
      tagId: activity.tagId || activity.category,
      createdAt: activity.timestamp,
    });
  }

  return [...map.values()].sort((a, b) => a.createdAt - b.createdAt);
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '')
    .slice(0, 24) || Date.now().toString(36);
}

/**
 * Seeds the current month with a recurring activity ("喝了一大杯温水") whose
 * daily counts vary, plus a few morning runs — so the calendar heatmap has
 * something to show. Today gets the full timeline from the reference design.
 */
function buildSeed(): Activity[] {
  const now = new Date();
  const y = now.getFullYear();
  const mo = now.getMonth();
  const today = now.getDate();
  const list: Activity[] = [];

  // Daily "杯数" pattern for past days of this month (index 0 = day 1).
  const waterPattern = [3, 2, 4, 1, 5, 3, 2, 4, 3, 1, 0, 2, 5, 3, 4, 2, 3, 1, 0, 4, 5, 3, 2, 4, 1, 3, 5, 2, 4, 3];
  const runDays = new Set([2, 5, 7, 9, 12, 15, 17, 20, 22]);

  for (let day = 1; day < today; day++) {
    const cups = waterPattern[(day - 1) % waterPattern.length];
    for (let i = 0; i < cups; i++) {
      push(list, '喝了一大杯温水', 'life', at(y, mo, day, 8 + i * 2, 10));
    }
    if (runDays.has(day)) {
      push(list, '晨跑五公里', 'sport', at(y, mo, day, 7, 30));
    }
  }

  // Today — mirrors the reference Timeline screen, with mood / weather / notes.
  push(list, '晨跑五公里', 'sport', at(y, mo, today, 7, 30), {
    note: '六公里，比昨天快了两分钟，状态非常好。',
    mood: 'good',
    weather: 'sunny',
  });
  push(list, '喝了一大杯温水', 'life', at(y, mo, today, 8, 10), {
    note: '起床第一件事，对肠胃很温柔。',
    mood: 'ok',
    weather: 'cloudy',
  });
  push(list, '完成季度方案初稿', 'work', at(y, mo, today, 9, 40), {
    note: '写了一上午，终于把框架定下来了。',
    mood: 'good',
    weather: 'sunny',
  });
  push(list, '和朋友吃了顿好的午饭', 'life', at(y, mo, today, 12, 30), {
    note: '好久不见的老同学，聊了好多近况。',
    mood: 'great',
    weather: 'sunny',
  });
  push(list, '看了一部老电影', 'fun', at(y, mo, today, 20, 10), {
    note: '重温《海上钢琴师》，还是很感动。',
    mood: 'great',
    weather: 'rain',
  });

  return list;
}
