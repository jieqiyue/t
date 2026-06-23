import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORY_MAP, COLORS, HEAT_LEGEND, heatColor } from '../theme';
import { Activity, ActivityTag } from '../types';
import { cnMonth, daysInMonth, mondayFirstIndex } from '../dateUtils';

interface Props {
  title: string;
  activities: Activity[];
  tags: ActivityTag[];
  onBack: () => void;
}

const WEEK = ['一', '二', '三', '四', '五', '六', '日'];

export default function StatsScreen({ title, activities, tags, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-based

  const matching = useMemo(
    () => activities.filter((a) => a.title === title),
    [activities, title],
  );

  // Category for the header tag — use the most recent matching record.
  const category = useMemo(() => {
    const latest = matching.reduce<Activity | null>(
      (acc, a) => (!acc || a.timestamp > acc.timestamp ? a : acc),
      null,
    );
    return latest
      ? tags.find((tag) => tag.id === (latest.tagId || latest.category)) || CATEGORY_MAP[latest.category]
      : CATEGORY_MAP.life;
  }, [matching, tags]);

  // Per-day counts for the displayed month.
  const { counts, total, activeDays } = useMemo(() => {
    const map: Record<number, number> = {};
    for (const a of matching) {
      const d = new Date(a.timestamp);
      if (d.getFullYear() === year && d.getMonth() === month) {
        map[d.getDate()] = (map[d.getDate()] || 0) + 1;
      }
    }
    const t = Object.values(map).reduce((s, n) => s + n, 0);
    return { counts: map, total: t, activeDays: Object.keys(map).length };
  }, [matching, year, month]);

  const totalDays = daysInMonth(year, month);
  const average = total > 0 ? (total / totalDays).toFixed(1) : '0';

  // Build calendar cells: leading blanks + days, padded to full weeks.
  const cells = useMemo(() => {
    const lead = mondayFirstIndex(new Date(year, month, 1).getDay());
    const arr: (number | null)[] = [];
    for (let i = 0; i < lead; i++) arr.push(null);
    for (let d = 1; d <= totalDays; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    const weeks: (number | null)[][] = [];
    for (let i = 0; i < arr.length; i += 7) weeks.push(arr.slice(i, i + 7));
    return weeks;
  }, [year, month, totalDays]);

  const changeMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  };

  const isFuture = (day: number) => {
    const cellDate = new Date(year, month, day);
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return cellDate > startToday;
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 28 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backBtn} hitSlop={10}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <View style={[styles.headerDot, { backgroundColor: category.dot }]} />
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            <View style={[styles.headerTag, { backgroundColor: category.soft || COLORS.accentSoft }]}>
              <Text style={[styles.headerTagText, { color: category.text }]}>{category.label}</Text>
            </View>
          </View>
        </View>

        {/* Summary card */}
        <View style={styles.summary}>
          <View>
            <Text style={styles.summaryLabel}>本月累计</Text>
            <View style={styles.summaryNumRow}>
              <Text style={styles.summaryNum}>{total}</Text>
              <Text style={styles.summaryUnit}>次</Text>
            </View>
          </View>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatNum}>{activeDays}</Text>
              <Text style={styles.summaryStatLabel}>坚持天数</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatNum}>{average}</Text>
              <Text style={styles.summaryStatLabel}>日均</Text>
            </View>
          </View>
        </View>

        {/* Month switcher */}
        <View style={styles.monthRow}>
          <Pressable onPress={() => changeMonth(-1)} hitSlop={12}>
            <Text style={styles.monthArrow}>‹</Text>
          </Pressable>
          <Text style={styles.monthLabel}>
            {year}年{cnMonth(month)}
          </Text>
          <Pressable onPress={() => changeMonth(1)} hitSlop={12}>
            <Text style={styles.monthArrow}>›</Text>
          </Pressable>
        </View>

        {/* Weekday header */}
        <View style={styles.weekHeader}>
          {WEEK.map((w, i) => (
            <Text
              key={w}
              style={[styles.weekCell, i >= 5 && { color: COLORS.weekend }]}
            >
              {w}
            </Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.grid}>
          {cells.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((day, di) => {
                if (day == null) return <View key={di} style={styles.cellSpacer} />;
                const count = counts[day] || 0;
                const future = isFuture(day);
                const dark = count >= 3;
                return (
                  <View
                    key={di}
                    style={[
                      styles.cell,
                      { backgroundColor: future ? 'transparent' : heatColor(count) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.cellDay,
                        { color: dark ? '#4F5A48' : count > 0 ? '#7A8270' : COLORS.gold },
                        future && { color: '#CFC8BB' },
                      ]}
                    >
                      {day}
                    </Text>
                    {count > 0 && (
                      <Text style={[styles.cellCount, { color: dark ? '#3F4A39' : '#6B7361' }]}>
                        {count}次
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendText}>少</Text>
          {HEAT_LEGEND.map((c, i) => (
            <View key={i} style={[styles.legendSwatch, { backgroundColor: c }]} />
          ))}
          <Text style={styles.legendText}>多</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgAlt },
  scroll: { paddingHorizontal: 20, paddingTop: 6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8 },
  backBtn: {
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
  headerTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerDot: { width: 9, height: 9, borderRadius: 999 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.ink, flexShrink: 1 },
  headerTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  headerTagText: { fontSize: 10, fontWeight: '800' },
  summary: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  summaryLabel: { fontSize: 11, fontWeight: '700', color: COLORS.muted3, marginBottom: 4 },
  summaryNumRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  summaryNum: { fontSize: 32, fontWeight: '800', color: COLORS.ink, lineHeight: 34 },
  summaryUnit: { fontSize: 13, fontWeight: '700', color: COLORS.muted, marginBottom: 3 },
  summaryStats: { flexDirection: 'row', gap: 20 },
  summaryStat: { alignItems: 'flex-end' },
  summaryStatNum: { fontSize: 18, fontWeight: '800', color: COLORS.accent },
  summaryStatLabel: { fontSize: 10, fontWeight: '600', color: COLORS.muted3, marginTop: 2 },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 18,
  },
  monthArrow: { fontSize: 18, color: '#C3BBAC', fontWeight: '700', paddingHorizontal: 4 },
  monthLabel: { fontSize: 15, fontWeight: '800', color: COLORS.ink },
  weekHeader: { flexDirection: 'row', marginTop: 14 },
  weekCell: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700', color: COLORS.gold },
  grid: { marginTop: 8, gap: 5 },
  weekRow: { flexDirection: 'row', gap: 5 },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSpacer: { flex: 1, aspectRatio: 1 },
  cellDay: { fontSize: 11, fontWeight: '700', lineHeight: 13 },
  cellCount: { fontSize: 8, fontWeight: '700', lineHeight: 10, marginTop: 1 },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginTop: 14 },
  legendText: { fontSize: 10, color: COLORS.gold, fontWeight: '600' },
  legendSwatch: { width: 13, height: 13, borderRadius: 4 },
});
