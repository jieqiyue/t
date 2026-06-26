import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette, useTheme } from '../theme';
import { Activity, ActivityTag } from '../types';
import { resolveActivityTag } from '../tagUtils';
import { dayKey, relativeDayLabel, timeLabel } from '../dateUtils';
import { MOOD_MAP, MoodFace, SearchIcon, WEATHER_MAP, WeatherIcon } from '../components/moodWeather';
import { useToday } from '../useToday';

interface Props {
  activities: Activity[];
  tags: ActivityTag[];
  onOpenDetail: (id: string) => void;
  onBack: () => void;
}

interface DayGroup {
  key: number;
  label: string;
  items: Activity[];
}

function dayHeading(d: Date, today: Date): string {
  const base = `${d.getMonth() + 1}月${d.getDate()}日`;
  const rel = relativeDayLabel(d, today);
  return rel === '今天' || rel === '昨天' ? `${base} · ${rel}` : base;
}

export default function SearchScreen({ activities, tags, onOpenDetail, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const c = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const today = useToday();
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return [];
    return activities
      .filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.note ? a.note.toLowerCase().includes(q) : false),
      )
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [activities, q]);

  const groups = useMemo(() => {
    const out: DayGroup[] = [];
    let cur: DayGroup | null = null;
    for (const a of results) {
      const d = new Date(a.timestamp);
      const k = dayKey(d);
      if (!cur || cur.key !== k) {
        cur = { key: k, label: dayHeading(d, today), items: [] };
        out.push(cur);
      }
      cur.items.push(a);
    }
    return out;
  }, [results, today]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.searchBox}>
          <SearchIcon color={c.muted3} size={16} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="搜索标题或备注…"
            placeholderTextColor={c.muted3}
            autoFocus
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8} style={styles.clearBtn}>
              <Text style={styles.clearIcon}>×</Text>
            </Pressable>
          )}
        </View>
      </View>

      {!q ? (
        <View style={styles.center}>
          <Text style={styles.hintTitle}>搜索记录</Text>
          <Text style={styles.hintText}>按标题或备注里的关键词查找，{'\n'}共 {activities.length} 条记录可搜。</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.hintTitle}>没有找到相关记录</Text>
          <Text style={styles.hintText}>试试换一个关键词。</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
        >
          <Text style={styles.count}>找到 {results.length} 条</Text>
          {groups.map((group) => (
            <View key={group.key} style={styles.group}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              <View style={styles.card}>
                {group.items.map((a, idx) => {
                  const tag = resolveActivityTag(c, tags, a);
                  return (
                    <Pressable
                      key={a.id}
                      onPress={() => onOpenDetail(a.id)}
                      style={({ pressed }) => [
                        styles.row,
                        idx === group.items.length - 1 && styles.rowLast,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.time}>{timeLabel(a.timestamp)}</Text>
                      <View style={[styles.dot, { backgroundColor: tag.dot }]} />
                      <View style={styles.body}>
                        <Text style={styles.title} numberOfLines={1}>
                          {a.title}
                        </Text>
                        {!!a.note && (
                          <Text style={styles.note} numberOfLines={1} ellipsizeMode="tail">
                            {a.note}
                          </Text>
                        )}
                        <View style={styles.metaRow}>
                          <Text style={[styles.metaCat, { color: tag.text }]}>{tag.label}</Text>
                          {a.mood && (
                            <>
                              <Text style={styles.metaSep}>·</Text>
                              <MoodFace id={a.mood} color={c.muted2} size={13} />
                              <Text style={styles.metaText}>{MOOD_MAP[a.mood]?.label}</Text>
                            </>
                          )}
                          {a.weather && (
                            <>
                              <Text style={styles.metaSep}>·</Text>
                              <WeatherIcon id={a.weather} color={c.muted2} size={12} />
                              <Text style={styles.metaText}>{WEATHER_MAP[a.weather]?.label}</Text>
                            </>
                          )}
                        </View>
                      </View>
                      <Text style={styles.chevron}>›</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bgAlt, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: c.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 20, color: c.muted, marginTop: -2 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.card,
    borderRadius: 14,
    paddingHorizontal: 13,
    height: 42,
  },
  input: { flex: 1, fontSize: 14, fontWeight: '600', color: c.ink, padding: 0 },
  clearBtn: { width: 18, height: 18, borderRadius: 999, backgroundColor: c.inputBg, alignItems: 'center', justifyContent: 'center' },
  clearIcon: { fontSize: 14, color: c.muted, marginTop: -1 },
  count: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, color: c.gold, marginTop: 18, marginBottom: 4 },
  group: { marginTop: 14 },
  groupLabel: { fontSize: 12, fontWeight: '800', color: c.muted2, marginBottom: 8, paddingLeft: 2 },
  card: {
    backgroundColor: c.card,
    borderRadius: 16,
    paddingHorizontal: 14,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: c.inputBg,
  },
  rowLast: { borderBottomWidth: 0 },
  pressed: { opacity: 0.55 },
  time: { width: 40, fontSize: 11, fontWeight: '700', color: c.gold, paddingTop: 2 },
  dot: { width: 9, height: 9, borderRadius: 999, marginTop: 5 },
  body: { flex: 1, minWidth: 0, gap: 4 },
  title: { fontSize: 14, fontWeight: '700', color: c.ink },
  note: { fontSize: 12, fontWeight: '500', color: c.muted, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  metaCat: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  metaSep: { fontSize: 11, fontWeight: '700', color: c.muted3 },
  metaText: { fontSize: 11, fontWeight: '700', color: c.muted2 },
  chevron: { fontSize: 18, fontWeight: '700', color: c.gold, marginTop: 2 },
  center: { alignItems: 'center', paddingTop: 90, gap: 9 },
  hintTitle: { fontSize: 15, fontWeight: '800', color: c.muted },
  hintText: { fontSize: 12.5, color: c.muted3, textAlign: 'center', lineHeight: 20 },
});
