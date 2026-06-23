const CN_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
const CN_WEEK = ['日', '一', '二', '三', '四', '五', '六'];

/** "六月 · 星期二" */
export function longDateLabel(d: Date): string {
  return `${CN_NUM[d.getMonth()]}月 · 星期${CN_WEEK[d.getDay()]}`;
}

/** "六月" style month name. */
export function cnMonth(monthIndex: number): string {
  return `${CN_NUM[monthIndex]}月`;
}

/** "14:30" */
export function timeLabel(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Stable per-day key, e.g. 20260623. */
export function dayKey(d: Date): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Monday-first index for a weekday (Mon=0 … Sun=6). */
export function mondayFirstIndex(weekday: number): number {
  return (weekday + 6) % 7;
}

const ENCOURAGEMENTS = [
  '慢慢来，一切都来得及。',
  '记录此刻，便不会遗忘。',
  '今天也辛苦了，给自己一点掌声。',
  '微小的坚持，终会汇成河流。',
  '把日子过成想要的样子。',
  '一步一步，都算数。',
  '愿你被生活温柔以待。',
];

/** Stable encouragement for a given day. */
export function encouragementFor(d: Date): string {
  const idx = (dayKey(d) >>> 0) % ENCOURAGEMENTS.length;
  return ENCOURAGEMENTS[idx];
}
