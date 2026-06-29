import React, { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette, useTheme } from '../theme';
import { ActivityItem, ActivityTag, MoodId, NewRecordInput, WeatherId } from '../types';
import { timeLabel } from '../dateUtils';
import { MOODS, MoodFace, WEATHERS, WeatherIcon } from './moodWeather';

interface Props {
  visible: boolean;
  items: ActivityItem[];
  tags: ActivityTag[];
  onClose: () => void;
  onSubmit: (input: NewRecordInput) => void;
  onAddItem: (title: string, tagId?: ActivityTag['id']) => string;
}

export default function QuickRecordSheet({ visible, items, tags, onClose, onSubmit, onAddItem }: Props) {
  const insets = useSafeAreaInsets();
  const c = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [now, setNow] = useState(() => Date.now());
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [mood, setMood] = useState<MoodId | null>(null);
  const [weather, setWeather] = useState<WeatherId | null>(null);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTagId, setNewTagId] = useState<ActivityTag['id'] | null>(null);
  const [query, setQuery] = useState('');
  const slide = useState(() => new Animated.Value(0))[0];
  const activeItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return items
      .filter((item) => !item.archived)
      .filter((item) => !keyword || item.title.toLowerCase().includes(keyword))
      .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.createdAt - a.createdAt);
  }, [items, query]);

  useEffect(() => {
    if (visible) {
      setNow(Date.now());
      setSelectedItemId(null);
      setNote('');
      setMood(null);
      setWeather(null);
      setAdding(false);
      setNewTitle('');
      setNewTagId(null);
      setQuery('');
      slide.setValue(0);
      Animated.timing(slide, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [480, 0] });

  const selectedItem = activeItems.find((item) => item.id === selectedItemId) || null;
  const canSubmit = !!selectedItem;

  const handleSubmit = () => {
    if (!selectedItem) return;
    onSubmit({
      itemId: selectedItem.id,
      title: selectedItem.title,
      tagId: selectedItem.tagId,
      note: note.trim() || undefined,
      mood: mood ?? undefined,
      weather: weather ?? undefined,
    });
  };

  const confirmAdd = () => {
    const t = newTitle.trim();
    if (!t) return;
    const id = onAddItem(t, newTagId ?? undefined);
    setSelectedItemId(id);
    setAdding(false);
    setNewTitle('');
    setQuery('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.fill}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.scrim} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.bottom}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.sheet,
              { paddingBottom: 18 + insets.bottom, transform: [{ translateY }] },
            ]}
          >
            <View style={styles.grabber} />

            <View style={styles.headerBlock}>
              <Text style={styles.title}>记录此刻</Text>
              <Text style={styles.subtitle}>{timeLabel(now)} · 今天</Text>
            </View>

            <ScrollView
                style={styles.body}
                contentContainerStyle={styles.bodyContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Event (required) */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>选择事件</Text>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="搜索事件"
                    placeholderTextColor={c.muted3}
                    value={query}
                    onChangeText={setQuery}
                    maxLength={40}
                  />
                  <View style={styles.wrapRow}>
                    {activeItems.map((item) => {
                      const tag = tags.find((t) => t.id === item.tagId);
                      const active = selectedItemId === item.id;
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => setSelectedItemId(item.id)}
                          style={[
                            styles.eventChip,
                            active && { backgroundColor: c.accent, borderColor: c.accent },
                          ]}
                        >
                          {!active && <View style={[styles.eventDot, { backgroundColor: tag?.dot || c.muted3 }]} />}
                          {item.pinned && <Text style={[styles.pinMark, active && styles.eventTextActive]}>置顶</Text>}
                          <Text style={[styles.eventText, active && styles.eventTextActive]}>
                            {item.title}
                          </Text>
                        </Pressable>
                      );
                    })}
                    <Pressable
                      onPress={() => setAdding((v) => !v)}
                      style={[styles.eventChip, styles.addChip]}
                    >
                      <Text style={styles.addChipText}>＋ 添加</Text>
                    </Pressable>
                  </View>

                  {activeItems.length === 0 && !adding && (
                    <Text style={styles.eventHint}>
                      {query.trim() ? '没有匹配的事件，可以点「＋ 添加」新建一个。' : '还没有事件，点「＋ 添加」新建一个。'}
                    </Text>
                  )}

                  {adding && (
                    <View style={styles.addForm}>
                      <TextInput
                        style={styles.addInput}
                        placeholder="新事件名称…"
                        placeholderTextColor={c.muted3}
                        value={newTitle}
                        onChangeText={setNewTitle}
                        autoFocus
                        maxLength={40}
                      />
                      <View style={styles.wrapRow}>
                        <Pressable
                          onPress={() => setNewTagId(null)}
                          style={[
                            styles.eventChip,
                            newTagId == null && { backgroundColor: c.accent, borderColor: c.accent },
                          ]}
                        >
                          {newTagId != null && <View style={[styles.eventDot, { backgroundColor: c.muted3 }]} />}
                          <Text style={[styles.eventText, newTagId == null && styles.eventTextActive]}>
                            无标签
                          </Text>
                        </Pressable>
                        {tags.map((tag) => {
                          const active = newTagId === tag.id;
                          return (
                            <Pressable
                              key={tag.id}
                              onPress={() => setNewTagId(tag.id)}
                              style={[
                                styles.eventChip,
                                active && { backgroundColor: c.accent, borderColor: c.accent },
                              ]}
                            >
                              {!active && <View style={[styles.eventDot, { backgroundColor: tag.dot }]} />}
                              <Text style={[styles.eventText, active && styles.eventTextActive]}>
                                {tag.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      <View style={styles.addActions}>
                        <Pressable
                          onPress={() => {
                            setAdding(false);
                            setNewTitle('');
                          }}
                          style={[styles.addBtn, styles.addCancel]}
                        >
                          <Text style={styles.addCancelText}>取消</Text>
                        </Pressable>
                        <Pressable
                          onPress={confirmAdd}
                          disabled={!newTitle.trim()}
                          style={[styles.addBtn, styles.addConfirm, !newTitle.trim() && styles.addConfirmDisabled]}
                        >
                          <Text style={styles.addConfirmText}>添加</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>

                {/* Optional note */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>想说的话（可选）</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="记录此刻想说的话…"
                    placeholderTextColor={c.muted3}
                    value={note}
                    onChangeText={setNote}
                    multiline
                    maxLength={60}
                  />
                </View>

                {/* Mood (optional) */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>心情（可选）</Text>
                  <View style={styles.moodRow}>
                    {MOODS.map((m) => {
                      const active = mood === m.id;
                      return (
                        <Pressable
                          key={m.id}
                          onPress={() => setMood(active ? null : m.id)}
                          style={styles.moodItem}
                        >
                          <View style={[styles.moodFace, active && styles.moodFaceActive]}>
                            <MoodFace id={m.id} color={active ? c.accentInk : c.muted2} />
                          </View>
                          <Text style={[styles.moodLabel, active && styles.moodLabelActive]}>
                            {m.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Weather (optional) */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>天气（可选）</Text>
                  <View style={styles.weatherRow}>
                    {WEATHERS.map((w) => {
                      const active = weather === w.id;
                      return (
                        <Pressable
                          key={w.id}
                          onPress={() => setWeather(active ? null : w.id)}
                          style={[
                            styles.weatherChip,
                            active && { backgroundColor: c.accentSoft, borderColor: w.color, borderWidth: 2 },
                          ]}
                        >
                          <WeatherIcon id={w.id} />
                          <Text style={[styles.weatherText, active && styles.weatherTextActive]}>
                            {w.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
            </ScrollView>

            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.submit,
                !canSubmit && styles.submitDisabled,
                pressed && canSubmit ? styles.submitPressed : null,
              ]}
            >
              <Text style={styles.submitText}>记 下 来</Text>
            </Pressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  fill: { flex: 1 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.scrim },
  bottom: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: c.sheet,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 13,
    gap: 14,
    maxHeight: '92%',
    shadowColor: '#322E2A',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.22,
    shadowRadius: 30,
    elevation: 24,
  },
  grabber: { width: 38, height: 4, borderRadius: 999, backgroundColor: c.divider, alignSelf: 'center' },
  headerBlock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 17, fontWeight: '800', color: c.ink },
  subtitle: { fontSize: 11.5, fontWeight: '600', color: c.muted3 },
  body: { flexShrink: 1 },
  bodyContent: { gap: 14, paddingBottom: 4 },
  section: { gap: 8 },
  sectionLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1, color: c.gold },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  eventChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: c.card,
    borderWidth: 1.5,
    borderColor: c.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  eventDot: { width: 6, height: 6, borderRadius: 999 },
  eventText: { fontSize: 12.5, fontWeight: '700', color: c.muted },
  eventTextActive: { color: '#FFFFFF', fontWeight: '800' },
  addChip: { backgroundColor: c.accentSoft, borderColor: c.accent },
  addChipText: { fontSize: 12.5, fontWeight: '800', color: c.accentInk },
  eventHint: { fontSize: 12, fontWeight: '500', color: c.muted3, lineHeight: 18 },
  addForm: { marginTop: 4, backgroundColor: c.inputBg, borderRadius: 14, padding: 12, gap: 10 },
  addInput: {
    backgroundColor: c.card,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: c.ink,
  },
  searchInput: {
    backgroundColor: c.inputBg,
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 9,
    fontSize: 13,
    fontWeight: '600',
    color: c.ink,
  },
  pinMark: { fontSize: 10, fontWeight: '800', color: c.gold },
  addActions: { flexDirection: 'row', gap: 8 },
  addBtn: { flex: 1, alignItems: 'center', borderRadius: 12, paddingVertical: 10 },
  addCancel: { backgroundColor: c.card },
  addCancelText: { fontSize: 13, fontWeight: '800', color: c.muted },
  addConfirm: { backgroundColor: c.accent },
  addConfirmDisabled: { opacity: 0.45 },
  addConfirmText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  input: {
    backgroundColor: c.inputBg,
    borderRadius: 15,
    paddingHorizontal: 13,
    paddingVertical: 12,
    minHeight: 56,
    fontSize: 14,
    fontWeight: '600',
    color: c.ink,
    textAlignVertical: 'top',
    lineHeight: 21,
  },
  moodRow: { flexDirection: 'row', gap: 8 },
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
  empty: { backgroundColor: c.inputBg, borderRadius: 16, padding: 16, gap: 6, marginBottom: 4 },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: c.ink },
  emptyHint: { fontSize: 12, color: c.muted3, lineHeight: 18 },
  submit: {
    backgroundColor: c.accent,
    borderRadius: 15,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: c.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.42,
    shadowRadius: 14,
    elevation: 6,
  },
  submitPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  submitDisabled: { opacity: 0.45, shadowOpacity: 0 },
  submitText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', letterSpacing: 3 },
});
