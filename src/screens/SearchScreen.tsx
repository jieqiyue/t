import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette, UNTAGGED_LABEL, useTheme } from '../theme';
import { Activity, ActivityTag, MoodId, WeatherId } from '../types';
import { activityTagKey, resolveActivityTag } from '../tagUtils';
import { dayKey, relativeDayLabel, timeLabel } from '../dateUtils';
import {
  FilterIcon,
  MOODS,
  MOOD_MAP,
  MoodFace,
  PinIcon,
  SearchIcon,
  WEATHERS,
  WEATHER_MAP,
  WeatherIcon,
} from '../components/moodWeather';
import { SEARCH_FILTERS_KEY, SEARCH_KEYWORDS_KEY } from '../storage';
import { useToday } from '../useToday';

const MAX_RECENT_KEYWORDS = 6;
const MAX_RECENT_FILTERS = 3;
const MIN_SAVED_KEYWORD = 2;

type DateRangeId = 'all' | '7d' | '30d' | 'thisMonth' | 'thisYear';
type TagId = ActivityTag['id'] | 'untagged';

interface Filters {
  range: DateRangeId;
  tag: TagId | null;
  mood: MoodId | null;
  weather: WeatherId | null;
  hasNote: boolean;
  hasLocation: boolean;
}

const EMPTY_FILTERS: Filters = {
  range: 'all',
  tag: null,
  mood: null,
  weather: null,
  hasNote: false,
  hasLocation: false,
};

const RANGE_OPTIONS: { id: DateRangeId; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: '7d', label: '近 7 天' },
  { id: '30d', label: '近 30 天' },
  { id: 'thisMonth', label: '本月' },
  { id: 'thisYear', label: '本年' },
];

const RANGE_LABEL: Record<DateRangeId, string> = {
  all: '全部时间',
  '7d': '近 7 天',
  '30d': '近 30 天',
  thisMonth: '本月',
  thisYear: '本年',
};

interface Props {
  activities: Activity[];
  tags: ActivityTag[];
  onOpenDetail: (id: string) => void;
  onBack: () => void;
}

interface DayGroup {
  key: number;
  label: string;
  items: Activity[];
}

function dayHeading(d: Date, today: Date): string {
  const base = `${d.getMonth() + 1}月${d.getDate()}日`;
  const rel = relativeDayLabel(d, today);
  return rel === '今天' || rel === '昨天' ? `${base} · ${rel}` : base;
}

function filtersEqual(a: Filters, b: Filters): boolean {
  return (
    a.range === b.range &&
    a.tag === b.tag &&
    a.mood === b.mood &&
    a.weather === b.weather &&
    a.hasNote === b.hasNote &&
    a.hasLocation === b.hasLocation
  );
}

function isEmptyFilters(f: Filters): boolean {
  return filtersEqual(f, EMPTY_FILTERS);
}

/** Build a "范围 · 标签 · 心情 · 天气 · 含备注 · 含位置" summary of a filter combo. */
function describeFilters(f: Filters, tags: ActivityTag[]): string {
  const parts: string[] = [];
  if (f.range !== 'all') parts.push(RANGE_LABEL[f.range]);
  if (f.tag != null) {
    parts.push(f.tag === 'untagged' ? UNTAGGED_LABEL : tags.find((t) => t.id === f.tag)?.label ?? '未知标签');
  }
  if (f.mood != null) parts.push(MOOD_MAP[f.mood].label);
  if (f.weather != null) parts.push(WEATHER_MAP[f.weather].label);
  if (f.hasNote) parts.push('含备注');
  if (f.hasLocation) parts.push('含位置');
  return parts.join(' · ');
}

/** Returns inclusive [start, end] ms range for the given preset, or null for "all". */
function rangeBounds(range: DateRangeId, now: Date): [number, number] | null {
  if (range === 'all') return null;
  const endMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
  if (range === 'thisMonth') {
    return [new Date(now.getFullYear(), now.getMonth(), 1).getTime(), endMs];
  }
  if (range === 'thisYear') {
    return [new Date(now.getFullYear(), 0, 1).getTime(), endMs];
  }
  const days = range === '7d' ? 7 : 30;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1)).getTime();
  return [start, endMs];
}

export default function SearchScreen({ activities, tags, onOpenDetail, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const c = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const today = useToday();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [recentKeywords, setRecentKeywords] = useState<string[]>([]);
  const [recentFilters, setRecentFilters] = useState<Filters[]>([]);

  // Hydrate recent history from storage on mount.
  useEffect(() => {
    (async () => {
      try {
        const [rawKw, rawFilters] = await Promise.all([
          AsyncStorage.getItem(SEARCH_KEYWORDS_KEY),
          AsyncStorage.getItem(SEARCH_FILTERS_KEY),
        ]);
        if (rawKw) {
          const parsed = JSON.parse(rawKw);
          if (Array.isArray(parsed)) setRecentKeywords(parsed.filter((v): v is string => typeof v === 'string'));
        }
        if (rawFilters) {
          const parsed = JSON.parse(rawFilters);
          if (Array.isArray(parsed)) setRecentFilters(parsed as Filters[]);
        }
      } catch {
        // ignore — bad JSON just means starting fresh
      }
    })();
  }, []);

  const rememberSearch = useCallback(() => {
    const trimmed = query.trim();
    // Keyword: only save if long enough.
    if (trimmed.length >= MIN_SAVED_KEYWORD) {
      setRecentKeywords((prev) => {
        const next = [trimmed, ...prev.filter((k) => k !== trimmed)].slice(0, MAX_RECENT_KEYWORDS);
        AsyncStorage.setItem(SEARCH_KEYWORDS_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    }
    // Filter combo: save any non-empty combination.
    if (!isEmptyFilters(filters)) {
      setRecentFilters((prev) => {
        const next = [filters, ...prev.filter((f) => !filtersEqual(f, filters))].slice(0, MAX_RECENT_FILTERS);
        AsyncStorage.setItem(SEARCH_FILTERS_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    }
  }, [query, filters]);

  const openDetail = useCallback(
    (id: string) => {
      rememberSearch();
      onOpenDetail(id);
    },
    [rememberSearch, onOpenDetail],
  );

  const clearHistory = useCallback(() => {
    setRecentKeywords([]);
    setRecentFilters([]);
    AsyncStorage.multiRemove([SEARCH_KEYWORDS_KEY, SEARCH_FILTERS_KEY]).catch(() => {});
  }, []);

  const q = query.trim().toLowerCase();
  const activeFilterCount =
    (filters.range !== 'all' ? 1 : 0) +
    (filters.tag != null ? 1 : 0) +
    (filters.mood != null ? 1 : 0) +
    (filters.weather != null ? 1 : 0) +
    (filters.hasNote ? 1 : 0) +
    (filters.hasLocation ? 1 : 0);
  const hasActiveFilter = activeFilterCount > 0;

  const results = useMemo(() => {
    if (!q && !hasActiveFilter) return [];
    const bounds = rangeBounds(filters.range, today);
    return activities
      .filter((a) => {
        if (bounds && (a.timestamp < bounds[0] || a.timestamp > bounds[1])) return false;
        if (filters.tag != null) {
          const key = activityTagKey(a) ?? 'untagged';
          if (filters.tag === 'untagged' ? key !== 'untagged' : key !== filters.tag) return false;
        }
        if (filters.mood != null && a.mood !== filters.mood) return false;
        if (filters.weather != null && a.weather !== filters.weather) return false;
        if (filters.hasNote && !a.note?.trim()) return false;
        if (filters.hasLocation && !a.location) return false;
        if (q) {
          const inTitle = a.title.toLowerCase().includes(q);
          const inNote = a.note ? a.note.toLowerCase().includes(q) : false;
          if (!inTitle && !inNote) return false;
        }
        return true;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [activities, q, filters, hasActiveFilter, today]);

  const groups = useMemo(() => {
    const out: DayGroup[] = [];
    let cur: DayGroup | null = null;
    for (const a of results) {
      const d = new Date(a.timestamp);
      const k = dayKey(d);
      if (!cur || cur.key !== k) {
        cur = { key: k, label: dayHeading(d, today), items: [] };
        out.push(cur);
      }
      cur.items.push(a);
    }
    return out;
  }, [results, today]);

  const tagById = (id: TagId) => {
    if (id === 'untagged') return { id: 'untagged' as const, label: UNTAGGED_LABEL, dot: c.muted3, text: c.muted2 };
    return tags.find((t) => t.id === id) ?? null;
  };

  const reset = () => setFilters(EMPTY_FILTERS);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.searchBox}>
          <SearchIcon color={c.muted3} size={16} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="搜索标题或备注…"
            placeholderTextColor={c.muted3}
            autoFocus
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8} style={styles.clearBtn}>
              <Text style={styles.clearIcon}>×</Text>
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => setSheetOpen(true)}
          style={[styles.filterBtn, hasActiveFilter && styles.filterBtnActive]}
          hitSlop={6}
        >
          <FilterIcon color={hasActiveFilter ? c.accentInk : c.muted} size={16} filled={hasActiveFilter} />
          {hasActiveFilter && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {hasActiveFilter && (
        <View style={styles.activeRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeChips}
          >
            {filters.range !== 'all' && (
              <ActiveChip
                label={RANGE_LABEL[filters.range]}
                onRemove={() => setFilters((f) => ({ ...f, range: 'all' }))}
                styles={styles}
              />
            )}
            {filters.tag != null && (() => {
              const t = tagById(filters.tag);
              const dot = t?.dot ?? c.muted3;
              const label = t?.label ?? UNTAGGED_LABEL;
              return (
                <ActiveChip
                  label={label}
                  dot={dot}
                  onRemove={() => setFilters((f) => ({ ...f, tag: null }))}
                  styles={styles}
                />
              );
            })()}
            {filters.mood != null && (
              <ActiveChip
                label={MOOD_MAP[filters.mood].label}
                leading={<MoodFace id={filters.mood} color={c.muted} size={13} />}
                onRemove={() => setFilters((f) => ({ ...f, mood: null }))}
                styles={styles}
              />
            )}
            {filters.weather != null && (
              <ActiveChip
                label={WEATHER_MAP[filters.weather].label}
                leading={<WeatherIcon id={filters.weather} color={c.muted} size={13} />}
                onRemove={() => setFilters((f) => ({ ...f, weather: null }))}
                styles={styles}
              />
            )}
            {filters.hasNote && (
              <ActiveChip
                label="含备注"
                onRemove={() => setFilters((f) => ({ ...f, hasNote: false }))}
                styles={styles}
              />
            )}
            {filters.hasLocation && (
              <ActiveChip
                label="含位置"
                leading={<PinIcon color={c.muted} size={11} />}
                onRemove={() => setFilters((f) => ({ ...f, hasLocation: false }))}
                styles={styles}
              />
            )}
          </ScrollView>
          <Pressable onPress={reset} hitSlop={6} style={styles.clearAllBtn}>
            <Text style={styles.clearAllText}>清除</Text>
          </Pressable>
        </View>
      )}

      {!q && !hasActiveFilter ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
        >
          {(recentKeywords.length > 0 || recentFilters.length > 0) && (
            <View style={styles.recentBlock}>
              <View style={styles.recentHead}>
                <Text style={styles.recentTitle}>最近搜索</Text>
                <Pressable onPress={clearHistory} hitSlop={6}>
                  <Text style={styles.recentClear}>清除</Text>
                </Pressable>
              </View>

              {recentKeywords.length > 0 && (
                <View style={styles.recentKwWrap}>
                  {recentKeywords.map((kw) => (
                    <Pressable
                      key={kw}
                      onPress={() => setQuery(kw)}
                      style={({ pressed }) => [styles.recentKwChip, pressed && styles.pressed]}
                    >
                      <SearchIcon color={c.muted3} size={12} />
                      <Text style={styles.recentKwText} numberOfLines={1}>{kw}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {recentFilters.length > 0 && (
                <View style={styles.recentFilterList}>
                  {recentKeywords.length > 0 && <Text style={styles.recentSubLabel}>筛选组合</Text>}
                  {recentFilters.map((f, i) => (
                    <Pressable
                      key={i}
                      onPress={() => setFilters(f)}
                      style={({ pressed }) => [styles.recentFilterRow, pressed && styles.pressed]}
                    >
                      <FilterIcon color={c.muted} size={13} filled />
                      <Text style={styles.recentFilterText} numberOfLines={1}>
                        {describeFilters(f, tags)}
                      </Text>
                      <Text style={styles.chevron}>›</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={styles.center}>
            <Text style={styles.hintTitle}>搜索记录</Text>
            <Text style={styles.hintText}>
              按标题或备注里的关键词查找，也可用右上角筛选。{'\n'}共 {activities.length} 条记录可搜。
            </Text>
          </View>
        </ScrollView>
      ) : results.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.hintTitle}>没有匹配的记录</Text>
          <Text style={styles.hintText}>试试调整关键词或筛选条件。</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
        >
          <Text style={styles.count}>找到 {results.length} 条</Text>
          {groups.map((group) => (
            <View key={group.key} style={styles.group}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              <View style={styles.card}>
                {group.items.map((a, idx) => {
                  const tag = resolveActivityTag(c, tags, a);
                  return (
                    <Pressable
                      key={a.id}
                      onPress={() => openDetail(a.id)}
                      style={({ pressed }) => [
                        styles.row,
                        idx === group.items.length - 1 && styles.rowLast,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.time}>{timeLabel(a.timestamp)}</Text>
                      <View style={[styles.dot, { backgroundColor: tag.dot }]} />
                      <View style={styles.body}>
                        <Text style={styles.title} numberOfLines={1}>
                          {a.title}
                        </Text>
                        {!!a.note && (
                          <Text style={styles.note} numberOfLines={1} ellipsizeMode="tail">
                            {a.note}
                          </Text>
                        )}
                        <View style={styles.metaRow}>
                          <Text style={[styles.metaCat, { color: tag.text }]}>{tag.label}</Text>
                          {a.mood && (
                            <>
                              <Text style={styles.metaSep}>·</Text>
                              <MoodFace id={a.mood} color={c.muted2} size={13} />
                              <Text style={styles.metaText}>{MOOD_MAP[a.mood]?.label}</Text>
                            </>
                          )}
                          {a.weather && (
                            <>
                              <Text style={styles.metaSep}>·</Text>
                              <WeatherIcon id={a.weather} color={c.muted2} size={12} />
                              <Text style={styles.metaText}>{WEATHER_MAP[a.weather]?.label}</Text>
                            </>
                          )}
                        </View>
                      </View>
                      <Text style={styles.chevron}>›</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <View style={styles.sheetFill}>
          <Pressable style={styles.sheetScrim} onPress={() => setSheetOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 14 }]}>
            <View style={styles.grabber} />
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>筛选</Text>
              <Pressable onPress={reset} hitSlop={6}>
                <Text style={styles.sheetReset}>重置</Text>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetBody}>
              <Text style={styles.section}>时间范围</Text>
              <View style={styles.chipWrap}>
                {RANGE_OPTIONS.map((opt) => {
                  const active = filters.range === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      onPress={() => setFilters((f) => ({ ...f, range: opt.id }))}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={active ? styles.chipActiveText : styles.chipText}>{opt.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.section}>标签</Text>
              <View style={styles.chipWrap}>
                <Pressable
                  onPress={() => setFilters((f) => ({ ...f, tag: null }))}
                  style={[styles.chip, filters.tag == null && styles.chipActive]}
                >
                  <Text style={filters.tag == null ? styles.chipActiveText : styles.chipText}>全部</Text>
                </Pressable>
                {tags.map((tag) => {
                  const active = filters.tag === tag.id;
                  return (
                    <Pressable
                      key={tag.id}
                      onPress={() => setFilters((f) => ({ ...f, tag: tag.id }))}
                      style={[styles.chip, active && { backgroundColor: tag.dot, borderColor: tag.dot }]}
                    >
                      {!active && <View style={[styles.chipDot, { backgroundColor: tag.dot }]} />}
                      <Text style={active ? styles.chipActiveText : styles.chipText}>{tag.label}</Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  onPress={() => setFilters((f) => ({ ...f, tag: 'untagged' }))}
                  style={[styles.chip, filters.tag === 'untagged' && styles.chipActive]}
                >
                  {filters.tag !== 'untagged' && <View style={[styles.chipDot, { backgroundColor: c.muted3 }]} />}
                  <Text style={filters.tag === 'untagged' ? styles.chipActiveText : styles.chipText}>
                    {UNTAGGED_LABEL}
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.section}>心情</Text>
              <View style={styles.chipWrap}>
                {MOODS.map((m) => {
                  const active = filters.mood === m.id;
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => setFilters((f) => ({ ...f, mood: active ? null : m.id }))}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <MoodFace id={m.id} color={active ? c.accentInk : c.muted} size={14} />
                      <Text style={active ? styles.chipActiveText : styles.chipText}>{m.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.section}>天气</Text>
              <View style={styles.chipWrap}>
                {WEATHERS.map((w) => {
                  const active = filters.weather === w.id;
                  return (
                    <Pressable
                      key={w.id}
                      onPress={() => setFilters((f) => ({ ...f, weather: active ? null : w.id }))}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <WeatherIcon id={w.id} color={active ? c.accentInk : c.muted} size={13} />
                      <Text style={active ? styles.chipActiveText : styles.chipText}>{w.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.section}>其他</Text>
              <View style={styles.chipWrap}>
                <Pressable
                  onPress={() => setFilters((f) => ({ ...f, hasNote: !f.hasNote }))}
                  style={[styles.chip, filters.hasNote && styles.chipActive]}
                >
                  <Text style={filters.hasNote ? styles.chipActiveText : styles.chipText}>含备注</Text>
                </Pressable>
                <Pressable
                  onPress={() => setFilters((f) => ({ ...f, hasLocation: !f.hasLocation }))}
                  style={[styles.chip, filters.hasLocation && styles.chipActive]}
                >
                  <PinIcon color={filters.hasLocation ? c.accentInk : c.muted} size={12} />
                  <Text style={filters.hasLocation ? styles.chipActiveText : styles.chipText}>含位置</Text>
                </Pressable>
              </View>
            </ScrollView>
            <Pressable onPress={() => setSheetOpen(false)} style={styles.sheetDone}>
              <Text style={styles.sheetDoneText}>查看 {results.length} 条结果</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ActiveChip({
  label,
  dot,
  leading,
  onRemove,
  styles,
}: {
  label: string;
  dot?: string;
  leading?: React.ReactNode;
  onRemove: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable onPress={onRemove} style={styles.activeChip} hitSlop={4}>
      {leading}
      {!leading && dot && <View style={[styles.activeChipDot, { backgroundColor: dot }]} />}
      <Text style={styles.activeChipLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.activeChipX}>×</Text>
    </Pressable>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bgAlt, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: c.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 20, color: c.muted, marginTop: -2 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.card,
    borderRadius: 14,
    paddingHorizontal: 13,
    height: 42,
  },
  input: { flex: 1, fontSize: 14, fontWeight: '600', color: c.ink, padding: 0 },
  clearBtn: { width: 18, height: 18, borderRadius: 999, backgroundColor: c.inputBg, alignItems: 'center', justifyContent: 'center' },
  clearIcon: { fontSize: 14, color: c.muted, marginTop: -1 },
  filterBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: c.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: { backgroundColor: c.accentSoft },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 14,
    height: 14,
    borderRadius: 999,
    paddingHorizontal: 3,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },

  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  activeChips: { gap: 6, paddingRight: 4 },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: c.card,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  activeChipDot: { width: 6, height: 6, borderRadius: 999 },
  activeChipLabel: { fontSize: 11.5, fontWeight: '700', color: c.muted, maxWidth: 110 },
  activeChipX: { fontSize: 13, fontWeight: '700', color: c.muted3, marginLeft: 1, marginTop: -1 },
  clearAllBtn: { paddingHorizontal: 4 },
  clearAllText: { fontSize: 11, fontWeight: '800', color: c.muted3, letterSpacing: 0.5 },

  count: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, color: c.gold, marginTop: 18, marginBottom: 4 },
  group: { marginTop: 14 },
  groupLabel: { fontSize: 12, fontWeight: '800', color: c.muted2, marginBottom: 8, paddingLeft: 2 },
  card: {
    backgroundColor: c.card,
    borderRadius: 16,
    paddingHorizontal: 14,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: c.inputBg,
  },
  rowLast: { borderBottomWidth: 0 },
  pressed: { opacity: 0.55 },
  time: { width: 40, fontSize: 11, fontWeight: '700', color: c.gold, paddingTop: 2 },
  dot: { width: 9, height: 9, borderRadius: 999, marginTop: 5 },
  body: { flex: 1, minWidth: 0, gap: 4 },
  title: { fontSize: 14, fontWeight: '700', color: c.ink },
  note: { fontSize: 12, fontWeight: '500', color: c.muted, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  metaCat: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  metaSep: { fontSize: 11, fontWeight: '700', color: c.muted3 },
  metaText: { fontSize: 11, fontWeight: '700', color: c.muted2 },
  chevron: { fontSize: 18, fontWeight: '700', color: c.gold, marginTop: 2 },
  center: { alignItems: 'center', paddingTop: 90, gap: 9 },
  hintTitle: { fontSize: 15, fontWeight: '800', color: c.muted },
  hintText: { fontSize: 12.5, color: c.muted3, textAlign: 'center', lineHeight: 20 },

  sheetFill: { flex: 1, justifyContent: 'flex-end' },
  sheetScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.scrim },
  sheet: {
    backgroundColor: c.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: '85%',
  },
  grabber: { width: 38, height: 4, borderRadius: 999, backgroundColor: c.border, alignSelf: 'center' },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 4,
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: c.ink },
  sheetReset: { fontSize: 12, fontWeight: '800', color: c.muted2, letterSpacing: 0.5 },
  sheetBody: { paddingBottom: 14 },
  section: { fontSize: 11.5, fontWeight: '800', color: c.muted2, letterSpacing: 0.6, marginTop: 16, marginBottom: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: c.bgAlt,
    borderWidth: 1.5,
    borderColor: c.border,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
  },
  chipActive: { backgroundColor: c.accent, borderColor: c.accent },
  chipDot: { width: 7, height: 7, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: '700', color: c.muted },
  chipActiveText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  sheetDone: {
    marginTop: 6,
    backgroundColor: c.accent,
    borderRadius: 15,
    paddingVertical: 13,
    alignItems: 'center',
  },
  sheetDoneText: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '800', letterSpacing: 0.8 },

  recentBlock: { marginTop: 18 },
  recentHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  recentTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: c.gold },
  recentClear: { fontSize: 11, fontWeight: '800', color: c.muted3, letterSpacing: 0.5 },
  recentKwWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recentKwChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: c.card,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: '100%',
  },
  recentKwText: { fontSize: 12.5, fontWeight: '700', color: c.muted, maxWidth: 180 },
  recentSubLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: c.muted3,
    marginTop: 14,
    marginBottom: 6,
    paddingLeft: 2,
  },
  recentFilterList: { marginTop: 4 },
  recentFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: c.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 6,
  },
  recentFilterText: { flex: 1, fontSize: 13, fontWeight: '700', color: c.ink },
});
