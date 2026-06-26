import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette, useTheme } from '../theme';
import { Activity, ActivityTag, MoodId, WeatherId } from '../types';
import { resolveActivityTag } from '../tagUtils';
import { MOOD_MAP, MOODS, MoodFace, WEATHER_MAP, WEATHERS, WeatherIcon } from '../components/moodWeather';
import ConfirmDialog from '../components/ConfirmDialog';

interface Props {
  activity: Activity;
  tags: ActivityTag[];
  onUpdate: (activity: Activity) => void;
  onDelete: (id: string) => void;
  onOpenStats: (title: string) => void;
  onBack: () => void;
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}
function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export default function RecordDetailScreen({
  activity,
  tags,
  onUpdate,
  onDelete,
  onOpenStats,
  onBack,
}: Props) {
  const insets = useSafeAreaInsets();
  const c = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);

  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [note, setNote] = useState(activity.note ?? '');
  const [mood, setMood] = useState<MoodId | null>(activity.mood ?? null);
  const [weather, setWeather] = useState<WeatherId | null>(activity.weather ?? null);
  const [when, setWhen] = useState(() => new Date(activity.timestamp));
  const [pendingDelete, setPendingDelete] = useState(false);

  const tag = resolveActivityTag(c, tags, activity);

  const startEdit = () => {
    setNote(activity.note ?? '');
    setMood(activity.mood ?? null);
    setWeather(activity.weather ?? null);
    setWhen(new Date(activity.timestamp));
    setMode('edit');
  };

  const save = () => {
    onUpdate({
      ...activity,
      note: note.trim() || undefined,
      mood: mood ?? undefined,
      weather: weather ?? undefined,
      timestamp: when.getTime(),
    });
    setMode('view');
  };

  const shiftDay = (delta: number) => {
    const d = new Date(when);
    d.setDate(d.getDate() + delta);
    setWhen(d);
  };
  const shiftHour = (delta: number) => {
    const d = new Date(when);
    d.setHours(d.getHours() + delta); // carries into the day, like shiftDay
    setWhen(d);
  };
  const shiftMin = (delta: number) => {
    const d = new Date(when);
    d.setMinutes(d.getMinutes() + delta); // carries into the hour
    setWhen(d);
  };

  if (mode === 'edit') {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
        <View style={styles.editHeader}>
          <Pressable onPress={() => setMode('view')} hitSlop={10}>
            <Text style={styles.headerSide}>取消</Text>
          </Pressable>
          <Text style={styles.headerTitle}>编辑记录</Text>
          <Pressable onPress={save} hitSlop={10}>
            <Text style={[styles.headerSide, styles.headerSave]}>保存</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 28, gap: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Text style={styles.label}>备注</Text>
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder="记录此刻想说的话…"
              placeholderTextColor={c.muted3}
              multiline
              maxLength={140}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>心情</Text>
            <View style={styles.moodRow}>
              {MOODS.map((m) => {
                const active = mood === m.id;
                return (
                  <Pressable key={m.id} onPress={() => setMood(active ? null : m.id)} style={styles.moodItem}>
                    <View style={[styles.moodFace, active && styles.moodFaceActive]}>
                      <MoodFace id={m.id} color={active ? c.accentInk : c.muted2} />
                    </View>
                    <Text style={[styles.moodLabel, active && styles.moodLabelActive]}>{m.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>天气</Text>
            <View style={styles.weatherRow}>
              {WEATHERS.map((w) => {
                const active = weather === w.id;
                return (
                  <Pressable
                    key={w.id}
                    onPress={() => setWeather(active ? null : w.id)}
                    style={[styles.weatherChip, active && { backgroundColor: c.accentSoft, borderColor: w.color, borderWidth: 2 }]}
                  >
                    <WeatherIcon id={w.id} />
                    <Text style={[styles.weatherText, active && styles.weatherTextActive]}>{w.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>时间</Text>
            <View style={styles.timeCard}>
              <View style={styles.timeRow}>
                <Pressable onPress={() => shiftDay(-1)} style={styles.stepBtn} hitSlop={6}>
                  <Text style={styles.stepText}>‹</Text>
                </Pressable>
                <Text style={styles.timeDate}>{fmtDate(when)}</Text>
                <Pressable onPress={() => shiftDay(1)} style={styles.stepBtn} hitSlop={6}>
                  <Text style={styles.stepText}>›</Text>
                </Pressable>
              </View>
              <View style={styles.timeDivider} />
              <View style={styles.timeRow}>
                <Pressable onPress={() => shiftHour(-1)} style={styles.stepBtn} hitSlop={6}>
                  <Text style={styles.stepText}>‹</Text>
                </Pressable>
                <Text style={styles.timeNum}>{pad(when.getHours())}</Text>
                <Pressable onPress={() => shiftHour(1)} style={styles.stepBtn} hitSlop={6}>
                  <Text style={styles.stepText}>›</Text>
                </Pressable>
                <Text style={styles.timeColon}>:</Text>
                <Pressable onPress={() => shiftMin(-5)} style={styles.stepBtn} hitSlop={6}>
                  <Text style={styles.stepText}>‹</Text>
                </Pressable>
                <Text style={styles.timeNum}>{pad(when.getMinutes())}</Text>
                <Pressable onPress={() => shiftMin(5)} style={styles.stepBtn} hitSlop={6}>
                  <Text style={styles.stepText}>›</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <Pressable onPress={save} style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}>
            <Text style={styles.saveText}>保 存 修 改</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.roundBtn} hitSlop={10}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.title}>记录详情</Text>
          <Pressable onPress={startEdit} style={styles.editPill} hitSlop={8}>
            <Text style={styles.editPillText}>编辑</Text>
          </Pressable>
        </View>

        <View style={styles.catRow}>
          <View style={[styles.catChip, { backgroundColor: tag.soft }]}>
            <View style={[styles.catDot, { backgroundColor: tag.dot }]} />
            <Text style={[styles.catText, { color: tag.text }]}>
              {tag.label} · {activity.title}
            </Text>
          </View>
          <Pressable onPress={() => onOpenStats(activity.title)} hitSlop={8}>
            <Text style={styles.statLink}>统计 ›</Text>
          </Pressable>
        </View>

        <Text style={styles.bigTitle}>{activity.title}</Text>

        {!!activity.note && (
          <View style={styles.noteCard}>
            <Text style={styles.noteText}>{activity.note}</Text>
          </View>
        )}

        <View style={styles.metaCard}>
          <View style={[styles.metaRow, styles.metaBorder]}>
            <Text style={styles.metaKey}>心情</Text>
            {activity.mood ? (
              <View style={styles.metaVal}>
                <MoodFace id={activity.mood} color={c.accentInk} size={18} />
                <Text style={styles.metaValText}>{MOOD_MAP[activity.mood].label}</Text>
              </View>
            ) : (
              <Text style={styles.metaEmpty}>未记录</Text>
            )}
          </View>
          <View style={[styles.metaRow, styles.metaBorder]}>
            <Text style={styles.metaKey}>天气</Text>
            {activity.weather ? (
              <View style={styles.metaVal}>
                <WeatherIcon id={activity.weather} size={18} />
                <Text style={styles.metaValText}>{WEATHER_MAP[activity.weather].label}</Text>
              </View>
            ) : (
              <Text style={styles.metaEmpty}>未记录</Text>
            )}
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>时间</Text>
            <Text style={styles.metaValText}>
              {fmtDate(new Date(activity.timestamp))} · {pad(new Date(activity.timestamp).getHours())}:
              {pad(new Date(activity.timestamp).getMinutes())}
            </Text>
          </View>
        </View>

        <Pressable onPress={() => setPendingDelete(true)} style={styles.deleteRow} hitSlop={6}>
          <Text style={styles.deleteText}>删除这条记录</Text>
        </Pressable>
      </ScrollView>

      {pendingDelete && (
        <ConfirmDialog
          title="删除记录"
          message={`删除「${activity.title}」这条记录后将无法恢复，统计也会相应减少。`}
          confirmLabel="确认删除"
          onConfirm={() => onDelete(activity.id)}
          onCancel={() => setPendingDelete(false)}
        />
      )}
    </View>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bgAlt, paddingHorizontal: 20 },
  scroll: { paddingTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
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
  editPill: { backgroundColor: c.accentSoft, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  editPillText: { fontSize: 13, fontWeight: '800', color: c.accentInk },
  catRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  catDot: { width: 7, height: 7, borderRadius: 999 },
  catText: { fontSize: 12, fontWeight: '800' },
  statLink: { fontSize: 12, fontWeight: '800', color: c.accent },
  bigTitle: { fontSize: 23, fontWeight: '800', color: c.ink, lineHeight: 32, marginTop: 12 },
  noteCard: {
    marginTop: 16,
    backgroundColor: c.card,
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 14,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  noteText: { fontSize: 14, fontWeight: '500', color: c.muted, lineHeight: 23 },
  metaCard: {
    marginTop: 16,
    backgroundColor: c.card,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 15, paddingVertical: 13 },
  metaBorder: { borderBottomWidth: 1, borderBottomColor: c.inputBg },
  metaKey: { fontSize: 12.5, fontWeight: '700', color: c.muted3, width: 42 },
  metaVal: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaValText: { fontSize: 13.5, fontWeight: '700', color: c.ink },
  metaEmpty: { fontSize: 13.5, fontWeight: '600', color: c.muted3 },
  deleteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 16, marginTop: 6 },
  deleteText: { fontSize: 13, fontWeight: '700', color: '#B07B6F' },

  // edit mode
  editHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8 },
  headerSide: { fontSize: 14, fontWeight: '700', color: c.muted },
  headerSave: { color: c.accentInk, fontWeight: '800' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: c.ink },
  section: { gap: 8 },
  label: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1, color: c.gold, paddingLeft: 2 },
  input: {
    backgroundColor: c.card,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 12,
    minHeight: 64,
    fontSize: 14,
    fontWeight: '500',
    color: c.ink,
    textAlignVertical: 'top',
    lineHeight: 22,
    borderWidth: 1.5,
    borderColor: c.accent,
  },
  moodRow: { flexDirection: 'row', gap: 7 },
  moodItem: { flex: 1, alignItems: 'center', gap: 4 },
  moodFace: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: c.card,
    borderWidth: 1.5,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodFaceActive: { backgroundColor: c.accentSoft, borderColor: c.accent, borderWidth: 2 },
  moodLabel: { fontSize: 9.5, fontWeight: '600', color: c.muted3 },
  moodLabelActive: { color: c.accentInk, fontWeight: '800' },
  weatherRow: { flexDirection: 'row', gap: 7 },
  weatherChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: c.card,
    borderWidth: 1.5,
    borderColor: c.border,
    paddingVertical: 8,
    borderRadius: 12,
  },
  weatherText: { fontSize: 12, fontWeight: '700', color: c.muted },
  weatherTextActive: { color: c.accentInk, fontWeight: '800' },
  timeCard: { backgroundColor: c.card, borderRadius: 14, paddingVertical: 4 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9 },
  timeDivider: { height: 1, backgroundColor: c.inputBg, marginHorizontal: 14 },
  stepBtn: { width: 30, height: 30, borderRadius: 999, backgroundColor: c.inputBg, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 17, fontWeight: '800', color: c.muted, marginTop: -2 },
  timeDate: { fontSize: 14, fontWeight: '800', color: c.ink, minWidth: 130, textAlign: 'center' },
  timeNum: { fontSize: 18, fontWeight: '800', color: c.ink, minWidth: 26, textAlign: 'center' },
  timeColon: { fontSize: 18, fontWeight: '800', color: c.ink, marginHorizontal: 2 },
  saveBtn: {
    backgroundColor: c.accent,
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: c.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.42,
    shadowRadius: 14,
    elevation: 6,
  },
  pressed: { opacity: 0.9 },
  saveText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', letterSpacing: 3 },

});
