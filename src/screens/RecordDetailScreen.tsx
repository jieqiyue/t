import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette, UNTAGGED_LABEL, useTheme } from '../theme';
import { Activity, ActivityItem, ActivityTag, CategoryId, MoodId, WeatherId } from '../types';
import { resolveActivityTag, resolveOptionalTag } from '../tagUtils';
import { MOOD_MAP, MOODS, MoodFace, WEATHER_MAP, WEATHERS, WeatherIcon } from '../components/moodWeather';
import ConfirmDialog from '../components/ConfirmDialog';
import WheelPicker from '../components/WheelPicker';
import DatePickerSheet from '../components/DatePickerSheet';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

interface Props {
  activity: Activity;
  items: ActivityItem[];
  tags: ActivityTag[];
  onUpdate: (activity: Activity) => void;
  onDuplicate: (activity: Activity) => void;
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
  items,
  tags,
  onUpdate,
  onDuplicate,
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
  const [selectedItemId, setSelectedItemId] = useState<string | null>(activity.itemId ?? null);
  const [selectedTagId, setSelectedTagId] = useState<ActivityTag['id'] | null>(activity.tagId ?? null);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [pendingDuplicate, setPendingDuplicate] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  const tag = resolveActivityTag(c, tags, activity);
  const activeItems = useMemo(
    () =>
      items
        .filter((item) => !item.archived)
        .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.createdAt - a.createdAt),
    [items],
  );
  const selectedItem = activeItems.find((item) => item.id === selectedItemId) || null;
  const editTag = resolveOptionalTag(c, tags, selectedTagId ?? undefined);

  const startEdit = () => {
    setNote(activity.note ?? '');
    setMood(activity.mood ?? null);
    setWeather(activity.weather ?? null);
    setWhen(new Date(activity.timestamp));
    setSelectedItemId(activity.itemId ?? null);
    setSelectedTagId(activity.tagId ?? null);
    setMode('edit');
  };

  const save = () => {
    const nextTitle = selectedItem?.title ?? activity.title;
    const nextItemId = selectedItem?.id ?? activity.itemId;
    const nextTagId = selectedTagId ?? undefined;
    const matchedTag = tags.find((candidate) => candidate.id === nextTagId);
    const nextCategory = (matchedTag?.id === 'work' ||
      matchedTag?.id === 'life' ||
      matchedTag?.id === 'sport' ||
      matchedTag?.id === 'fun'
      ? matchedTag.id
      : 'life') as CategoryId;

    onUpdate({
      ...activity,
      itemId: nextItemId,
      title: nextTitle,
      tagId: nextTagId,
      category: nextCategory,
      note: note.trim() || undefined,
      mood: mood ?? undefined,
      weather: weather ?? undefined,
      timestamp: when.getTime(),
    });
    setMode('view');
  };

  const setHour = (h: number) =>
    setWhen((d) => {
      const n = new Date(d);
      n.setHours(h);
      return n;
    });
  const setMinute = (m: number) =>
    setWhen((d) => {
      const n = new Date(d);
      n.setMinutes(m);
      return n;
    });

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
          <View style={styles.badge}>
            <View style={styles.badgeCircle}>
              <View style={[styles.badgeDot, { backgroundColor: editTag.dot }]} />
            </View>
            <Text style={styles.badgeTitle} numberOfLines={1}>{selectedItem?.title ?? activity.title}</Text>
            <Text style={[styles.badgeTag, { color: editTag.text }]}>{editTag.label}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>所属事件</Text>
            <View style={styles.chipCard}>
              {activeItems.map((item) => {
                const active = selectedItemId === item.id;
                const itemTag = resolveOptionalTag(c, tags, item.tagId);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      setSelectedItemId(item.id);
                      setSelectedTagId(item.tagId ?? null);
                    }}
                    style={[
                      styles.selectChip,
                      active && { backgroundColor: c.accent, borderColor: c.accent },
                    ]}
                  >
                    {!active && <View style={[styles.selectDot, { backgroundColor: itemTag.dot }]} />}
                    <Text style={[styles.selectText, active && styles.selectTextActive]} numberOfLines={1}>
                      {item.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>标签</Text>
            <View style={styles.chipCard}>
              <Pressable
                onPress={() => setSelectedTagId(null)}
                style={[
                  styles.selectChip,
                  selectedTagId == null && { backgroundColor: c.accent, borderColor: c.accent },
                ]}
              >
                {selectedTagId != null && <View style={[styles.selectDot, { backgroundColor: c.muted3 }]} />}
                <Text style={[styles.selectText, selectedTagId == null && styles.selectTextActive]}>
                  {UNTAGGED_LABEL}
                </Text>
              </Pressable>
              {tags.map((candidate) => {
                const active = selectedTagId === candidate.id;
                return (
                  <Pressable
                    key={candidate.id}
                    onPress={() => setSelectedTagId(candidate.id)}
                    style={[
                      styles.selectChip,
                      active && { backgroundColor: candidate.dot, borderColor: candidate.dot },
                    ]}
                  >
                    {!active && <View style={[styles.selectDot, { backgroundColor: candidate.dot }]} />}
                    <Text style={[styles.selectText, active && styles.selectTextActive]}>
                      {candidate.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>备注</Text>
            <View style={styles.noteBox}>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                placeholder="记录此刻想说的话…"
                placeholderTextColor={c.muted3}
                multiline
                maxLength={60}
              />
              <Text style={styles.noteCount}>{note.length} / 60</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>心情</Text>
            <View style={styles.moodCard}>
              {MOODS.map((m) => {
                const active = mood === m.id;
                return (
                  <Pressable key={m.id} onPress={() => setMood(active ? null : m.id)} style={styles.moodItem}>
                    <View style={[styles.moodFace, active && styles.moodFaceActive]}>
                      <MoodFace id={m.id} color={active ? '#FFFFFF' : c.muted2} />
                    </View>
                    <Text style={[styles.moodLabel, active && styles.moodLabelActive]}>{m.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>天气</Text>
            <View style={styles.weatherSeg}>
              {WEATHERS.map((w) => {
                const active = weather === w.id;
                return (
                  <Pressable
                    key={w.id}
                    onPress={() => setWeather(active ? null : w.id)}
                    style={[styles.weatherSegItem, active && styles.weatherSegItemActive]}
                  >
                    <WeatherIcon id={w.id} size={15} />
                    <Text style={[styles.weatherSegText, active && styles.weatherSegTextActive]}>{w.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>时间</Text>
            <View style={styles.timeCard}>
              <Pressable
                onPress={() => setDateOpen(true)}
                style={({ pressed }) => [styles.dateBox, pressed && styles.pressed]}
              >
                <Text style={styles.dateText}>
                  {when.getMonth() + 1}月{when.getDate()}日
                </Text>
                <Text style={styles.dateChevron}>›</Text>
              </Pressable>
              <Pressable
                onPress={() => setTimeOpen(true)}
                style={({ pressed }) => [styles.timeBox, pressed && styles.pressed]}
              >
                <Text style={styles.timeBoxNum}>{pad(when.getHours())}</Text>
                <Text style={styles.timeBoxColon}>:</Text>
                <Text style={styles.timeBoxNum}>{pad(when.getMinutes())}</Text>
              </Pressable>
            </View>
          </View>

          <Pressable onPress={save} style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}>
            <Text style={styles.saveText}>保 存 修 改</Text>
          </Pressable>
        </ScrollView>

        <Modal
          visible={timeOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setTimeOpen(false)}
        >
          <View style={styles.pickerFill}>
            <Pressable style={styles.pickerScrim} onPress={() => setTimeOpen(false)} />
            <View style={[styles.pickerSheet, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>选择时间</Text>
                <Pressable onPress={() => setTimeOpen(false)} hitSlop={10}>
                  <Text style={styles.pickerDone}>完成</Text>
                </Pressable>
              </View>
              <View style={styles.wheelRow}>
                <WheelPicker values={HOURS} value={when.getHours()} onChange={setHour} format={pad} />
                <Text style={styles.wheelColon}>:</Text>
                <WheelPicker values={MINUTES} value={when.getMinutes()} onChange={setMinute} format={pad} />
              </View>
            </View>
          </View>
        </Modal>

        <DatePickerSheet
          visible={dateOpen}
          value={when}
          onSelect={(d) => setWhen(d)}
          onClose={() => setDateOpen(false)}
        />
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
        <Pressable onPress={() => setPendingDuplicate(true)} style={styles.duplicateRow} hitSlop={6}>
          <Text style={styles.duplicateText}>复制为新记录</Text>
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

      {pendingDuplicate && (
        <ConfirmDialog
          title="复制记录"
          message={`复制「${activity.title}」后，会用当前时间创建一条新的记录，备注、心情和天气会一并保留。`}
          confirmLabel="确认复制"
          confirmColor={c.accent}
          onConfirm={() => {
            onDuplicate(activity);
            setPendingDuplicate(false);
          }}
          onCancel={() => setPendingDuplicate(false)}
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
  duplicateRow: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  duplicateText: { fontSize: 13, fontWeight: '800', color: c.accentInk },

  // edit mode
  editHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10 },
  headerSide: { fontSize: 14, fontWeight: '700', color: c.muted },
  headerSave: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    backgroundColor: c.accent,
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: c.ink },
  section: { gap: 8 },
  label: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1, color: c.gold, paddingLeft: 2 },

  badge: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: c.card,
    borderRadius: 999,
    paddingLeft: 8,
    paddingRight: 13,
    paddingVertical: 6,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  badgeCircle: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: c.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDot: { width: 9, height: 9, borderRadius: 999 },
  badgeTitle: { fontSize: 13, fontWeight: '800', color: c.ink, flexShrink: 1 },
  badgeTag: { fontSize: 11, fontWeight: '700' },

  chipCard: {
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  selectChip: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: c.inputBg,
    borderWidth: 1.5,
    borderColor: c.border,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  selectDot: { width: 7, height: 7, borderRadius: 999 },
  selectText: { maxWidth: 190, fontSize: 12, fontWeight: '800', color: c.muted },
  selectTextActive: { color: '#FFFFFF' },

  noteBox: {
    backgroundColor: c.card,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 74,
    borderWidth: 1.5,
    borderColor: c.accent,
    gap: 6,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  noteInput: {
    fontSize: 13.5,
    fontWeight: '500',
    color: c.ink,
    lineHeight: 22,
    textAlignVertical: 'top',
    padding: 0,
    minHeight: 40,
  },
  noteCount: { alignSelf: 'flex-end', fontSize: 10, fontWeight: '600', color: c.muted3 },

  moodCard: {
    backgroundColor: c.card,
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 8,
    flexDirection: 'row',
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  moodItem: { flex: 1, alignItems: 'center', gap: 4 },
  moodFace: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: c.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodFaceActive: {
    backgroundColor: c.accent,
    shadowColor: c.accent,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 4,
  },
  moodLabel: { fontSize: 9.5, fontWeight: '600', color: c.muted3 },
  moodLabelActive: { color: c.accentInk, fontWeight: '800' },

  weatherSeg: { flexDirection: 'row', backgroundColor: c.border, borderRadius: 14, padding: 4, gap: 3 },
  weatherSegItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 11,
  },
  weatherSegItemActive: {
    backgroundColor: c.card,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  weatherSegText: { fontSize: 12, fontWeight: '700', color: c.muted2 },
  weatherSegTextActive: { color: c.ink, fontWeight: '800' },

  timeCard: {
    backgroundColor: c.card,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  dateBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.inputBg,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  dateText: { fontSize: 13, fontWeight: '800', color: c.ink },
  dateChevron: { fontSize: 15, fontWeight: '700', color: c.muted3, marginTop: -1 },
  timeBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    backgroundColor: c.inputBg,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  timeBoxNum: { fontSize: 20, fontWeight: '800', color: c.ink, lineHeight: 22 },
  timeBoxColon: { fontSize: 16, fontWeight: '800', color: c.muted3 },
  pickerFill: { flex: 1, justifyContent: 'flex-end' },
  pickerScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.scrim },
  pickerSheet: {
    backgroundColor: c.sheet,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 14,
  },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  pickerTitle: { fontSize: 15, fontWeight: '800', color: c.ink },
  pickerDone: { fontSize: 15, fontWeight: '800', color: c.accentInk },
  wheelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  wheelColon: { fontSize: 24, fontWeight: '800', color: c.ink, marginHorizontal: 2 },
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
