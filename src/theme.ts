import { createContext, useContext } from 'react';
import { ActivityTag, CategoryId } from './types';

export type ThemeId = 'cream' | 'dusk' | 'caramel' | 'night';

/** Every colour token the UI chrome needs. Each theme provides a full set. */
export interface Palette {
  id: ThemeId;
  label: string;
  isDark: boolean;
  bg: string;
  bgAlt: string;
  sheet: string;
  card: string;
  inputBg: string;
  ink: string;
  muted: string;
  muted2: string;
  muted3: string;
  gold: string;
  divider: string;
  border: string;
  accent: string;
  accentInk: string;
  accentSoft: string;
  weekend: string;
  /** floating action button background */
  fab: string;
  scrim: string;
  /** "r,g,b" base for the heatmap green */
  heatRGB: string;
  heatEmpty: string;
  heatDayStrong: string;
  heatDaySoft: string;
  heatCountStrong: string;
  heatCountSoft: string;
  /** four representative dots shown on the theme selector */
  swatch: [string, string, string, string];
}

const cream: Palette = {
  id: 'cream',
  label: '奶白',
  isDark: false,
  bg: '#F1ECE2',
  bgAlt: '#F6F3EC',
  sheet: '#FBF9F4',
  card: '#FFFFFF',
  inputBg: '#F2EEE5',
  ink: '#4A4540',
  muted: '#8C8275',
  muted2: '#9A9081',
  muted3: '#A89D8E',
  gold: '#B3A998',
  divider: '#E2DACC',
  border: '#ECE6DC',
  accent: '#A8B5A2',
  accentInk: '#5E7257',
  accentSoft: '#E9EEE6',
  weekend: '#C9A9A0',
  fab: '#4A4540',
  scrim: 'rgba(60,55,50,0.34)',
  heatRGB: '168,181,162',
  heatEmpty: '#ECE8E0',
  heatDayStrong: '#4F5A48',
  heatDaySoft: '#7A8270',
  heatCountStrong: '#3F4A39',
  heatCountSoft: '#6B7361',
  swatch: ['#9FB0BE', '#A8B5A2', '#C9A9A0', '#C2B49C'],
};

const dusk: Palette = {
  id: 'dusk',
  label: '暮山黛',
  isDark: false,
  bg: '#EFF0F3',
  bgAlt: '#F3F4F6',
  sheet: '#FBFBFD',
  card: '#FFFFFF',
  inputBg: '#E9EBF0',
  ink: '#3C4250',
  muted: '#7E828F',
  muted2: '#888C99',
  muted3: '#9A9DAA',
  gold: '#A6AAB6',
  divider: '#DEE1E7',
  border: '#E2E4EA',
  accent: '#8FB0A4',
  accentInk: '#4F6E62',
  accentSoft: '#E5EEEA',
  weekend: '#C39A93',
  fab: '#3C4250',
  scrim: 'rgba(40,44,56,0.40)',
  heatRGB: '143,176,164',
  heatEmpty: '#E7E9ED',
  heatDayStrong: '#34433B',
  heatDaySoft: '#5F7268',
  heatCountStrong: '#34433B',
  heatCountSoft: '#5F7268',
  swatch: ['#8AA0B8', '#8FB0A4', '#C39A93', '#A6A0BC'],
};

const caramel: Palette = {
  id: 'caramel',
  label: '焦糖陶',
  isDark: false,
  bg: '#F6F0E7',
  bgAlt: '#F8F2E9',
  sheet: '#FCF8F1',
  card: '#FFFFFF',
  inputBg: '#F0E8DA',
  ink: '#4A3E34',
  muted: '#8A7C6B',
  muted2: '#978876',
  muted3: '#A2917D',
  gold: '#B0A189',
  divider: '#E4DCCD',
  border: '#EAE1D2',
  accent: '#A3A878',
  accentInk: '#6E7345',
  accentSoft: '#ECEDDC',
  weekend: '#C77B5E',
  fab: '#4A3E34',
  scrim: 'rgba(60,48,36,0.36)',
  heatRGB: '163,168,120',
  heatEmpty: '#ECE5D9',
  heatDayStrong: '#46472C',
  heatDaySoft: '#6E7345',
  heatCountStrong: '#46472C',
  heatCountSoft: '#6E7345',
  swatch: ['#B98C6D', '#A3A878', '#C77B5E', '#CBA869'],
};

const night: Palette = {
  id: 'night',
  label: '夜墨霓',
  isDark: true,
  bg: '#211F29',
  bgAlt: '#25232E',
  sheet: '#2A2734',
  card: '#2F2C3A',
  inputBg: '#2E2B38',
  ink: '#ECEAF2',
  muted: '#A6A2B4',
  muted2: '#9C98AA',
  muted3: '#8E8A9C',
  gold: '#827E90',
  divider: '#383544',
  border: '#383544',
  accent: '#6FB0A0',
  accentInk: '#93D0BE',
  accentSoft: '#28342E',
  weekend: '#C98A86',
  fab: '#6FB0A0',
  scrim: 'rgba(0,0,0,0.55)',
  heatRGB: '111,176,160',
  heatEmpty: '#2E2B38',
  heatDayStrong: '#10302A',
  heatDaySoft: '#C8E6DC',
  heatCountStrong: '#0C2620',
  heatCountSoft: '#C8E6DC',
  swatch: ['#6E8FB8', '#6FB0A0', '#C98A86', '#BFA3DE'],
};

export const THEMES: Record<ThemeId, Palette> = { cream, dusk, caramel, night };
export const THEME_LIST: Palette[] = [cream, dusk, caramel, night];

/** Back-compat default palette (cream). */
export const COLORS = cream;

const ThemeContext = createContext<Palette>(cream);
export const ThemeProvider = ThemeContext.Provider;
export function useTheme(): Palette {
  return useContext(ThemeContext);
}

/** "#A8B5A2" → "168,181,162" (for building rgba heatmap colours from a tag). */
export function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r},${g},${b}`;
}

/**
 * Heatmap cell colour for an occurrence count. Defaults to the palette's green;
 * pass `rgb` (e.g. from a tag colour) to tint the heatmap when filtering.
 */
export function heatColor(c: Palette, count: number, rgb: string = c.heatRGB): string {
  if (count <= 0) return c.heatEmpty;
  const alpha = count >= 5 ? 1 : [0, 0.28, 0.48, 0.68, 0.86][count];
  return `rgba(${rgb},${alpha})`;
}

/** Heatmap legend swatches (light → dark), optionally tinted by `rgb`. */
export function heatLegend(c: Palette, rgb: string = c.heatRGB): string[] {
  return [
    c.heatEmpty,
    `rgba(${rgb},0.28)`,
    `rgba(${rgb},0.48)`,
    `rgba(${rgb},0.68)`,
    `rgba(${rgb},1)`,
  ];
}

export interface Category {
  id: CategoryId;
  label: string;
  dot: string;
  text: string;
  soft: string;
}

export const DEFAULT_TAGS: Category[] = [
  { id: 'work', label: '工作', dot: '#9FB0BE', text: '#5E7080', soft: '#E7ECEF' },
  { id: 'life', label: '生活', dot: '#A8B5A2', text: '#5E7257', soft: '#E9EEE6' },
  { id: 'sport', label: '运动', dot: '#C9A9A0', text: '#9B6E64', soft: '#F1E7E4' },
  { id: 'fun', label: '娱乐', dot: '#C2B49C', text: '#897B5E', soft: '#EFEBE2' },
];

export const CATEGORIES: Category[] = DEFAULT_TAGS;

export const CATEGORY_ORDER: CategoryId[] = ['life', 'work', 'fun', 'sport'];

export const CATEGORY_MAP: Record<CategoryId, Category> = CATEGORIES.reduce(
  (acc, c) => {
    acc[c.id] = c;
    return acc;
  },
  {} as Record<CategoryId, Category>,
);

export interface TagView {
  dot: string;
  text: string;
  soft: string;
  label: string;
}

/** Single label for "no (resolvable) tag" — used wherever an untagged or
 *  deleted-tag record is shown (filters, clouds, totals, detail, export). */
export const UNTAGGED_LABEL = '未分类';

/**
 * Resolve how a tag should display: prefer the stored custom tag, then a
 * built-in default category, then a neutral "未分类" fallback (so a deleted
 * custom tag never silently masquerades as 生活).
 */
export function resolveTag(
  palette: Palette,
  tags: ActivityTag[],
  idOrCategory: ActivityTag['id'],
): TagView {
  const tag = tags.find((t) => t.id === idOrCategory);
  if (tag) return { dot: tag.dot, text: tag.text, soft: tag.soft, label: tag.label };
  const def = CATEGORY_MAP[idOrCategory as CategoryId];
  if (def) return { dot: def.dot, text: def.text, soft: def.soft, label: def.label };
  return { dot: palette.muted3, text: palette.muted, soft: palette.inputBg, label: UNTAGGED_LABEL };
}
