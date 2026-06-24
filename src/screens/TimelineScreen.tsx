import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORY_MAP, COLORS } from '../theme';
import { Activity, ActivityTag } from '../types';
import { encouragementFor, isSameDay, longDateLabel, timeLabel } from '../dateUtils';

interface Props {
  activities: Activity[];
  tags: ActivityTag[];
  onOpenStats: (title: string) => void;
  onOpenAllActivities: () => void;
  onOpenSettings: () => void;
  onOpenRecord: () => void;
}

export default function TimelineScreen({
  activities,
  tags,
  onOpenStats,
  onOpenAllActivities,
  onOpenSettings,
  onOpenRecord,
}: Props) {
  const insets = useSafeAreaInsets();
  const today = useMemo(() => new Date(), []);

  const todays = useMemo(
    () =>
      activities
        .filter((a) => isSameDay(new Date(a.timestamp), today))
        .sort((a, b) => a.timestamp - b.timestamp),
    [activities, today],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Date header */}
        <View style={styles.header}>
          <Text style={styles.bigDay}>{today.getDate()}</Text>
          <View style={styles.headerText}>
            <Text style={styles.dateLabel}>{longDateLabel(today)}</Text>
            <Text style={styles.encourage}>{encouragementFor(today)}</Text>
          </View>
          <Pressable onPress={onOpenSettings} style={styles.iconButton} hitSlop={10}>
            <View style={styles.moreDots}>
              <View style={styles.moreDot} />
              <View style={styles.moreDot} />
              <View style={styles.moreDot} />
            </View>
          </Pressable>
        </View>

        <Pressable
          onPress={onOpenAllActivities}
          style={({ pressed }) => [styles.overviewCard, pressed && styles.rowPressed]}
        >
          <View>
            <Text style={styles.overviewTitle}>全部活动</Text>
            <Text style={styles.overviewSubtitle}>
              {activities.length} 次记录 · 点击查看所有活动
            </Text>
          </View>
          <Text style={styles.overviewArrow}>›</Text>
        </Pressable>

        {/* Section divider */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>今 日 记 录</Text>
          <View style={styles.sectionLine} />
          <Text style={styles.sectionCount}>{todays.length}</Text>
        </View>

        {todays.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>今天还没有记录</Text>
            <Text style={styles.emptyHint}>点击右下角的「＋记录」，写下此刻吧。</Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            <View style={styles.rail} />
            {todays.map((a) => {
              const cat = tags.find((tag) => tag.id === (a.tagId || a.category)) || CATEGORY_MAP[a.category];
              return (
                <Pressable
                  key={a.id}
                  onPress={() => onOpenStats(a.title)}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                >
                  <Text style={styles.time}>{timeLabel(a.timestamp)}</Text>
                  <View style={styles.dotWrap}>
                    <View style={[styles.dot, { backgroundColor: cat.dot }]} />
                  </View>
                  <View style={styles.rowBody}>
                    <View style={styles.rowTop}>
                      <Text style={styles.rowTitle}>{a.title}</Text>
                      <Text style={styles.statHint}>统计 ›</Text>
                    </View>
                    {!!a.note && (
                      <Text style={styles.rowNote} numberOfLines={2}>
                        {a.note}
                      </Text>
                    )}
                    <Text style={[styles.rowCat, { color: cat.text }]}>{cat.label}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Floating record button */}
      <Pressable
        onPress={onOpenRecord}
        style={({ pressed }) => [
          styles.fab,
          { bottom: 28 + insets.bottom },
          pressed && styles.fabPressed,
        ]}
      >
        <Text style={styles.fabPlus}>＋</Text>
        <Text style={styles.fabText}>记录</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: 22, paddingTop: 6 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingTop: 12 },
  bigDay: { fontSize: 54, fontWeight: '800', color: COLORS.ink, lineHeight: 54 },
  headerText: { paddingTop: 6, gap: 5, flex: 1 },
  dateLabel: { fontSize: 14, fontWeight: '800', color: COLORS.ink, letterSpacing: 0.5 },
  encourage: { fontSize: 13, color: COLORS.muted2, fontWeight: '500', lineHeight: 19 },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  moreDots: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  moreDot: { width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: COLORS.muted },
  overviewCard: {
    marginTop: 18,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  overviewTitle: { fontSize: 16, fontWeight: '800', color: COLORS.ink },
  overviewSubtitle: { marginTop: 3, fontSize: 11.5, fontWeight: '600', color: COLORS.muted3 },
  overviewArrow: { fontSize: 20, fontWeight: '700', color: COLORS.gold },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 22 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 3, color: COLORS.gold },
  sectionLine: { flex: 1, height: 1, backgroundColor: COLORS.divider },
  sectionCount: { fontSize: 11, color: COLORS.gold, fontWeight: '700' },
  timeline: { position: 'relative', marginTop: 10 },
  rail: {
    position: 'absolute',
    left: 49,
    top: 18,
    bottom: 18,
    width: 1.5,
    backgroundColor: COLORS.divider,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10 },
  rowPressed: { opacity: 0.55 },
  time: {
    width: 40,
    textAlign: 'right',
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.gold,
    paddingTop: 2,
  },
  dotWrap: { width: 18, alignItems: 'center', paddingTop: 4 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    borderWidth: 2.5,
    borderColor: COLORS.bg,
  },
  rowBody: { flex: 1, paddingLeft: 8, gap: 5 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowTitle: { fontSize: 14, fontWeight: '700', color: COLORS.ink, flexShrink: 1, paddingRight: 8 },
  statHint: { fontSize: 10, fontWeight: '800', color: COLORS.accent },
  rowNote: { fontSize: 12, fontWeight: '500', color: COLORS.muted, lineHeight: 18 },
  rowCat: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: COLORS.muted },
  emptyHint: { fontSize: 12.5, color: COLORS.muted3, textAlign: 'center', lineHeight: 19 },
  fab: {
    position: 'absolute',
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: COLORS.ink,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 10,
  },
  fabPressed: { transform: [{ scale: 0.96 }], opacity: 0.92 },
  fabPlus: { color: '#FFFFFF', fontSize: 18, fontWeight: '400', lineHeight: 20 },
  fabText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
