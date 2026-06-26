import { MoodId, WeatherId } from './types';

/**
 * Canonical mood / weather metadata — the single source of truth for labels,
 * ordering and palette. Pure (no RN imports) so it's safe for exporters,
 * summary logic and unit tests as well as UI.
 */

export const MOOD_ORDER: MoodId[] = ['great', 'good', 'ok', 'down', 'bad'];
export const WEATHER_ORDER: WeatherId[] = ['sunny', 'cloudy', 'rain', 'snow'];

export interface MoodMeta {
  id: MoodId;
  label: string;
  /** colour used in the summary mood-distribution bar */
  distColor: string;
}
export interface WeatherMeta {
  id: WeatherId;
  label: string;
  color: string;
}

export const MOOD_MAP: Record<MoodId, MoodMeta> = {
  great: { id: 'great', label: '很好', distColor: '#8FA886' },
  good: { id: 'good', label: '不错', distColor: '#A8B5A2' },
  ok: { id: 'ok', label: '一般', distColor: '#C7CDB8' },
  down: { id: 'down', label: '低落', distColor: '#CBBBA0' },
  bad: { id: 'bad', label: '糟糕', distColor: '#C9A9A0' },
};

export const WEATHER_MAP: Record<WeatherId, WeatherMeta> = {
  sunny: { id: 'sunny', label: '晴', color: '#C2B49C' },
  cloudy: { id: 'cloudy', label: '多云', color: '#C3BBAC' },
  rain: { id: 'rain', label: '雨', color: '#9FB0BE' },
  snow: { id: 'snow', label: '雪', color: '#AFC0CC' },
};

export const MOODS: MoodMeta[] = MOOD_ORDER.map((id) => MOOD_MAP[id]);
export const WEATHERS: WeatherMeta[] = WEATHER_ORDER.map((id) => WEATHER_MAP[id]);

export const MOOD_DIST_COLOR: Record<MoodId, string> = {
  great: MOOD_MAP.great.distColor,
  good: MOOD_MAP.good.distColor,
  ok: MOOD_MAP.ok.distColor,
  down: MOOD_MAP.down.distColor,
  bad: MOOD_MAP.bad.distColor,
};
