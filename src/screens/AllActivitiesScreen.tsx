import React, { useMemo, useState } from 'react';
import { DimensionValue, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORY_MAP, COLORS } from '../theme';
import { Activity, ActivityOverviewStyle, ActivityTag } from '../types';

interface Props {
  activities: Activity[];
  tags: ActivityTag[];
  overviewStyle: ActivityOverviewStyle;
  onBack: () => void;
  onOpenSettings: () => void;
  onOpenStats: (title: string) => void;
}

interface ActivitySummary {
  title: string;
  tagId: ActivityTag['id'];
  count: number;
  latest: number;
}

type TagFilter = 'all' | ActivityTag['id'];

export default function AllActivitiesScreen({
  activities,
  tags,
  overviewStyle,
  onBack,
  onOpenSettings,
  onOpenStats,
}: Props) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<TagFilter>('all');

  const summaries = useMemo(() => buildSummaries(activities), [activities]);
  const filtered = useMemo(
    () => summaries.filter((item) => filter === 'all' || item.tagId === filter),
    [filter, summaries],
  );
  const total = useMemo(() => summaries.reduce((sum, item) => sum + item.count, 0), [summaries]);
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    summaries.forEach((item) => {
      totals[item.tagId] = (totals[item.tagId] || 0) + item.count;
    });
    return totals;
  }, [summaries]);
  const maxCount = Math.max(1, ...filtered.map((item) => item.count));

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
            <Text style={styles.subtitle}>
              {summaries.length} 项 · 累计 {total} 次
            </Text>
          </View>
          <Pressable onPress={onOpenSettings} style={styles.settingsButton} hitSlop={10}>
            <Text style={styles.settingsIcon}>···</Text>
          </Pressable>
        </View>

        {overviewStyle === 'rank' ? (
          <>
            <CategoryFilters tags={tags} value={filter} onChange={setFilter} />
            <RankOverview items={filtered} tags={tags} maxCount={maxCount} onOpenStats={onOpenStats} />
          </>
        ) : (
          <>
            <View style={styles.segmented}>
              <View style={styles.segmentActive}>
                <Text style={styles.segmentActiveText}>按频次</Text>
              </View>
              <View style={styles.segment}>
                <Text style={styles.segmentText}>按分类</Text>
              </View>
            </View>
            <CloudOverview items={filtered} tags={tags} maxCount={maxCount} onOpenStats={onOpenStats} />
            <CategoryTotals tags={tags} totals={categoryTotals} />
          </>
        )}
      </ScrollView>
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
        tagId: activity.tagId || activity.category,
        count: 1,
        latest: activity.timestamp,
      });
      continue;
    }

    existing.count += 1;
    if (activity.timestamp > existing.latest) {
      existing.latest = activity.timestamp;
      existing.tagId = activity.tagId || activity.category;
    }
  }

  return [...map.values()].sort((a, b) => b.count - a.count || b.latest - a.latest);
}

function CategoryFilters({
  tags,
  value,
  onChange,
}: {
  tags: ActivityTag[];
  value: TagFilter;
  onChange: (value: TagFilter) => void;
}) {
  const filters: { id: TagFilter; label: string }[] = [
    { id: 'all', label: '全部' },
    ...tags.map((tag) => ({ id: tag.id, label: tag.label })),
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filters}
    >
      {filters.map((filter) => {
        const active = value === filter.id;
        return (
          <Pressable
            key={filter.id}
            onPress={() => onChange(filter.id)}
            style={[styles.filterChip, active && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, active && styles.filterTextActive]}>
              {filter.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
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
  if (items.length === 0) return <EmptyState />;

  return (
    <View style={styles.rankCard}>
      {items.map((item, index) => {
        const category = tags.find((tag) => tag.id === item.tagId) || CATEGORY_MAP.life;
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
  if (items.length === 0) return <EmptyState />;

  return (
    <View style={styles.cloud}>
      {items.map((item) => {
        const category = tags.find((tag) => tag.id === item.tagId) || CATEGORY_MAP.life;
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
                { color: category.text, fontSize },
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
  return (
    <View style={styles.totalCard}>
      <Text style={styles.totalTitle}>各分类累计</Text>
      <View style={styles.totalGrid}>
        {tags.map((category) => {
          return (
            <View key={category.id} style={styles.totalItem}>
              <View style={[styles.smallDot, { backgroundColor: category.dot }]} />
              <Text style={styles.totalLabel}>{category.label}</Text>
              <Text style={[styles.totalNum, { color: category.text }]}>{totals[category.id] || 0}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>还没有活动</Text>
      <Text style={styles.emptyHint}>先回到 Timeline 记录一件事。</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgAlt },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  roundButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  backIcon: { fontSize: 20, color: COLORS.muted, marginTop: -2 },
  titleBlock: { flex: 1, gap: 2 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.ink, lineHeight: 25 },
  subtitle: { fontSize: 11.5, fontWeight: '600', color: COLORS.muted3 },
  settingsButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    color: COLORS.muted,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -1,
    marginTop: -8,
  },
  filters: { gap: 7, paddingTop: 13, paddingBottom: 1 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  filterText: { fontSize: 12, fontWeight: '700', color: COLORS.muted },
  filterTextActive: { color: '#FFFFFF', fontWeight: '800' },
  rankCard: {
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    paddingHorizontal: 15,
    paddingVertical: 4,
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  rankItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inputBg,
    gap: 8,
  },
  rankItemLast: { borderBottomWidth: 0 },
  rankTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  rankName: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  smallDot: { width: 8, height: 8, borderRadius: 999 },
  rankTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.ink },
  rankCount: { fontSize: 13, fontWeight: '800', color: COLORS.ink },
  rankUnit: { fontSize: 10, fontWeight: '600', color: COLORS.gold },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: COLORS.border, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#EEE8DE',
    borderRadius: 12,
    padding: 3,
    gap: 2,
    marginTop: 14,
  },
  segmentActive: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 9,
    backgroundColor: COLORS.card,
    paddingVertical: 8,
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  segment: { flex: 1, alignItems: 'center', borderRadius: 9, paddingVertical: 8 },
  segmentActiveText: { fontSize: 12, fontWeight: '800', color: COLORS.ink },
  segmentText: { fontSize: 12, fontWeight: '700', color: COLORS.muted2 },
  cloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignContent: 'flex-start',
    gap: 9,
    marginTop: 14,
  },
  cloudPill: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  cloudText: { fontWeight: '800', lineHeight: 28 },
  cloudCount: { fontWeight: '700', opacity: 0.75 },
  totalCard: {
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    paddingHorizontal: 15,
    paddingVertical: 13,
    gap: 10,
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  totalTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: COLORS.gold,
  },
  totalGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 },
  totalItem: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 6 },
  totalLabel: { fontSize: 12, fontWeight: '700', color: COLORS.ink },
  totalNum: { fontSize: 12, fontWeight: '800' },
  empty: { alignItems: 'center', paddingTop: 72, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: COLORS.muted },
  emptyHint: { fontSize: 12.5, color: COLORS.muted3, textAlign: 'center', lineHeight: 19 },
  pressed: { opacity: 0.58 },
});
