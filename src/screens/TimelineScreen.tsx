import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette, useTheme } from '../theme';
import { Activity, ActivityTag } from '../types';
import { resolveActivityTag } from '../tagUtils';
import {
  addDays,
  encouragementFor,
  isSameDay,
  longDateLabel,
  relativeDayLabel,
  timeLabel,
} from '../dateUtils';
import { MOOD_MAP, MoodFace, PinIcon, StarIcon, WEATHER_MAP, WeatherIcon } from '../components/moodWeather';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToday } from '../useToday';
import { locationLabel } from '../location';

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
  const today = useToday();
  const [viewDate, setViewDate] = useState(() => new Date());
  const [pendingDelete, setPendingDelete] = useState<Activity | null>(null);
  const isToday = isSameDay(viewDate, today);

  const dayRecords = useMemo(
    () =>
      activities
        .filter((a) => isSameDay(new Date(a.timestamp), viewDate))
        .sort((a, b) => a.timestamp - b.timestamp),
    [activities, viewDate],
  );

  // Browse earlier days; never step past today (no future records to show).
  const goPrev = () => setViewDate((d) => addDays(d, -1));
  const goNext = () => setViewDate((d) => (isSameDay(d, today) ? d : addDays(d, 1)));

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Date header with prev/next-day navigation */}
        <View style={styles.header}>
          <Pressable onPress={goPrev} style={styles.navBtn} hitSlop={8}>
            <Text style={styles.navChevron}>‹</Text>
          </Pressable>
          <Text style={styles.bigDay}>{viewDate.getDate()}</Text>
          <View style={styles.headerText}>
            <Text style={styles.dateLabel}>{longDateLabel(viewDate)}</Text>
            <View style={[styles.dayPill, !isToday && styles.dayPillPast]}>
              <Text style={[styles.dayPillText, !isToday && styles.dayPillTextPast]}>
                {relativeDayLabel(viewDate, today)}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={goNext}
            disabled={isToday}
            style={[styles.navBtn, isToday && styles.navBtnDisabled]}
            hitSlop={8}
          >
            <Text style={[styles.navChevron, isToday && styles.navChevronDisabled]}>›</Text>
          </Pressable>
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
        <Text style={styles.encourage}>{encouragementFor(viewDate)}</Text>

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
          <Text style={styles.sectionTitle}>{isToday ? '今 日 记 录' : '当 日 记 录'}</Text>
          <View style={styles.sectionLine} />
          <Text style={styles.sectionCount}>{dayRecords.length}</Text>
        </View>

        {dayRecords.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{isToday ? '今天还没有记录' : '这一天没有记录'}</Text>
            <Text style={styles.emptyHint}>
              {isToday ? '点击右下角的「＋记录」，写下此刻吧。' : '换一天看看，或回到今天记录新的一刻。'}
            </Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            <View style={styles.rail} />
            {dayRecords.map((a) => {
              const cat = resolveActivityTag(c, tags, a);
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
                      {!!a.location && (
                        <View style={styles.locRow}>
                          <PinIcon color={c.muted2} size={11} />
                          <Text style={styles.locText} numberOfLines={1}>
                            {locationLabel(a.location)}
                          </Text>
                        </View>
                      )}
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
        onPress={() => {
          if (!isToday) setViewDate(new Date());
          onOpenRecord();
        }}
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
        <ConfirmDialog
          title="删除记录"
          message={`删除「${pendingDelete.title}」这条记录后将无法恢复，统计也会相应减少。`}
          confirmLabel="确认删除"
          onConfirm={() => {
            onDeleteActivity(pendingDelete.id);
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </View>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { paddingHorizontal: 22, paddingTop: 6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 12 },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: c.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  navBtnDisabled: { backgroundColor: c.bgAlt, shadowOpacity: 0, elevation: 0 },
  navChevron: { fontSize: 22, color: c.muted, marginTop: -3, fontWeight: '500' },
  navChevronDisabled: { color: c.muted3, opacity: 0.5 },
  bigDay: { fontSize: 52, fontWeight: '800', color: c.ink, lineHeight: 52 },
  headerText: { gap: 6, flex: 1, paddingLeft: 2 },
  dateLabel: { fontSize: 14, fontWeight: '800', color: c.ink, letterSpacing: 0.5 },
  dayPill: {
    alignSelf: 'flex-start',
    backgroundColor: c.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 2.5,
  },
  dayPillPast: { backgroundColor: c.inputBg },
  dayPillText: { fontSize: 11, fontWeight: '800', color: c.accent, letterSpacing: 0.3 },
  dayPillTextPast: { color: c.muted2 },
  encourage: { marginTop: 12, fontSize: 13, color: c.muted2, fontWeight: '500', lineHeight: 19 },
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
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locText: { flex: 1, fontSize: 11, fontWeight: '600', color: c.muted2 },
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
});
