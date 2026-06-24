import React, { useEffect, useState } from 'react';
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
import { COLORS } from '../theme';
import { ActivityItem, ActivityTag, MoodId, NewRecordInput, WeatherId } from '../types';
import { timeLabel } from '../dateUtils';
import { MOODS, MoodFace, WEATHERS, WeatherIcon } from './moodWeather';

interface Props {
  visible: boolean;
  items: ActivityItem[];
  tags: ActivityTag[];
  onClose: () => void;
  onSubmit: (input: NewRecordInput) => void;
}

export default function QuickRecordSheet({ visible, items, tags, onClose, onSubmit }: Props) {
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(() => Date.now());
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [mood, setMood] = useState<MoodId | null>(null);
  const [weather, setWeather] = useState<WeatherId | null>(null);
  const slide = useState(() => new Animated.Value(0))[0];
  const activeItems = items.filter((item) => !item.archived);

  useEffect(() => {
    if (visible) {
      setNow(Date.now());
      setSelectedItemId(null);
      setNote('');
      setMood(null);
      setWeather(null);
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

            {activeItems.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>还没有可选的事件</Text>
                <Text style={styles.emptyHint}>去「设置 → 事件管理」添加常做的事件后，就能在这里记录。</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.body}
                contentContainerStyle={styles.bodyContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Event (required) */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>选择事件</Text>
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
                            active && { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
                          ]}
                        >
                          {!active && <View style={[styles.eventDot, { backgroundColor: tag?.dot || COLORS.accent }]} />}
                          <Text style={[styles.eventText, active && styles.eventTextActive]}>
                            {item.title}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Optional note */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>想说的话（可选）</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="记录此刻想说的话…"
                    placeholderTextColor={COLORS.muted3}
                    value={note}
                    onChangeText={setNote}
                    multiline
                    maxLength={140}
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
                            <MoodFace id={m.id} color={active ? '#5E7257' : '#B0A695'} />
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
                            active && { backgroundColor: '#F4EFE0', borderColor: w.color, borderWidth: 2 },
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
            )}

            {activeItems.length > 0 && (
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
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: COLORS.scrim },
  bottom: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.sheet,
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
  grabber: { width: 38, height: 4, borderRadius: 999, backgroundColor: '#DAD3C7', alignSelf: 'center' },
  headerBlock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.ink },
  subtitle: { fontSize: 11.5, fontWeight: '600', color: COLORS.muted3 },
  body: { flexShrink: 1 },
  bodyContent: { gap: 14, paddingBottom: 4 },
  section: { gap: 8 },
  sectionLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1, color: COLORS.gold },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  eventChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  eventDot: { width: 6, height: 6, borderRadius: 999 },
  eventText: { fontSize: 12.5, fontWeight: '700', color: COLORS.muted },
  eventTextActive: { color: '#FFFFFF', fontWeight: '800' },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 15,
    paddingHorizontal: 13,
    paddingVertical: 12,
    minHeight: 56,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.ink,
    textAlignVertical: 'top',
    lineHeight: 21,
  },
  moodRow: { flexDirection: 'row', gap: 8 },
  moodItem: { flex: 1, alignItems: 'center', gap: 4 },
  moodFace: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodFaceActive: { backgroundColor: '#EDF0EA', borderColor: COLORS.accent, borderWidth: 2 },
  moodLabel: { fontSize: 9.5, fontWeight: '600', color: COLORS.muted3 },
  moodLabelActive: { color: COLORS.accentInk, fontWeight: '800' },
  weatherRow: { flexDirection: 'row', gap: 7 },
  weatherChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingVertical: 8,
    borderRadius: 12,
  },
  weatherText: { fontSize: 12, fontWeight: '700', color: COLORS.muted },
  weatherTextActive: { color: '#897B5E', fontWeight: '800' },
  empty: { backgroundColor: COLORS.inputBg, borderRadius: 16, padding: 16, gap: 6, marginBottom: 4 },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: COLORS.ink },
  emptyHint: { fontSize: 12, color: COLORS.muted3, lineHeight: 18 },
  submit: {
    backgroundColor: COLORS.accent,
    borderRadius: 15,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.42,
    shadowRadius: 14,
    elevation: 6,
  },
  submitPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  submitDisabled: { opacity: 0.45, shadowOpacity: 0 },
  submitText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', letterSpacing: 3 },
});
