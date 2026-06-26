import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette, heatColor, heatLegend, useTheme } from '../theme';
import { Activity, ActivityTag } from '../types';
import { resolveActivityTag, untaggedView } from '../tagUtils';
import { cnMonth, daysInMonth, mondayFirstIndex, timeLabel } from '../dateUtils';
import { useToday } from '../useToday';
import { MOOD_MAP, MoodFace, WEATHER_MAP, WeatherIcon } from '../components/moodWeather';

interface Props {
  title: string;
  activities: Activity[];
  tags: ActivityTag[];
  onBack: () => void;
}

const WEEK = ['一', '二', '三', '四', '五', '六', '日'];

export default function StatsScreen({ title, activities, tags, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const c = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const now = useToday();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-based
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [detail, setDetail] = useState<Activity | null>(null);

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
    return latest ? resolveActivityTag(c, tags, latest) : untaggedView(c);
  }, [matching, tags, c]);

  // The detail sheet shows the tag of the specific record being viewed, which
  // may differ from the title-level (latest) tag above.
  const detailTag = detail ? resolveActivityTag(c, tags, detail) : null;

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

  // Records of this activity on the selected day, earliest first.
  const dayRecords = useMemo(() => {
    if (selectedDay == null) return [];
    return matching
      .filter((a) => {
        const d = new Date(a.timestamp);
        return d.getFullYear() === year && d.getMonth() === month && d.getDate() === selectedDay;
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [matching, year, month, selectedDay]);

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
    setSelectedDay(null);
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
            <View style={[styles.headerTag, { backgroundColor: category.soft }]}>
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
              style={[styles.weekCell, i >= 5 && { color: c.weekend }]}
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
                const selected = selectedDay === day;
                return (
                  <Pressable
                    key={di}
                    disabled={future}
                    onPress={() => setSelectedDay(day)}
                    style={[
                      styles.cell,
                      { backgroundColor: future ? 'transparent' : heatColor(c, count) },
                      selected && styles.cellSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.cellDay,
                        { color: dark ? c.heatDayStrong : count > 0 ? c.heatDaySoft : c.gold },
                        future && { color: c.muted3 },
                      ]}
                    >
                      {day}
                    </Text>
                    {count > 0 && (
                      <Text style={[styles.cellCount, { color: dark ? c.heatCountStrong : c.heatCountSoft }]}>
                        {count}次
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendText}>少</Text>
          {heatLegend(c).map((sw, i) => (
            <View key={i} style={[styles.legendSwatch, { backgroundColor: sw }]} />
          ))}
          <Text style={styles.legendText}>多</Text>
        </View>

        {/* Selected day's records */}
        {selectedDay != null && (
          <View style={styles.daySection}>
            <Text style={styles.daySectionTitle}>
              {month + 1}月{selectedDay}日
              {dayRecords.length > 0 ? ` · ${dayRecords.length} 次` : ''}
            </Text>
            {dayRecords.length === 0 ? (
              <View style={styles.dayEmpty}>
                <Text style={styles.dayEmptyText}>这天没有「{title}」的记录</Text>
              </View>
            ) : (
              <View style={styles.dayCard}>
                {dayRecords.map((r, idx) => (
                  <Pressable
                    key={r.id}
                    onPress={() => setDetail(r)}
                    style={({ pressed }) => [
                      styles.dayRow,
                      idx === dayRecords.length - 1 && styles.dayRowLast,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.dayTime}>{timeLabel(r.timestamp)}</Text>
                    <Text style={[styles.dayNote, !r.note && styles.dayNoteEmpty]} numberOfLines={1}>
                      {r.note || '无留言'}
                    </Text>
                    <View style={styles.dayIcons}>
                      {r.mood && <MoodFace id={r.mood} color={c.muted} size={15} />}
                      {r.weather && <WeatherIcon id={r.weather} color={c.muted} size={14} />}
                    </View>
                    <Text style={styles.dayChevron}>›</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Record detail */}
      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <View style={styles.detailFill}>
          <Pressable style={styles.detailScrim} onPress={() => setDetail(null)} />
          <View style={[styles.detailSheet, { paddingBottom: 20 + insets.bottom }]}>
            <View style={styles.grabber} />
            {detail && detailTag && (
              <>
                <View style={styles.detailHead}>
                  <View style={[styles.headerDot, { backgroundColor: detailTag.dot }]} />
                  <Text style={styles.detailTitle} numberOfLines={1}>{detail.title}</Text>
                  <View style={[styles.headerTag, { backgroundColor: detailTag.soft }]}>
                    <Text style={[styles.headerTagText, { color: detailTag.text }]}>{detailTag.label}</Text>
                  </View>
                </View>
                <Text style={styles.detailTime}>
                  {month + 1}月{new Date(detail.timestamp).getDate()}日 · {timeLabel(detail.timestamp)}
                </Text>

                <View style={styles.detailMetaRow}>
                  <View style={styles.detailMeta}>
                    <Text style={styles.detailMetaLabel}>心情</Text>
                    {detail.mood ? (
                      <View style={styles.detailMetaValue}>
                        <MoodFace id={detail.mood} color={c.accentInk} size={20} />
                        <Text style={styles.detailMetaText}>{MOOD_MAP[detail.mood].label}</Text>
                      </View>
                    ) : (
                      <Text style={styles.detailMetaEmpty}>未记录</Text>
                    )}
                  </View>
                  <View style={styles.detailMeta}>
                    <Text style={styles.detailMetaLabel}>天气</Text>
                    {detail.weather ? (
                      <View style={styles.detailMetaValue}>
                        <WeatherIcon id={detail.weather} size={18} />
                        <Text style={styles.detailMetaText}>{WEATHER_MAP[detail.weather].label}</Text>
                      </View>
                    ) : (
                      <Text style={styles.detailMetaEmpty}>未记录</Text>
                    )}
                  </View>
                </View>

                <View style={styles.detailNoteBlock}>
                  <Text style={styles.detailMetaLabel}>想说的话</Text>
                  <Text style={[styles.detailNote, !detail.note && styles.detailNoteEmpty]}>
                    {detail.note || '这条记录没有留言'}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bgAlt },
  scroll: { paddingHorizontal: 20, paddingTop: 6 },
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
  headerDot: { width: 9, height: 9, borderRadius: 999 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: c.ink, flexShrink: 1 },
  headerTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  headerTagText: { fontSize: 10, fontWeight: '800' },
  summary: {
    backgroundColor: c.card,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  summaryLabel: { fontSize: 11, fontWeight: '700', color: c.muted3, marginBottom: 4 },
  summaryNumRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  summaryNum: { fontSize: 32, fontWeight: '800', color: c.ink, lineHeight: 34 },
  summaryUnit: { fontSize: 13, fontWeight: '700', color: c.muted, marginBottom: 3 },
  summaryStats: { flexDirection: 'row', gap: 20 },
  summaryStat: { alignItems: 'flex-end' },
  summaryStatNum: { fontSize: 18, fontWeight: '800', color: c.accent },
  summaryStatLabel: { fontSize: 10, fontWeight: '600', color: c.muted3, marginTop: 2 },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 18,
  },
  monthArrow: { fontSize: 18, color: '#C3BBAC', fontWeight: '700', paddingHorizontal: 4 },
  monthLabel: { fontSize: 15, fontWeight: '800', color: c.ink },
  weekHeader: { flexDirection: 'row', marginTop: 14 },
  weekCell: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700', color: c.gold },
  grid: { marginTop: 8, gap: 5 },
  weekRow: { flexDirection: 'row', gap: 5 },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cellSelected: { borderColor: c.ink },
  cellSpacer: { flex: 1, aspectRatio: 1 },
  cellDay: { fontSize: 11, fontWeight: '700', lineHeight: 13 },
  cellCount: { fontSize: 8, fontWeight: '700', lineHeight: 10, marginTop: 1 },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginTop: 14 },
  legendText: { fontSize: 10, color: c.gold, fontWeight: '600' },
  legendSwatch: { width: 13, height: 13, borderRadius: 4 },

  daySection: { marginTop: 22, gap: 10 },
  daySectionTitle: { fontSize: 13, fontWeight: '800', color: c.ink, letterSpacing: 0.3 },
  dayEmpty: {
    backgroundColor: c.card,
    borderRadius: 16,
    paddingVertical: 22,
    alignItems: 'center',
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  dayEmptyText: { fontSize: 12.5, fontWeight: '600', color: c.muted3 },
  dayCard: {
    backgroundColor: c.card,
    borderRadius: 16,
    paddingHorizontal: 15,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: c.inputBg,
  },
  dayRowLast: { borderBottomWidth: 0 },
  dayTime: { fontSize: 12, fontWeight: '800', color: c.gold, width: 42 },
  dayNote: { flex: 1, fontSize: 13, fontWeight: '600', color: c.ink },
  dayNoteEmpty: { color: c.muted3, fontWeight: '500' },
  dayIcons: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dayChevron: { fontSize: 18, fontWeight: '700', color: c.gold },
  pressed: { opacity: 0.55 },

  detailFill: { flex: 1, justifyContent: 'flex-end' },
  detailScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.scrim },
  detailSheet: {
    backgroundColor: c.sheet,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 13,
    gap: 16,
    shadowColor: '#322E2A',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.22,
    shadowRadius: 30,
    elevation: 24,
  },
  grabber: { width: 38, height: 4, borderRadius: 999, backgroundColor: c.divider, alignSelf: 'center' },
  detailHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: c.ink },
  detailTime: { fontSize: 12.5, fontWeight: '600', color: c.muted3, marginTop: -8 },
  detailMetaRow: { flexDirection: 'row', gap: 12 },
  detailMeta: {
    flex: 1,
    backgroundColor: c.inputBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 7,
  },
  detailMetaLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1, color: c.gold },
  detailMetaValue: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  detailMetaText: { fontSize: 15, fontWeight: '800', color: c.ink },
  detailMetaEmpty: { fontSize: 14, fontWeight: '600', color: c.muted3 },
  detailNoteBlock: {
    backgroundColor: c.inputBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 7,
  },
  detailNote: { fontSize: 14.5, fontWeight: '600', color: c.ink, lineHeight: 22 },
  detailNoteEmpty: { color: c.muted3, fontWeight: '500' },
});
