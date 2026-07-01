import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_TAGS, ThemeId } from './theme';
import { Activity, ActivityItem, ActivityOverviewStyle, ActivityTag } from './types';
import { activityTagKey } from './tagUtils';
import { REMINDER_STORAGE_KEY } from './reminder';

const KEY = 'dal.activities.v1';
const OVERVIEW_STYLE_KEY = 'dal.activityOverviewStyle.v1';
const TAGS_KEY = 'dal.tags.v1';
const ITEMS_KEY = 'dal.activityItems.v1';
const THEME_KEY = 'dal.theme.v1';
export const SEARCH_KEYWORDS_KEY = 'dal.search.recentKeywords.v1';
export const SEARCH_FILTERS_KEY = 'dal.search.recentFilters.v1';

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
    // fall through to empty
  }
  // First launch starts empty — the timeline shows its own "记录第一件事" prompt.
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
    OVERVIEW_STYLE_KEY,
    TAGS_KEY,
    ITEMS_KEY,
    THEME_KEY,
    REMINDER_STORAGE_KEY,
    SEARCH_KEYWORDS_KEY,
    SEARCH_FILTERS_KEY,
  ]);
}

function buildItemsFromActivities(activities: Activity[]): ActivityItem[] {
  const map = new Map<string, ActivityItem>();
  const usedIds = new Set<string>();

  for (const activity of activities) {
    const tagKey = activityTagKey(activity);
    const key = `${activity.title}::${tagKey ?? 'untagged'}`;
    if (map.has(key)) continue;
    // slug() can collapse distinct titles (emoji/punctuation-only, or sharing the
    // first 24 chars) to the same string. The map key above already dedups by full
    // title, so disambiguate the derived id to keep every item id unique.
    const base = `item-${slug(activity.title)}-${tagKey ?? 'untagged'}`;
    let id = base;
    let n = 2;
    while (usedIds.has(id)) id = `${base}-${n++}`;
    usedIds.add(id);
    map.set(key, {
      id,
      title: activity.title,
      tagId: tagKey,
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

