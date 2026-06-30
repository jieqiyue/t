import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette, useTheme } from '../theme';
import { Activity, ActivityTag } from '../types';
import { resolveActivityTag, untaggedView } from '../tagUtils';
import { FlameIcon } from '../components/moodWeather';
import { useToday } from '../useToday';
import { computeStreak, PERIOD_LABEL, periodStats, StatPeriod, trend } from '../statsUtils';

interface Props {
  title: string;
  activities: Activity[];
  tags: ActivityTag[];
  onBack: () => void;
}

const PERIODS: { id: StatPeriod; label: string }[] = [
  { id: 'week', label: '周' },
  { id: 'month', label: '月' },
  { id: 'year', label: '年' },
];

export default function StatsScreen({ title, activities, tags, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const c = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const now = useToday();
  const [period, setPeriod] = useState<StatPeriod>('month');

  const matching = useMemo(() => activities.filter((a) => a.title === title), [activities, title]);
  const timestamps = useMemo(() => matching.map((a) => a.timestamp), [matching]);

  const category = useMemo(() => {
    const latest = matching.reduce<Activity | null>(
      (acc, a) => (!acc || a.timestamp > acc.timestamp ? a : acc),
      null,
    );
    return latest ? resolveActivityTag(c, tags, latest) : untaggedView(c);
  }, [matching, tags, c]);

  const streak = useMemo(() => computeStreak(timestamps, now), [timestamps, now]);
  const stats = useMemo(() => periodStats(timestamps, period, now), [timestamps, period, now]);
  const tr = useMemo(() => trend(timestamps, period, now), [timestamps, period, now]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 28 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backBtn} hitSlop={10}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <View style={[styles.headerDot, { backgroundColor: category.dot }]} />
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
          </View>
          <View style={[styles.headerTag, { backgroundColor: category.soft }]}>
            <Text style={[styles.headerTagText, { color: category.text }]}>{category.label}</Text>
          </View>
        </View>

        <View style={styles.seg}>
          {PERIODS.map((p) => {
            const active = period === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => setPeriod(p.id)}
                style={[styles.segItem, active && styles.segItemActive]}
              >
                <Text style={[styles.segText, active && styles.segTextActive]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.streakCard}>
          <View style={styles.streakIcon}>
            <FlameIcon color="#FFFFFF" size={22} />
          </View>
          <View style={styles.streakMid}>
            <Text style={styles.streakLabel}>连续记录</Text>
            <Text style={styles.streakBig}>
              {streak.current}
              <Text style={styles.streakUnit}> 天</Text>
            </Text>
          </View>
          <View style={styles.streakRight}>
            <Text style={styles.streakLabel}>最长</Text>
            <Text style={styles.streakBig}>
              {streak.longest}
              <Text style={styles.streakUnit}> 天</Text>
            </Text>
          </View>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{stats.count}</Text>
            <Text style={styles.statLabel}>{PERIOD_LABEL[period]} · 次</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{stats.average.toFixed(1)}</Text>
            <Text style={styles.statLabel}>日均</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{stats.activeDays}</Text>
            <Text style={styles.statLabel}>天数</Text>
          </View>
        </View>

        <View style={styles.trendCard}>
          <View style={styles.trendTop}>
            <Text style={styles.trendTitle}>{tr.title}</Text>
            {tr.changePct !== null && (
              <Text
                style={[styles.trendChange, { color: tr.changePct >= 0 ? c.accentInk : '#B07B6F' }]}
              >
                较上期 {tr.changePct >= 0 ? '▲' : '▼'} {Math.abs(tr.changePct)}%
              </Text>
            )}
          </View>
          <MiniLineChart points={tr.points} color={category.dot} />
          <View style={styles.trendXRow}>
            {tr.xLabels.map((l, i) => (
              <Text key={i} style={styles.trendXLabel}>
                {l}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function MiniLineChart({ points, color }: { points: number[]; color: string }) {
  const [w, setW] = useState(0);
  const H = 92;
  const padX = 6;
  const padY = 14;
  const max = Math.max(1, ...points);
  const n = points.length;
  const coords = points.map((v, i) => ({
    x: padX + (n <= 1 ? 0 : (i * (w - 2 * padX)) / (n - 1)),
    y: H - padY - (v / max) * (H - 2 * padY),
  }));
  const line = coords.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  return (
    <View style={{ height: H }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <Svg width={w} height={H}>
          <Polyline
            points={line}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {coords.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={2.4} fill={color} />
          ))}
        </Svg>
      )}
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bgAlt },
    scroll: { paddingHorizontal: 20, paddingTop: 8 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8 },
    backBtn: {
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
    headerTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerDot: { width: 10, height: 10, borderRadius: 999 },
    headerTitle: { flexShrink: 1, fontSize: 20, fontWeight: '800', color: c.ink },
    headerTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    headerTagText: { fontSize: 11, fontWeight: '800' },

    seg: { flexDirection: 'row', backgroundColor: c.border, borderRadius: 12, padding: 3, gap: 2, marginTop: 18 },
    segItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9 },
    segItemActive: {
      backgroundColor: c.card,
      shadowColor: c.ink,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    segText: { fontSize: 13, fontWeight: '700', color: c.muted2 },
    segTextActive: { color: c.ink, fontWeight: '800' },

    streakCard: {
      marginTop: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: c.accent,
      borderRadius: 20,
      paddingHorizontal: 18,
      paddingVertical: 18,
      shadowColor: c.accent,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 5,
    },
    streakIcon: {
      width: 46,
      height: 46,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    streakMid: { flex: 1, gap: 2 },
    streakRight: { alignItems: 'flex-end', gap: 2 },
    streakLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
    streakBig: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', lineHeight: 30 },
    streakUnit: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },

    statRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    statCard: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      gap: 4,
      shadowColor: c.ink,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    },
    statNum: { fontSize: 24, fontWeight: '800', color: c.ink },
    statLabel: { fontSize: 11, fontWeight: '600', color: c.muted3 },

    trendCard: {
      marginTop: 14,
      backgroundColor: c.card,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingTop: 15,
      paddingBottom: 12,
      gap: 8,
      shadowColor: c.ink,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    },
    trendTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    trendTitle: { fontSize: 14, fontWeight: '800', color: c.ink },
    trendChange: { fontSize: 12, fontWeight: '800' },
    trendXRow: { flexDirection: 'row', justifyContent: 'space-between' },
    trendXLabel: { fontSize: 10, fontWeight: '600', color: c.muted3 },
  });
