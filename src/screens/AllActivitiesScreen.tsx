import React, { useMemo, useState } from 'react';
import {
  DimensionValue,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { heatColor, heatLegend, hexToRgb, Palette, UNTAGGED_LABEL, useTheme } from '../theme';
import { Activity, ActivityTag } from '../types';
import { activityTagKey, resolveActivityTag, resolveOptionalTag, untaggedView } from '../tagUtils';
import { calendarWeeks, cnMonth, timeLabel } from '../dateUtils';
import { FilterIcon, SearchIcon } from '../components/moodWeather';

type Tab = 'calendar' | 'rank' | 'cloud';

// Calendar filter: all records, one tag, or one specific event (by title).
export type ActivityFilter =
  | { type: 'all' }
  | { type: 'tag'; tagId: ActivityTag['id'] }
  | { type: 'event'; title: string };

interface Props {
  activities: Activity[];
  tags: ActivityTag[];
  // View state is owned by the parent so it survives navigating to a record's
  // detail and back (e.g. the open day stays open on return).
  tab: Tab;
  onChangeTab: (tab: Tab) => void;
  view: { y: number; m: number };
  onChangeView: (view: { y: number; m: number }) => void;
  selectedDay: number | null;
  onSelectDay: (day: number | null) => void;
  filter: ActivityFilter;
  onChangeFilter: (filter: ActivityFilter) => void;
  onBack: () => void;
  onOpenSettings: () => void;
  onOpenStats: (title: string) => void;
  onOpenSearch: () => void;
  onOpenDetail: (id: string) => void;
}

interface ActivitySummary {
  title: string;
  tagId?: ActivityTag['id'];
  count: number;
  latest: number;
}

const WEEK = ['一', '二', '三', '四', '五', '六', '日'];
const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];

export default function AllActivitiesScreen({
  activities,
  tags,
  tab,
  onChangeTab,
  view,
  onChangeView,
  selectedDay,
  onSelectDay,
  filter,
  onChangeFilter,
  onBack,
  onOpenSettings,
  onOpenStats,
  onOpenSearch,
  onOpenDetail,
}: Props) {
  const insets = useSafeAreaInsets();
  const c = useTheme();
  const styles = useThemedStyles();
  const [filterSheet, setFilterSheet] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  const summaries = useMemo(() => buildSummaries(activities), [activities]);
  const total = useMemo(() => summaries.reduce((sum, item) => sum + item.count, 0), [summaries]);
  const maxCount = useMemo(() => Math.max(1, ...summaries.map((item) => item.count)), [summaries]);
  const tagIds = useMemo(() => new Set(tags.map((t) => t.id)), [tags]);
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    summaries.forEach((item) => {
      const key = item.tagId && tagIds.has(item.tagId) ? item.tagId : 'untagged';
      totals[key] = (totals[key] || 0) + item.count;
    });
    return totals;
  }, [summaries, tagIds]);

  // The calendar (heatmap + day sheet) reflects the active filter.
  const calendarActs = useMemo(() => {
    if (filter.type === 'all') return activities;
    if (filter.type === 'tag') return activities.filter((a) => activityTagKey(a) === filter.tagId);
    return activities.filter((a) => a.title === filter.title);
  }, [activities, filter]);

  // Per-day counts for the displayed month (calendar heatmap).
  const monthCounts = useMemo(() => {
    const map: Record<number, number> = {};
    for (const a of calendarActs) {
      const d = new Date(a.timestamp);
      if (d.getFullYear() === view.y && d.getMonth() === view.m) {
        map[d.getDate()] = (map[d.getDate()] || 0) + 1;
      }
    }
    return map;
  }, [calendarActs, view]);
  const monthTotal = useMemo(
    () => Object.values(monthCounts).reduce((s, n) => s + n, 0),
    [monthCounts],
  );
  const monthActiveDays = useMemo(() => Object.keys(monthCounts).length, [monthCounts]);
  const weeks = useMemo(() => calendarWeeks(view.y, view.m), [view]);

  const dayRecords = useMemo(() => {
    if (selectedDay == null) return [];
    return calendarActs
      .filter((a) => {
        const d = new Date(a.timestamp);
        return d.getFullYear() === view.y && d.getMonth() === view.m && d.getDate() === selectedDay;
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [calendarActs, view, selectedDay]);

  // Filter display: name, the tag it resolves to (drives heatmap colour), and a
  // "含 …" hint listing the events under a tag filter.
  const filterTag = useMemo(() => {
    if (filter.type === 'tag') return tags.find((t) => t.id === filter.tagId) ?? null;
    if (filter.type === 'event') {
      const sample = activities.find((a) => a.title === filter.title);
      const key = sample ? activityTagKey(sample) : undefined;
      return key ? tags.find((t) => t.id === key) ?? null : null;
    }
    return null;
  }, [filter, tags, activities]);
  const filterRgb = filter.type !== 'all' && filterTag ? hexToRgb(filterTag.dot) : c.heatRGB;
  const filterName =
    filter.type === 'tag' ? filterTag?.label ?? UNTAGGED_LABEL : filter.type === 'event' ? filter.title : '';
  const tagEventHint = useMemo(() => {
    if (filter.type !== 'tag') return '';
    const titles = [...new Set(activities.filter((a) => activityTagKey(a) === filter.tagId).map((a) => a.title))];
    if (titles.length === 0) return '';
    return `含 ${titles.slice(0, 3).join(' · ')}${titles.length > 3 ? ' 等' : ''}`;
  }, [filter, activities]);
  const filterHint = filter.type === 'event' ? filterTag?.label ?? '' : tagEventHint;

  const changeMonth = (delta: number) => {
    let m = view.m + delta;
    let y = view.y;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    onChangeView({ y, m });
    onSelectDay(null);
  };

  const subtitleFiltered = tab === 'calendar' && filter.type !== 'all';
  const subtitle =
    tab === 'calendar'
      ? subtitleFiltered
        ? `已筛选「${filterName}」· ${monthTotal} 次 · ${monthActiveDays} 天`
        : `本月 ${monthTotal} 次 · ${monthActiveDays} 天有记录`
      : tab === 'rank'
      ? `${summaries.length} 项 · 累计 ${total} 次`
      : '圆点越大，做得越多';

  const eventOptions = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    return summaries.filter((s) => !q || s.title.toLowerCase().includes(q));
  }, [summaries, filterQuery]);

  const applyFilter = (f: ActivityFilter) => {
    onChangeFilter(f);
    onSelectDay(null);
    setFilterSheet(false);
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: 'calendar', label: '日历' },
    { id: 'rank', label: '频次榜' },
    { id: 'cloud', label: '活动云' },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 28 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.roundButton} hitSlop={10}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>全部活动</Text>
            <Text
              style={[styles.subtitle, subtitleFiltered && { color: filterTag?.text ?? c.accentInk }]}
            >
              {subtitle}
            </Text>
          </View>
          <Pressable onPress={onOpenSearch} style={styles.iconBtn} hitSlop={10}>
            <SearchIcon color={c.muted} size={17} />
          </Pressable>
          <Pressable onPress={onOpenSettings} style={styles.iconBtn} hitSlop={10}>
            <View style={styles.moreDots}>
              <View style={styles.moreDot} />
              <View style={styles.moreDot} />
              <View style={styles.moreDot} />
            </View>
          </Pressable>
        </View>

        <View style={styles.tabs}>
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => onChangeTab(t.id)}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'calendar' ? (
          <>
            <View style={styles.filterRow}>
              <Pressable
                onPress={() => {
                  setFilterQuery('');
                  setFilterSheet(true);
                }}
                style={[styles.filterBtn, filter.type !== 'all' && filterTag && { backgroundColor: filterTag.soft }]}
                hitSlop={6}
              >
                <FilterIcon
                  color={filter.type !== 'all' && filterTag ? filterTag.dot : c.muted}
                  size={15}
                  filled={filter.type !== 'all'}
                />
              </Pressable>
              {filter.type === 'all' ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterChips}
                >
                  <Pressable
                    onPress={() => onChangeFilter({ type: 'all' })}
                    style={[styles.fChip, styles.fChipActive]}
                  >
                    <Text style={styles.fChipActiveText}>全部</Text>
                  </Pressable>
                  {tags.map((tag) => (
                    <Pressable
                      key={tag.id}
                      onPress={() => onChangeFilter({ type: 'tag', tagId: tag.id })}
                      style={styles.fChip}
                    >
                      <Text style={styles.fChipText}>{tag.label}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.activeFilter}>
                  <Pressable
                    onPress={() => onChangeFilter({ type: 'all' })}
                    style={[styles.activePill, filterTag && { backgroundColor: filterTag.dot }]}
                  >
                    <Text style={styles.activePillText} numberOfLines={1}>
                      {filterName}
                    </Text>
                    <View style={styles.activePillX}>
                      <Text style={styles.activePillXText}>×</Text>
                    </View>
                  </Pressable>
                  {!!filterHint && (
                    <Text style={styles.filterHint} numberOfLines={1}>
                      {filterHint}
                    </Text>
                  )}
                </View>
              )}
            </View>

            <View style={styles.monthRow}>
              <Pressable onPress={() => changeMonth(-1)} hitSlop={12}>
                <Text style={styles.monthArrow}>‹</Text>
              </Pressable>
              <Text style={styles.monthLabel}>
                {view.y}年{cnMonth(view.m)}
              </Text>
              <Pressable onPress={() => changeMonth(1)} hitSlop={12}>
                <Text style={styles.monthArrow}>›</Text>
              </Pressable>
            </View>

            <View style={styles.weekHeader}>
              {WEEK.map((w, i) => (
                <Text key={w} style={[styles.weekCell, i >= 5 && { color: c.weekend }]}>
                  {w}
                </Text>
              ))}
            </View>

            <View style={styles.grid}>
              {weeks.map((week, wi) => (
                <View key={wi} style={styles.weekRow}>
                  {week.map((day, di) => {
                    if (day == null) return <View key={di} style={styles.cellSpacer} />;
                    const count = monthCounts[day] || 0;
                    const dark = count >= 3;
                    return (
                      <Pressable
                        key={di}
                        disabled={count === 0}
                        onPress={() => onSelectDay(day)}
                        style={({ pressed }) => [
                          styles.cell,
                          { backgroundColor: heatColor(c, count, filterRgb) },
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.cellDay,
                            { color: count === 0 ? c.muted3 : dark ? c.heatDayStrong : c.heatDaySoft },
                          ]}
                        >
                          {day}
                        </Text>
                        {count > 0 && (
                          <Text
                            style={[
                              styles.cellCount,
                              { color: dark ? c.heatCountStrong : c.heatCountSoft },
                            ]}
                          >
                            {count}
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>

            <View style={styles.legend}>
              <Text style={styles.legendText}>少</Text>
              {heatLegend(c, filterRgb).map((sw, i) => (
                <View key={i} style={[styles.legendSwatch, { backgroundColor: sw }]} />
              ))}
              <Text style={styles.legendText}>多</Text>
            </View>

            <View style={styles.hint}>
              <Text style={styles.hintChevron}>›</Text>
              <Text style={styles.hintText}>点击某天，查看当日全部记录</Text>
            </View>
          </>
        ) : tab === 'rank' ? (
          <RankOverview items={summaries} tags={tags} maxCount={maxCount} onOpenStats={onOpenStats} />
        ) : (
          <>
            <CloudOverview items={summaries} tags={tags} maxCount={maxCount} onOpenStats={onOpenStats} />
            <CategoryTotals tags={tags} totals={categoryTotals} />
          </>
        )}
      </ScrollView>

      <Modal
        visible={selectedDay != null}
        transparent
        animationType="slide"
        onRequestClose={() => onSelectDay(null)}
      >
        <View style={styles.sheetFill}>
          <Pressable style={styles.sheetScrim} onPress={() => onSelectDay(null)} />
          <View style={[styles.daySheet, { paddingBottom: insets.bottom + 18 }]}>
            <View style={styles.grabber} />
            {selectedDay != null && (
              <>
                <View style={styles.dayHead}>
                  <View style={styles.dayHeadText}>
                    <Text style={styles.dayTitle}>
                      {view.m + 1}月{selectedDay}日
                    </Text>
                    <Text style={styles.daySub}>
                      星期{WEEKDAY[new Date(view.y, view.m, selectedDay).getDay()]} · {dayRecords.length} 件记录
                    </Text>
                  </View>
                  {dayRecords.length >= 5 && (
                    <View style={styles.busyPill}>
                      <View style={styles.busyDot} />
                      <Text style={styles.busyText}>较忙的一天</Text>
                    </View>
                  )}
                </View>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.dayList}>
                  {dayRecords.map((a) => {
                    const tg = resolveActivityTag(c, tags, a);
                    return (
                      <Pressable
                        key={a.id}
                        onPress={() => onOpenDetail(a.id)}
                        style={({ pressed }) => [styles.dayRow, pressed && styles.pressed]}
                      >
                        <Text style={styles.dayTime} numberOfLines={1}>{timeLabel(a.timestamp)}</Text>
                        <View style={[styles.dayDot, { backgroundColor: tg.dot }]} />
                        <Text style={styles.dayRowTitle} numberOfLines={1}>
                          {a.title}
                        </Text>
                        <Text style={[styles.dayRowTag, { color: tg.text }]}>{tg.label}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={filterSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterSheet(false)}
      >
        <View style={styles.sheetFill}>
          <Pressable style={styles.sheetScrim} onPress={() => setFilterSheet(false)} />
          <View style={[styles.filterSheet, { paddingBottom: insets.bottom + 18 }]}>
            <View style={styles.grabber} />
            <Text style={styles.filterSheetTitle}>筛选</Text>

            <Text style={styles.filterSheetSection}>按标签</Text>
            <View style={styles.filterSheetTags}>
              <Pressable
                onPress={() => applyFilter({ type: 'all' })}
                style={[styles.fChip, filter.type === 'all' && styles.fChipActive]}
              >
                <Text style={filter.type === 'all' ? styles.fChipActiveText : styles.fChipText}>全部</Text>
              </Pressable>
              {tags.map((tag) => {
                const active = filter.type === 'tag' && filter.tagId === tag.id;
                return (
                  <Pressable
                    key={tag.id}
                    onPress={() => applyFilter({ type: 'tag', tagId: tag.id })}
                    style={[styles.fChip, active && { backgroundColor: tag.dot, borderColor: tag.dot }]}
                  >
                    {!active && <View style={[styles.fChipDot, { backgroundColor: tag.dot }]} />}
                    <Text style={active ? styles.fChipActiveText : styles.fChipText}>{tag.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.filterSheetSection}>按事件</Text>
            <TextInput
              style={styles.filterSearch}
              value={filterQuery}
              onChangeText={setFilterQuery}
              placeholder="搜索事件"
              placeholderTextColor={c.muted3}
            />
            <ScrollView
              style={styles.filterEventList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {eventOptions.length === 0 ? (
                <Text style={styles.filterEmpty}>没有匹配的事件</Text>
              ) : (
                eventOptions.map((s) => {
                  const active = filter.type === 'event' && filter.title === s.title;
                  const tg = resolveOptionalTag(c, tags, s.tagId);
                  return (
                    <Pressable
                      key={s.title}
                      onPress={() => applyFilter({ type: 'event', title: s.title })}
                      style={({ pressed }) => [styles.filterEventRow, pressed && styles.pressed]}
                    >
                      <View style={[styles.fChipDot, { backgroundColor: tg.dot }]} />
                      <Text
                        style={[styles.filterEventTitle, active && { color: c.accentInk }]}
                        numberOfLines={1}
                      >
                        {s.title}
                      </Text>
                      <Text style={styles.filterEventCount}>{s.count} 次</Text>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function buildSummaries(activities: Activity[]): ActivitySummary[] {
  const map = new Map<string, ActivitySummary>();

  for (const activity of activities) {
    const existing = map.get(activity.title);
    if (!existing) {
      map.set(activity.title, {
        title: activity.title,
        tagId: activityTagKey(activity),
        count: 1,
        latest: activity.timestamp,
      });
      continue;
    }

    existing.count += 1;
    if (activity.timestamp > existing.latest) {
      existing.latest = activity.timestamp;
      existing.tagId = activityTagKey(activity);
    }
  }

  return [...map.values()].sort((a, b) => b.count - a.count || b.latest - a.latest);
}

function RankOverview({
  items,
  tags,
  maxCount,
  onOpenStats,
}: {
  items: ActivitySummary[];
  tags: ActivityTag[];
  maxCount: number;
  onOpenStats: (title: string) => void;
}) {
  const c = useTheme();
  const styles = useThemedStyles();
  if (items.length === 0) return <EmptyState />;

  return (
    <View style={styles.rankCard}>
      {items.map((item, index) => {
        const category = resolveOptionalTag(c, tags, item.tagId);
        const width = `${Math.max(9, Math.round((item.count / maxCount) * 100))}%` as DimensionValue;
        return (
          <Pressable
            key={item.title}
            onPress={() => onOpenStats(item.title)}
            style={({ pressed }) => [
              styles.rankItem,
              index === items.length - 1 && styles.rankItemLast,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.rankTop}>
              <View style={styles.rankName}>
                <View style={[styles.smallDot, { backgroundColor: category.dot }]} />
                <Text style={styles.rankTitle} numberOfLines={1}>
                  {item.title}
                </Text>
              </View>
              <Text style={styles.rankCount}>
                {item.count}
                <Text style={styles.rankUnit}> 次</Text>
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width, backgroundColor: category.dot }]} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function CloudOverview({
  items,
  tags,
  maxCount,
  onOpenStats,
}: {
  items: ActivitySummary[];
  tags: ActivityTag[];
  maxCount: number;
  onOpenStats: (title: string) => void;
}) {
  const c = useTheme();
  const styles = useThemedStyles();
  if (items.length === 0) return <EmptyState />;

  return (
    <View style={styles.cloud}>
      {items.map((item) => {
        const category = resolveOptionalTag(c, tags, item.tagId);
        const level = item.count / maxCount;
        const fontSize = 14 + level * 12;
        const paddingHorizontal = 12 + level * 5;
        const paddingVertical = 7 + level * 4;
        return (
          <Pressable
            key={item.title}
            onPress={() => onOpenStats(item.title)}
            style={({ pressed }) => [
              styles.cloudPill,
              {
                backgroundColor: category.soft,
                borderRadius: level > 0.75 ? 16 : 12,
                paddingHorizontal,
                paddingVertical,
              },
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.cloudText,
                { color: category.text, fontSize, lineHeight: Math.round(fontSize * 1.15) },
              ]}
            >
              {item.title}
            </Text>
            <Text
              style={[
                styles.cloudCount,
                { color: category.text, fontSize: Math.max(10, fontSize * 0.54) },
              ]}
            >
              {item.count}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function CategoryTotals({ tags, totals }: { tags: ActivityTag[]; totals: Record<string, number> }) {
  const c = useTheme();
  const styles = useThemedStyles();
  const untagged = untaggedView(c);
  const showUntagged = !!totals.untagged;
  return (
    <View style={styles.totalCard}>
      <Text style={styles.totalTitle}>各分类累计</Text>
      <View style={styles.totalGrid}>
        {tags.map((category) => (
          <View key={category.id} style={styles.totalItem}>
            <View style={[styles.smallDot, { backgroundColor: category.dot }]} />
            <Text style={styles.totalLabel}>{category.label}</Text>
            <Text style={[styles.totalNum, { color: category.text }]}>{totals[category.id] || 0}</Text>
          </View>
        ))}
        {showUntagged && (
          <View key="untagged" style={styles.totalItem}>
            <View style={[styles.smallDot, { backgroundColor: untagged.dot }]} />
            <Text style={styles.totalLabel}>{untagged.label}</Text>
            <Text style={[styles.totalNum, { color: untagged.text }]}>{totals.untagged}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function EmptyState() {
  const styles = useThemedStyles();
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>还没有活动</Text>
      <Text style={styles.emptyHint}>先回到 Timeline 记录一件事。</Text>
    </View>
  );
}

function useThemedStyles() {
  const c = useTheme();
  return useMemo(() => createStyles(c), [c]);
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bgAlt },
    scroll: { paddingHorizontal: 20, paddingTop: 8 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    roundButton: {
      width: 34,
      height: 34,
      borderRadius: 999,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: c.ink,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 2,
    },
    backIcon: { fontSize: 20, color: c.muted, marginTop: -2 },
    titleBlock: { flex: 1, gap: 2 },
    title: { fontSize: 22, fontWeight: '800', color: c.ink, lineHeight: 25 },
    subtitle: { fontSize: 11.5, fontWeight: '600', color: c.muted3 },
    iconBtn: {
      width: 34,
      height: 34,
      borderRadius: 999,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    moreDots: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    moreDot: { width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: c.muted },

    tabs: { flexDirection: 'row', backgroundColor: c.border, borderRadius: 12, padding: 3, gap: 2, marginTop: 16 },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9 },
    tabActive: {
      backgroundColor: c.card,
      shadowColor: c.ink,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    tabText: { fontSize: 12.5, fontWeight: '700', color: c.muted2 },
    tabTextActive: { color: c.ink, fontWeight: '800' },

    // filter row
    filterRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 },
    filterBtn: {
      width: 30,
      height: 30,
      borderRadius: 9,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: c.ink,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 1,
    },
    filterChips: { gap: 6, alignItems: 'center', paddingRight: 8 },
    fChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    fChipActive: { backgroundColor: c.ink, borderColor: c.ink },
    fChipText: { fontSize: 11.5, fontWeight: '700', color: c.muted },
    fChipActiveText: { fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' },
    fChipDot: { width: 6, height: 6, borderRadius: 999 },
    activeFilter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
    activePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingLeft: 12,
      paddingRight: 8,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: c.accent,
      maxWidth: '70%',
    },
    activePillText: { fontSize: 11.5, fontWeight: '800', color: '#FFFFFF', flexShrink: 1 },
    activePillX: {
      width: 15,
      height: 15,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    activePillXText: { fontSize: 10, color: '#FFFFFF', lineHeight: 12, marginTop: -1 },
    filterHint: { flexShrink: 1, fontSize: 11, fontWeight: '700', color: c.muted3 },

    // filter sheet
    filterSheet: {
      backgroundColor: c.sheet,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      paddingTop: 13,
      gap: 10,
      maxHeight: '82%',
      shadowColor: c.ink,
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.06,
      shadowRadius: 14,
      elevation: 8,
    },
    filterSheetTitle: { fontSize: 16, fontWeight: '800', color: c.ink },
    filterSheetSection: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1, color: c.gold, marginTop: 4 },
    filterSheetTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    filterSearch: {
      backgroundColor: c.inputBg,
      borderRadius: 13,
      paddingHorizontal: 13,
      paddingVertical: 10,
      color: c.ink,
      fontSize: 14,
      fontWeight: '600',
    },
    filterEventList: { maxHeight: 260 },
    filterEmpty: { fontSize: 12.5, fontWeight: '700', color: c.muted3, textAlign: 'center', paddingVertical: 18 },
    filterEventRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: c.inputBg,
    },
    filterEventTitle: { flex: 1, fontSize: 13.5, fontWeight: '700', color: c.ink },
    filterEventCount: { fontSize: 11, fontWeight: '700', color: c.gold },

    // calendar
    monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 18 },
    monthArrow: { fontSize: 18, color: c.gold, fontWeight: '700', paddingHorizontal: 4 },
    monthLabel: { fontSize: 15, fontWeight: '800', color: c.ink },
    weekHeader: { flexDirection: 'row', marginTop: 14 },
    weekCell: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700', color: c.gold },
    grid: { marginTop: 8, gap: 5 },
    weekRow: { flexDirection: 'row', gap: 5 },
    cell: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    cellSpacer: { flex: 1, aspectRatio: 1 },
    cellDay: { fontSize: 11, fontWeight: '700', lineHeight: 12 },
    cellCount: { fontSize: 9, fontWeight: '800', lineHeight: 10 },
    legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginTop: 14 },
    legendText: { fontSize: 10, color: c.gold, fontWeight: '600' },
    legendSwatch: { width: 13, height: 13, borderRadius: 4 },
    hint: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: c.inputBg,
      borderRadius: 11,
      paddingVertical: 11,
      marginTop: 14,
    },
    hintChevron: { fontSize: 14, fontWeight: '800', color: c.gold },
    hintText: { fontSize: 11.5, fontWeight: '700', color: c.muted2 },

    // rank
    rankCard: {
      marginTop: 14,
      borderRadius: 18,
      backgroundColor: c.card,
      paddingHorizontal: 15,
      paddingVertical: 4,
      shadowColor: c.ink,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    },
    rankItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.inputBg, gap: 8 },
    rankItemLast: { borderBottomWidth: 0 },
    rankTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    rankName: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
    smallDot: { width: 8, height: 8, borderRadius: 999 },
    rankTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: c.ink },
    rankCount: { fontSize: 13, fontWeight: '800', color: c.ink },
    rankUnit: { fontSize: 10, fontWeight: '600', color: c.gold },
    progressTrack: { height: 7, borderRadius: 4, backgroundColor: c.border, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 4 },

    // cloud
    cloud: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      alignContent: 'flex-start',
      gap: 9,
      marginTop: 16,
    },
    cloudPill: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
    cloudText: { fontWeight: '800' },
    cloudCount: { fontWeight: '700', opacity: 0.75 },
    totalCard: {
      marginTop: 18,
      borderRadius: 16,
      backgroundColor: c.card,
      paddingHorizontal: 15,
      paddingVertical: 13,
      gap: 10,
      shadowColor: c.ink,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    },
    totalTitle: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, color: c.gold },
    totalGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 },
    totalItem: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 6 },
    totalLabel: { fontSize: 12, fontWeight: '700', color: c.ink },
    totalNum: { fontSize: 12, fontWeight: '800' },

    empty: { alignItems: 'center', paddingTop: 72, gap: 8 },
    emptyTitle: { fontSize: 15, fontWeight: '800', color: c.muted },
    emptyHint: { fontSize: 12.5, color: c.muted3, textAlign: 'center', lineHeight: 19 },
    pressed: { opacity: 0.58 },

    // day sheet
    sheetFill: { flex: 1, justifyContent: 'flex-end' },
    sheetScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.scrim },
    daySheet: {
      backgroundColor: c.sheet,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 18,
      paddingTop: 13,
      gap: 13,
      maxHeight: '74%',
      // Gentle lift only — the scrim already separates the sheet from the
      // calendar, so a heavy upward shadow just reads as a dark band above it.
      shadowColor: c.ink,
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.06,
      shadowRadius: 14,
      elevation: 8,
    },
    grabber: { width: 38, height: 4, borderRadius: 999, backgroundColor: c.divider, alignSelf: 'center' },
    dayHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
    dayHeadText: { gap: 2 },
    dayTitle: { fontSize: 19, fontWeight: '800', color: c.ink, lineHeight: 22 },
    daySub: { fontSize: 11.5, fontWeight: '600', color: c.muted3 },
    busyPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: c.accentSoft,
      borderRadius: 999,
      paddingHorizontal: 11,
      paddingVertical: 5,
    },
    busyDot: { width: 6, height: 6, borderRadius: 999, backgroundColor: c.accent },
    busyText: { fontSize: 11, fontWeight: '800', color: c.accentInk },
    dayList: { gap: 9, paddingBottom: 4 },
    dayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      backgroundColor: c.card,
      borderRadius: 14,
      paddingHorizontal: 13,
      paddingVertical: 11,
      shadowColor: c.ink,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 1,
    },
    dayTime: { fontSize: 11, fontWeight: '700', color: c.gold, width: 40 },
    dayDot: { width: 8, height: 8, borderRadius: 999 },
    dayRowTitle: { flex: 1, fontSize: 13.5, fontWeight: '700', color: c.ink },
    dayRowTag: { fontSize: 10.5, fontWeight: '800' },
  });
