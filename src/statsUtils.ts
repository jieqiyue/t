import { daysInMonth } from './dateUtils';

export type StatPeriod = 'week' | 'month' | 'year';

/** Continuous integer index for the local calendar day of a timestamp.
 *  Consecutive calendar days differ by exactly 1 (China has no DST). */
function dayIndex(t: number): number {
  const d = new Date(t);
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
}

/** Current streak (consecutive days up to today/yesterday with ≥1 record) and
 *  the longest streak ever. */
export function computeStreak(timestamps: number[], now: Date): { current: number; longest: number } {
  const days = new Set(timestamps.map(dayIndex));
  if (days.size === 0) return { current: 0, longest: 0 };

  const today = dayIndex(now.getTime());
  let current = 0;
  let cursor = days.has(today) ? today : days.has(today - 1) ? today - 1 : null;
  while (cursor !== null && days.has(cursor)) {
    current += 1;
    cursor -= 1;
  }

  const sorted = [...days].sort((a, b) => a - b);
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = sorted[i] === sorted[i - 1] + 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }
  return { current, longest };
}

function totalDaysOf(period: StatPeriod, now: Date): number {
  if (period === 'week') return 7;
  if (period === 'month') return daysInMonth(now.getFullYear(), now.getMonth());
  const y = now.getFullYear();
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365;
}

/** Start (inclusive) day-index of the period containing `now`. */
function periodStartIndex(period: StatPeriod, now: Date): number {
  if (period === 'week') {
    const mondayOffset = (now.getDay() + 6) % 7;
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return dayIndex(base.getTime()) - mondayOffset;
  }
  if (period === 'month') return dayIndex(new Date(now.getFullYear(), now.getMonth(), 1).getTime());
  return dayIndex(new Date(now.getFullYear(), 0, 1).getTime());
}

export interface PeriodStats {
  count: number;
  activeDays: number;
  average: number;
}

/** Count / active-day / daily-average stats for the period containing `now`. */
export function periodStats(timestamps: number[], period: StatPeriod, now: Date): PeriodStats {
  const start = periodStartIndex(period, now);
  const total = totalDaysOf(period, now);
  const end = start + total - 1;
  const activeSet = new Set<number>();
  let count = 0;
  for (const t of timestamps) {
    const di = dayIndex(t);
    if (di >= start && di <= end) {
      count += 1;
      activeSet.add(di);
    }
  }
  return { count, activeDays: activeSet.size, average: total > 0 ? count / total : 0 };
}

export interface Trend {
  title: string;
  points: number[];
  xLabels: [string, string, string];
  changePct: number | null;
}

function dailyBuckets(timestamps: number[], n: number, endIdx: number): number[] {
  const start = endIdx - (n - 1);
  const buckets = new Array(n).fill(0);
  for (const t of timestamps) {
    const di = dayIndex(t);
    if (di >= start && di <= endIdx) buckets[di - start] += 1;
  }
  return buckets;
}

/** Trend series for the period, plus % change vs the previous equal window.
 *  week → last 7 days, month → last 14 days, year → last 12 months. */
export function trend(timestamps: number[], period: StatPeriod, now: Date): Trend {
  if (period === 'year') {
    const baseY = now.getFullYear();
    const baseM = now.getMonth();
    const cur = new Array(12).fill(0);
    const prev = new Array(12).fill(0);
    for (const t of timestamps) {
      const d = new Date(t);
      const diff = (baseY - d.getFullYear()) * 12 + (baseM - d.getMonth());
      if (diff >= 0 && diff < 12) cur[11 - diff] += 1;
      else if (diff >= 12 && diff < 24) prev[23 - diff] += 1;
    }
    const startMonth = ((baseM - 11) % 12 + 12) % 12;
    const midMonth = ((baseM - 5) % 12 + 12) % 12;
    return {
      title: '近 12 个月趋势',
      points: cur,
      xLabels: [`${startMonth + 1}月`, `${midMonth + 1}月`, `${baseM + 1}月`],
      changePct: pctChange(sum(cur), sum(prev)),
    };
  }

  const n = period === 'week' ? 7 : 14;
  const endIdx = dayIndex(now.getTime());
  const cur = dailyBuckets(timestamps, n, endIdx);
  const prev = dailyBuckets(timestamps, n, endIdx - n);
  // Label via local-date arithmetic (start = today − (n−1) days).
  const label = (offsetFromStart: number) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (n - 1) + offsetFromStart);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };
  return {
    title: `近 ${n} 天趋势`,
    points: cur,
    xLabels: [label(0), label(Math.floor((n - 1) / 2)), label(n - 1)],
    changePct: pctChange(sum(cur), sum(prev)),
  };
}

function sum(arr: number[]): number {
  return arr.reduce((s, n) => s + n, 0);
}

function pctChange(cur: number, prev: number): number | null {
  if (prev <= 0) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

export const PERIOD_LABEL: Record<StatPeriod, string> = { week: '本周', month: '本月', year: '本年' };
