import { Activity, ActivityItem, ActivityTag, MoodId, WeatherId } from './types';

export type ExportRange = 'month' | '3months' | 'all';

export interface CsvFields {
  moodWeather: boolean;
  note: boolean;
}

const MOOD_LABEL: Record<MoodId, string> = {
  great: '很好',
  good: '不错',
  ok: '一般',
  down: '低落',
  bad: '糟糕',
};

const WEATHER_LABEL: Record<WeatherId, string> = {
  sunny: '晴',
  cloudy: '多云',
  rain: '雨',
  snow: '雪',
};

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function tagLabelOf(tags: ActivityTag[], a: Activity): string {
  const id = a.tagId || a.category;
  return tags.find((t) => t.id === id)?.label ?? String(id);
}

/** Filter records to a time range (chronological, ascending). */
export function filterByRange(activities: Activity[], range: ExportRange, now: Date): Activity[] {
  let startMs = 0;
  if (range === 'month') {
    startMs = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  } else if (range === '3months') {
    startMs = new Date(now.getFullYear(), now.getMonth() - 2, 1).getTime();
  }
  return activities
    .filter((a) => a.timestamp >= startMs)
    .sort((x, y) => x.timestamp - y.timestamp);
}

export interface OverviewStats {
  count: number;
  itemCount: number;
  tagCount: number;
  earliestLabel: string;
}

export function overviewStats(
  activities: Activity[],
  items: ActivityItem[],
  tags: ActivityTag[],
): OverviewStats {
  let earliest = Infinity;
  for (const a of activities) if (a.timestamp < earliest) earliest = a.timestamp;
  const earliestLabel =
    earliest === Infinity
      ? '—'
      : `${new Date(earliest).getFullYear()}.${pad(new Date(earliest).getMonth() + 1)}`;
  return { count: activities.length, itemCount: items.length, tagCount: tags.length, earliestLabel };
}

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Build CSV text (with UTF-8 BOM so Excel reads Chinese correctly). */
export function toCsv(records: Activity[], tags: ActivityTag[], fields: CsvFields): string {
  const header = ['日期', '时间', '事件', '标签'];
  if (fields.moodWeather) header.push('心情', '天气');
  if (fields.note) header.push('备注');

  const lines = [header.map(csvEscape).join(',')];
  for (const a of records) {
    const d = new Date(a.timestamp);
    const cells = [
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      a.title,
      tagLabelOf(tags, a),
    ];
    if (fields.moodWeather) {
      cells.push(a.mood ? MOOD_LABEL[a.mood] : '', a.weather ? WEATHER_LABEL[a.weather] : '');
    }
    if (fields.note) cells.push(a.note ?? '');
    lines.push(cells.map((c) => csvEscape(String(c))).join(','));
  }
  return '﻿' + lines.join('\r\n');
}

/** Build pretty JSON of records with full structure. */
export function toJson(records: Activity[], tags: ActivityTag[]): string {
  const arr = records.map((a) => ({
    title: a.title,
    tag: tagLabelOf(tags, a),
    tagId: a.tagId || a.category,
    mood: a.mood ?? null,
    weather: a.weather ?? null,
    note: a.note ?? null,
    time: new Date(a.timestamp).toISOString(),
    timestamp: a.timestamp,
  }));
  return JSON.stringify(arr, null, 2);
}

export interface BackupData {
  app: string;
  version: number;
  exportedAt: string;
  activities: Activity[];
  items: ActivityItem[];
  tags: ActivityTag[];
  themeId?: string;
  overviewStyle?: string;
}

export function buildBackup(input: {
  activities: Activity[];
  items: ActivityItem[];
  tags: ActivityTag[];
  themeId: string;
  overviewStyle: string;
  exportedAt: string;
}): string {
  const backup: BackupData = {
    app: 'daily-activity-log',
    version: 1,
    exportedAt: input.exportedAt,
    activities: input.activities,
    items: input.items,
    tags: input.tags,
    themeId: input.themeId,
    overviewStyle: input.overviewStyle,
  };
  return JSON.stringify(backup, null, 2);
}

export interface RestoredData {
  activities: Activity[];
  items: ActivityItem[];
  tags: ActivityTag[];
}

/** Parse a backup file; throws if the shape is not a valid backup. */
export function parseBackup(text: string): RestoredData {
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.activities)) {
    throw new Error('不是有效的备份文件');
  }
  return {
    activities: data.activities as Activity[],
    items: Array.isArray(data.items) ? (data.items as ActivityItem[]) : [],
    tags: Array.isArray(data.tags) ? (data.tags as ActivityTag[]) : [],
  };
}

/** Rough UTF-8 byte size label, e.g. "约 28 KB". */
export function sizeLabel(content: string): string {
  let bytes = content.length;
  try {
    bytes = unescape(encodeURIComponent(content)).length;
  } catch (e) {
    // keep char length fallback
  }
  if (bytes < 1024) return `约 ${bytes} B`;
  return `约 ${Math.max(1, Math.round(bytes / 1024))} KB`;
}
