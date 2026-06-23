import AsyncStorage from '@react-native-async-storage/async-storage';
import { Activity, CategoryId } from './types';

const KEY = 'dal.activities.v1';
const SEED_FLAG = 'dal.seeded.v1';

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
) {
  list.push({ id: newId(), title, category, timestamp: ts });
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

  // Today — mirrors the reference Timeline screen.
  push(list, '晨跑五公里', 'sport', at(y, mo, today, 7, 30));
  push(list, '喝了一大杯温水', 'life', at(y, mo, today, 8, 10));
  push(list, '完成季度方案初稿', 'work', at(y, mo, today, 9, 40));
  push(list, '和朋友吃了顿好的午饭', 'life', at(y, mo, today, 12, 30));
  push(list, '看了一部老电影', 'fun', at(y, mo, today, 20, 10));

  return list;
}
