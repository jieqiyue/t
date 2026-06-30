import React, { useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import Svg, { Circle, G } from 'react-native-svg';
import * as Sharing from 'expo-sharing';
import { Palette, useTheme } from '../theme';
import { Activity, ActivityTag } from '../types';
import { buildAnnual, buildSummary, SummaryPeriod } from '../summary';
import { MOOD_DIST_COLOR, MOOD_MAP, ShareIcon, StarIcon } from '../components/moodWeather';
import { resolveOptionalTag, untaggedView } from '../tagUtils';
import { useToday } from '../useToday';

type ViewPeriod = SummaryPeriod | 'year';

interface Props {
  activities: Activity[];
  tags: ActivityTag[];
  onBack: () => void;
}

export default function SummaryScreen({ activities, tags, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const c = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const now = useToday();
  const [period, setPeriod] = useState<ViewPeriod>('week');
  const cardRef = useRef<View>(null);

  const summary = useMemo(
    () => buildSummary(activities, period === 'year' ? 'month' : period, now),
    [activities, period, now],
  );
  const annual = useMemo(() => buildAnnual(activities, now.getFullYear()), [activities, now]);
  const topMax = summary.top[0]?.count || 1;
  const sliceTag = (key: string) =>
    key === 'untagged' ? untaggedView(c) : resolveOptionalTag(c, tags, key);

  const onShare = async () => {
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } catch (e) {
      // sharing unavailable (e.g. web) — no-op
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.roundBtn} hitSlop={10}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.title}>小结</Text>
        {period === 'year' ? (
          <Text style={styles.yearLabel}>{annual.year}</Text>
        ) : (
          <Pressable onPress={onShare} style={styles.roundBtn} hitSlop={10}>
            <ShareIcon color={c.muted} size={15} />
          </Pressable>
        )}
      </View>

      <View style={styles.segmented}>
        {(['week', 'month', 'year'] as ViewPeriod[]).map((p) => {
          const active = period === p;
          const label = p === 'week' ? '周' : p === 'month' ? '月' : '年';
          return (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              style={active ? styles.segmentActive : styles.segment}
            >
              <Text style={active ? styles.segmentActiveText : styles.segmentText}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {period === 'year' ? (
          <>
            <View style={styles.annualCard}>
              <View style={styles.annualHead}>
                <Text style={styles.blockLabel}>{annual.year} 年记录热度</Text>
                <Text style={styles.annualTotal}>共 {annual.total} 次</Text>
              </View>
              <View style={styles.monthGrid}>
                {annual.monthCounts.map((cnt, i) => {
                  const future = now.getFullYear() === annual.year && i > now.getMonth();
                  const current = now.getFullYear() === annual.year && i === now.getMonth();
                  const alpha = 0.25 + 0.75 * (cnt / annual.maxMonth);
                  return (
                    <View
                      key={i}
                      style={[
                        styles.monthCell,
                        { backgroundColor: future ? c.heatEmpty : `rgba(${c.heatRGB},${alpha})` },
                        current && styles.monthCellCurrent,
                      ]}
                    >
                      <Text style={[styles.monthName, future && styles.monthFuture]}>{i + 1}月</Text>
                      <Text style={[styles.monthCount, future && styles.monthFuture]}>
                        {future ? '—' : cnt}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.annualCard}>
              <Text style={styles.blockLabel}>标签维度</Text>
              {annual.total === 0 ? (
                <Text style={styles.emptyText}>这一年还没有记录。</Text>
              ) : (
                <View style={styles.donutRow}>
                  <DonutChart
                    slices={annual.tags.map((t) => ({ color: sliceTag(t.key).dot, value: t.count }))}
                    total={annual.total}
                    track={c.border}
                    numColor={c.ink}
                    labelColor={c.muted3}
                  />
                  <View style={styles.donutLegend}>
                    {annual.tags.map((t) => {
                      const tv = sliceTag(t.key);
                      const pct = Math.round((t.count / annual.total) * 100);
                      return (
                        <View key={t.key} style={styles.donutLegendRow}>
                          <View style={[styles.legendDot, { backgroundColor: tv.dot }]} />
                          <Text style={styles.donutLegendLabel} numberOfLines={1}>
                            {tv.label}
                          </Text>
                          <Text style={[styles.donutLegendPct, { color: tv.text }]}>{pct}%</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          </>
        ) : (
        <View ref={cardRef} collapsable={false} style={styles.card}>
          <View style={styles.cardHead}>
            <View style={styles.cardHeadText}>
              <Text style={styles.cardLabel}>{summary.title}</Text>
              <Text style={styles.cardRange}>{summary.rangeLabel}</Text>
            </View>
            <View style={styles.badge}>
              <StarIcon color="#FFFFFF" size={20} />
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>
                {summary.activeDays}
                <Text style={styles.statUnit}> 天</Text>
              </Text>
              <Text style={styles.statLabel}>活跃天数 · 共{summary.totalDays}天</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>
                {summary.totalCount}
                <Text style={styles.statUnit}> 次</Text>
              </Text>
              <Text style={styles.statLabel}>记录总数</Text>
            </View>
          </View>

          {/* Top activities */}
          <View style={styles.block}>
            <Text style={styles.blockLabel}>记录最多</Text>
            {summary.top.length === 0 ? (
              <Text style={styles.emptyText}>这段时间还没有记录。</Text>
            ) : (
              summary.top.map((t) => {
                const { dot, text, soft } = resolveOptionalTag(c, tags, t.tagId);
                return (
                  <View key={t.title} style={styles.topRow}>
                    <View style={[styles.topIcon, { backgroundColor: soft }]}>
                      <View style={[styles.topDot, { backgroundColor: dot }]} />
                    </View>
                    <View style={styles.topBody}>
                      <View style={styles.topTopline}>
                        <Text style={styles.topTitle} numberOfLines={1}>
                          {t.title}
                        </Text>
                        <Text style={[styles.topCount, { color: text }]}>{t.count} 次</Text>
                      </View>
                      <View style={styles.track}>
                        <View
                          style={[
                            styles.fill,
                            { width: `${Math.max(8, Math.round((t.count / topMax) * 100))}%`, backgroundColor: dot },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Mood distribution */}
          <View style={styles.block}>
            <View style={styles.moodHead}>
              <Text style={styles.blockLabel}>心情分布</Text>
              {summary.dominantMood && (
                <Text style={styles.moodMost}>
                  大多 <Text style={styles.moodMostStrong}>{MOOD_MAP[summary.dominantMood].label}</Text>
                </Text>
              )}
            </View>
            {summary.moodTotal === 0 ? (
              <Text style={styles.emptyText}>还没有心情记录。</Text>
            ) : (
              <>
                <View style={styles.moodBar}>
                  {summary.moods.map((m) => (
                    <View
                      key={m.id}
                      style={{
                        flex: m.count,
                        backgroundColor: MOOD_DIST_COLOR[m.id],
                      }}
                    />
                  ))}
                </View>
                <View style={styles.moodLegend}>
                  {summary.moods.map((m) => (
                    <View key={m.id} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: MOOD_DIST_COLOR[m.id] }]} />
                      <Text style={styles.legendText}>{MOOD_MAP[m.id].label}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>

          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{summary.message}</Text>
          </View>
        </View>
        )}
      </ScrollView>

      {period !== 'year' && (
        <Pressable
          onPress={onShare}
          style={({ pressed }) => [
            styles.shareBtn,
            { bottom: 24 + insets.bottom },
            pressed && styles.sharePressed,
          ]}
        >
          <ShareIcon color="#FFFFFF" size={16} />
          <Text style={styles.shareText}>分享这张卡片</Text>
        </Pressable>
      )}
    </View>
  );
}

function DonutChart({
  slices,
  total,
  track,
  numColor,
  labelColor,
}: {
  slices: { color: string; value: number }[];
  total: number;
  track: string;
  numColor: string;
  labelColor: string;
}) {
  const size = 118;
  const ring = 16;
  const r = (size - ring) / 2;
  const C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={ring} fill="none" />
          {slices.map((s, i) => {
            const frac = total > 0 ? s.value / total : 0;
            const seg = (
              <Circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={s.color}
                strokeWidth={ring}
                fill="none"
                strokeDasharray={`${frac * C} ${C}`}
                strokeDashoffset={-acc * C}
              />
            );
            acc += frac;
            return seg;
          })}
        </G>
      </Svg>
      <View style={styles_donutCenter}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: numColor }}>{total}</Text>
        <Text style={{ fontSize: 10, fontWeight: '700', color: labelColor }}>总次数</Text>
      </View>
    </View>
  );
}

const styles_donutCenter = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const createStyles = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bgAlt, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8 },
  roundBtn: {
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
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: c.ink },
  yearLabel: { fontSize: 16, fontWeight: '800', color: c.ink },
  annualCard: {
    backgroundColor: c.card,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 14,
  },
  annualHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  annualTotal: { fontSize: 11, fontWeight: '800', color: c.gold },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  monthCell: {
    width: '23%',
    aspectRatio: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  monthCellCurrent: { borderColor: c.ink },
  monthName: { fontSize: 10, fontWeight: '700', color: c.heatDaySoft },
  monthCount: { fontSize: 13, fontWeight: '800', color: c.heatDayStrong },
  monthFuture: { color: c.muted3 },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  donutLegend: { flex: 1, gap: 9 },
  donutLegendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  donutLegendLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: c.ink },
  donutLegendPct: { fontSize: 13, fontWeight: '800' },
  segmented: {
    flexDirection: 'row',
    backgroundColor: c.border,
    borderRadius: 12,
    padding: 3,
    gap: 2,
    marginTop: 16,
  },
  segment: { flex: 1, alignItems: 'center', borderRadius: 9, paddingVertical: 8 },
  segmentActive: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 9,
    backgroundColor: c.card,
    paddingVertical: 8,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  segmentText: { fontSize: 12.5, fontWeight: '700', color: c.muted2 },
  segmentActiveText: { fontSize: 12.5, fontWeight: '800', color: c.ink },
  scroll: { paddingTop: 16 },
  card: {
    backgroundColor: c.sheet,
    borderRadius: 22,
    padding: 17,
    gap: 14,
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardHeadText: { gap: 3 },
  cardLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.6, color: c.gold },
  cardRange: { fontSize: 16, fontWeight: '800', color: c.ink },
  badge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.accent,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 4,
  },
  statRow: { flexDirection: 'row', gap: 9 },
  statBox: { flex: 1, backgroundColor: c.card, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11, gap: 2 },
  statNum: { fontSize: 25, fontWeight: '800', color: c.ink, lineHeight: 28 },
  statUnit: { fontSize: 12, fontWeight: '700', color: c.muted3 },
  statLabel: { fontSize: 10.5, fontWeight: '600', color: c.muted3 },
  block: { gap: 8 },
  blockLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8, color: c.gold },
  emptyText: { fontSize: 12, fontWeight: '500', color: c.muted3 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  topIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  topDot: { width: 11, height: 11, borderRadius: 999 },
  topBody: { flex: 1, gap: 4 },
  topTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: c.ink, paddingRight: 8 },
  topCount: { fontSize: 11, fontWeight: '800' },
  track: { height: 6, borderRadius: 4, backgroundColor: c.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  moodHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  moodMost: { fontSize: 10.5, fontWeight: '700', color: c.muted },
  moodMostStrong: { color: c.accentInk, fontWeight: '800' },
  moodBar: { flexDirection: 'row', height: 13, borderRadius: 7, overflow: 'hidden', gap: 2 },
  moodLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendDot: { width: 7, height: 7, borderRadius: 999 },
  legendText: { fontSize: 9.5, fontWeight: '600', color: c.muted },
  messageBox: { backgroundColor: c.inputBg, borderRadius: 13, paddingHorizontal: 13, paddingVertical: 11 },
  messageText: { fontSize: 11.5, fontWeight: '600', color: c.muted, lineHeight: 18 },
  shareBtn: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: c.fab,
    borderRadius: 15,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    shadowColor: c.fab,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 8,
  },
  sharePressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  shareText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
});
