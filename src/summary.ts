import { Activity, ActivityTag, MoodId } from './types';
import { dayKey, daysInMonth } from './dateUtils';
import { activityTagKey } from './tagUtils';
import { MOOD_MAP, MOOD_ORDER } from './moods';

export type SummaryPeriod = 'week' | 'month';

export interface TopActivity {
  title: string;
  count: number;
  tagId?: ActivityTag['id'];
}

export interface MoodSlice {
  id: MoodId;
  count: number;
}

export interface PeriodSummary {
  period: SummaryPeriod;
  title: string; // 本周小结 / 本月小结
  rangeLabel: string;
  totalDays: number;
  activeDays: number;
  totalCount: number;
  top: TopActivity[];
  moods: MoodSlice[];
  moodTotal: number;
  dominantMood: MoodId | null;
  message: string;
}

function periodRange(period: SummaryPeriod, now: Date): { start: Date; end: Date; totalDays: number } {
  if (period === 'week') {
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const mondayIndex = (base.getDay() + 6) % 7; // 0 = Monday
    const start = new Date(base);
    start.setDate(base.getDate() - mondayIndex);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end, totalDays: 7 };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const total = daysInMonth(now.getFullYear(), now.getMonth());
  const end = new Date(now.getFullYear(), now.getMonth(), total);
  return { start, end, totalDays: total };
}

function rangeLabel(period: SummaryPeriod, start: Date, end: Date): string {
  if (period === 'week') {
    return `${start.getMonth() + 1}月${start.getDate()}日 – ${end.getMonth() + 1}月${end.getDate()}日`;
  }
  return `${start.getFullYear()}年${start.getMonth() + 1}月`;
}

export function buildSummary(activities: Activity[], period: SummaryPeriod, now: Date): PeriodSummary {
  const { start, end, totalDays } = periodRange(period, now);
  const startMs = start.getTime();
  const endMs = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).getTime();
  const inRange = activities.filter((a) => a.timestamp >= startMs && a.timestamp <= endMs);

  const days = new Set(inRange.map((a) => dayKey(new Date(a.timestamp))));

  const byTitle = new Map<string, { count: number; latest: number; tagId?: ActivityTag['id'] }>();
  for (const a of inRange) {
    const cur = byTitle.get(a.title);
    const tagKey = activityTagKey(a);
    if (cur) {
      cur.count += 1;
      if (a.timestamp > cur.latest) {
        cur.latest = a.timestamp;
        cur.tagId = tagKey;
      }
    } else {
      byTitle.set(a.title, { count: 1, latest: a.timestamp, tagId: tagKey });
    }
  }
  const top: TopActivity[] = [...byTitle.entries()]
    .map(([title, v]) => ({ title, count: v.count, tagId: v.tagId }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const moodCounts: Record<string, number> = {};
  for (const a of inRange) if (a.mood) moodCounts[a.mood] = (moodCounts[a.mood] || 0) + 1;
  const moods: MoodSlice[] = MOOD_ORDER.map((id) => ({ id, count: moodCounts[id] || 0 })).filter(
    (m) => m.count > 0,
  );
  const moodTotal = moods.reduce((s, m) => s + m.count, 0);
  let dominantMood: MoodId | null = null;
  let maxMood = 0;
  for (const id of MOOD_ORDER) {
    const cc = moodCounts[id] || 0;
    if (cc > maxMood) {
      maxMood = cc;
      dominantMood = id;
    }
  }

  const summary: PeriodSummary = {
    period,
    title: period === 'week' ? '本周小结' : '本月小结',
    rangeLabel: rangeLabel(period, start, end),
    totalDays,
    activeDays: days.size,
    totalCount: inRange.length,
    top,
    moods,
    moodTotal,
    dominantMood,
    message: '',
  };
  summary.message = buildMessage(summary);
  return summary;
}

function buildMessage(s: PeriodSummary): string {
  const word = s.period === 'week' ? '这周' : '这个月';
  if (s.totalCount === 0) {
    return `${word}还没有记录，下次想到了就记一笔吧。`;
  }
  let msg = `${word}你一共记录了 ${s.totalCount} 次，活跃了 ${s.activeDays} 天。`;
  if (s.top[0]) msg += `做得最多的是「${s.top[0].title}」。`;
  if (s.dominantMood) {
    const label = MOOD_MAP[s.dominantMood].label;
    if (s.dominantMood === 'down' || s.dominantMood === 'bad') {
      msg += `心情大多${label}，记得好好照顾自己。`;
    } else {
      msg += `心情大多${label}，继续保持。`;
    }
  } else {
    msg += '愿你继续温柔地前进。';
  }
  return msg;
}
