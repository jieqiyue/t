import { CategoryId } from './types';

/** Soft, Morandi-inspired palette taken from the reference design. */
export const COLORS = {
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
  heatEmpty: '#ECE8E0',
  scrim: 'rgba(60,55,50,0.34)',
};

export interface Category {
  id: CategoryId;
  label: string;
  /** small dot / accent colour */
  dot: string;
  /** label text colour */
  text: string;
  /** soft tinted background for cloud pills */
  soft: string;
}

export const CATEGORIES: Category[] = [
  { id: 'work', label: '工作', dot: '#9FB0BE', text: '#5E7080', soft: '#E7ECEF' },
  { id: 'life', label: '生活', dot: '#A8B5A2', text: '#5E7257', soft: '#E9EEE6' },
  { id: 'sport', label: '运动', dot: '#C9A9A0', text: '#9B6E64', soft: '#F1E7E4' },
  { id: 'fun', label: '娱乐', dot: '#C2B49C', text: '#897B5E', soft: '#EFEBE2' },
];

/** Fixed display order for category summaries (matches the reference design). */
export const CATEGORY_ORDER: CategoryId[] = ['life', 'work', 'fun', 'sport'];

export const CATEGORY_MAP: Record<CategoryId, Category> = CATEGORIES.reduce(
  (acc, c) => {
    acc[c.id] = c;
    return acc;
  },
  {} as Record<CategoryId, Category>,
);

/** Heatmap colour for an occurrence count (fixed buckets, matching the design). */
export function heatColor(count: number): string {
  if (count <= 0) return COLORS.heatEmpty;
  const alpha = count >= 5 ? 1 : [0, 0.28, 0.48, 0.68, 0.86][count];
  return `rgba(168,181,162,${alpha})`;
}

/** Heatmap legend swatches, light → dark. */
export const HEAT_LEGEND = [
  COLORS.heatEmpty,
  'rgba(168,181,162,0.28)',
  'rgba(168,181,162,0.48)',
  'rgba(168,181,162,0.68)',
  'rgba(168,181,162,1)',
];
