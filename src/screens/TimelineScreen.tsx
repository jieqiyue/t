import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORY_MAP, Palette, useTheme } from '../theme';
import { Activity, ActivityTag } from '../types';
import { encouragementFor, isSameDay, longDateLabel, timeLabel } from '../dateUtils';
import { MOOD_MAP, MoodFace, StarIcon, WEATHER_MAP, WeatherIcon } from '../components/moodWeather';

interface Props {
  activities: Activity[];
  tags: ActivityTag[];
  onOpenDetail: (id: string) => void;
  onOpenAllActivities: () => void;
  onOpenSettings: () => void;
  onOpenRecord: () => void;
  onDeleteActivity: (id: string) => void;
  onOpenSummary: () => void;
}

export default function TimelineScreen({
  activities,
  tags,
  onOpenDetail,
  onOpenAllActivities,
  onOpenSettings,
  onOpenRecord,
  onDeleteActivity,
  onOpenSummary,
}: Props) {
  const insets = useSafeAreaInsets();
  const c = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const today = useMemo(() => new Date(), []);
  const [pendingDelete, setPendingDelete] = useState<Activity | null>(null);

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
          <Pressable onPress={onOpenSummary} style={styles.iconButton} hitSlop={10}>
            <StarIcon color={c.muted} size={16} />
          </Pressable>
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
                <View key={a.id} style={styles.row}>
                  <Pressable
                    onPress={() => onOpenDetail(a.id)}
                    style={({ pressed }) => [styles.rowMain, pressed && styles.rowPressed]}
                  >
                    <Text style={styles.time}>{timeLabel(a.timestamp)}</Text>
                    <View style={styles.dotWrap}>
                      <View style={[styles.dot, { backgroundColor: cat.dot }]} />
                    </View>
                    <View style={styles.rowBody}>
                      <View style={styles.rowTop}>
                        <Text style={styles.rowTitle}>{a.title}</Text>
                        <Text style={styles.statHint}>详情 ›</Text>
                      </View>
                      {!!a.note && (
                        <Text style={styles.rowNote} numberOfLines={1} ellipsizeMode="tail">
                          {a.note}
                        </Text>
                      )}
                      <View style={styles.metaRow}>
                        <Text style={[styles.rowCat, { color: cat.text }]}>{cat.label}</Text>
                        {a.mood && (
                          <>
                            <Text style={styles.metaSep}>·</Text>
                            <MoodFace id={a.mood} color={c.muted2} size={13} />
                            <Text style={styles.metaText}>{MOOD_MAP[a.mood].label}</Text>
                          </>
                        )}
                        {a.weather && (
                          <>
                            <Text style={styles.metaSep}>·</Text>
                            <WeatherIcon id={a.weather} color={c.muted2} size={12} />
                            <Text style={styles.metaText}>{WEATHER_MAP[a.weather].label}</Text>
                          </>
                        )}
                      </View>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => setPendingDelete(a)}
                    hitSlop={8}
                    style={({ pressed }) => [styles.delBtn, pressed && styles.delBtnPressed]}
                  >
                    <View style={[styles.xBar, { transform: [{ rotate: '45deg' }] }]} />
                    <View style={[styles.xBar, { transform: [{ rotate: '-45deg' }] }]} />
                  </Pressable>
                </View>
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

      {pendingDelete && (
        <View style={styles.confirmOverlay}>
          <Pressable style={styles.confirmScrim} onPress={() => setPendingDelete(null)} />
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>删除记录</Text>
            <Text style={styles.confirmBody}>
              删除「{pendingDelete.title}」这条记录后将无法恢复，统计也会相应减少。
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                onPress={() => setPendingDelete(null)}
                style={[styles.confirmButton, styles.cancelButton]}
              >
                <Text style={styles.cancelText}>取消</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  onDeleteActivity(pendingDelete.id);
                  setPendingDelete(null);
                }}
                style={[styles.confirmButton, styles.deleteButton]}
              >
                <Text style={styles.deleteConfirmText}>确认删除</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { paddingHorizontal: 22, paddingTop: 6 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingTop: 12 },
  bigDay: { fontSize: 54, fontWeight: '800', color: c.ink, lineHeight: 54 },
  headerText: { paddingTop: 6, gap: 5, flex: 1 },
  dateLabel: { fontSize: 14, fontWeight: '800', color: c.ink, letterSpacing: 0.5 },
  encourage: { fontSize: 13, color: c.muted2, fontWeight: '500', lineHeight: 19 },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: c.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  moreDots: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  moreDot: { width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: c.muted },
  overviewCard: {
    marginTop: 18,
    backgroundColor: c.card,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  overviewTitle: { fontSize: 16, fontWeight: '800', color: c.ink },
  overviewSubtitle: { marginTop: 3, fontSize: 11.5, fontWeight: '600', color: c.muted3 },
  overviewArrow: { fontSize: 20, fontWeight: '700', color: c.gold },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 22 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 3, color: c.gold },
  sectionLine: { flex: 1, height: 1, backgroundColor: c.divider },
  sectionCount: { fontSize: 11, color: c.gold, fontWeight: '700' },
  timeline: { position: 'relative', marginTop: 10 },
  rail: {
    position: 'absolute',
    left: 49,
    top: 18,
    bottom: 18,
    width: 1.5,
    backgroundColor: c.divider,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'flex-start' },
  rowPressed: { opacity: 0.55 },
  delBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: c.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    marginTop: 2,
  },
  delBtnPressed: { opacity: 0.5 },
  xBar: { position: 'absolute', width: 11, height: 1.8, borderRadius: 1, backgroundColor: c.muted3 },
  time: {
    width: 40,
    textAlign: 'right',
    fontSize: 11,
    fontWeight: '700',
    color: c.gold,
    paddingTop: 2,
  },
  dotWrap: { width: 18, alignItems: 'center', paddingTop: 4 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    borderWidth: 2.5,
    borderColor: c.bg,
  },
  rowBody: { flex: 1, paddingLeft: 8, gap: 5 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowTitle: { fontSize: 14, fontWeight: '700', color: c.ink, flexShrink: 1, paddingRight: 8 },
  statHint: { fontSize: 10, fontWeight: '800', color: c.accent },
  rowNote: { fontSize: 12, fontWeight: '500', color: c.muted, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  rowCat: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  metaSep: { fontSize: 11, fontWeight: '700', color: c.muted3 },
  metaText: { fontSize: 11, fontWeight: '700', color: c.muted2 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: c.muted },
  emptyHint: { fontSize: 12.5, color: c.muted3, textAlign: 'center', lineHeight: 19 },
  fab: {
    position: 'absolute',
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: c.fab,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: c.fab,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 10,
  },
  fabPressed: { transform: [{ scale: 0.96 }], opacity: 0.92 },
  fabPlus: { color: '#FFFFFF', fontSize: 18, fontWeight: '400', lineHeight: 20 },
  fabText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  confirmOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  confirmScrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: c.scrim },
  confirmCard: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: c.sheet,
    padding: 18,
    gap: 12,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 18,
  },
  confirmTitle: { fontSize: 18, fontWeight: '800', color: c.ink },
  confirmBody: { fontSize: 13, fontWeight: '500', color: c.muted, lineHeight: 20 },
  confirmActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  confirmButton: { flex: 1, alignItems: 'center', borderRadius: 14, paddingVertical: 12 },
  cancelButton: { backgroundColor: c.inputBg },
  deleteButton: { backgroundColor: '#9B6E64' },
  cancelText: { fontSize: 14, fontWeight: '800', color: c.muted },
  deleteConfirmText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
});
