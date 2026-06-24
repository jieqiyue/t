import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORY_MAP, Palette, useTheme } from '../theme';
import { Activity, ActivityTag } from '../types';
import { timeLabel } from '../dateUtils';
import { CheckIcon, MOOD_MAP, MoodFace, WEATHER_MAP, WeatherIcon } from '../components/moodWeather';

interface Props {
  activity: Activity;
  tags: ActivityTag[];
  todayCount: number;
  onBack: () => void;
}

export default function RecordDoneScreen({ activity, tags, todayCount, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const c = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 360,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: true,
    }).start();
  }, [anim]);

  const tag = tags.find((t) => t.id === (activity.tagId || activity.category)) || CATEGORY_MAP[activity.category];
  const mood = activity.mood ? MOOD_MAP[activity.mood] : null;
  const weather = activity.weather ? WEATHER_MAP[activity.weather] : null;

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.center}>
        <Animated.View style={[styles.checkOuter, { opacity: anim, transform: [{ scale }] }]}>
          <View style={styles.checkInner}>
            <CheckIcon />
          </View>
        </Animated.View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>记录完成</Text>
          <Text style={styles.subtitle}>
            今天已记录 {todayCount} 件事，{'\n'}继续保持这份用心。
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{activity.title}</Text>
          {!!activity.note && <Text style={styles.cardNote}>{activity.note}</Text>}
          <View style={styles.tagsRow}>
            <View style={[styles.catPill, { backgroundColor: tag.soft || c.accentSoft }]}>
              <View style={[styles.catDot, { backgroundColor: tag.dot }]} />
              <Text style={[styles.catText, { color: tag.text }]}>{tag.label}</Text>
            </View>
            {mood && (
              <View style={styles.metaPill}>
                <MoodFace id={mood.id} color={c.muted} size={12} />
                <Text style={styles.metaText}>{mood.label}</Text>
              </View>
            )}
            {weather && (
              <View style={styles.metaPill}>
                <WeatherIcon id={weather.id} color={c.muted} size={11} />
                <Text style={styles.metaText}>{weather.label}</Text>
              </View>
            )}
            <Text style={styles.time}>{timeLabel(activity.timestamp)}</Text>
          </View>
        </View>

        <Pressable onPress={onBack} hitSlop={12} style={({ pressed }) => pressed && styles.linkPressed}>
          <Text style={styles.link}>返回时间轴</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bgAlt },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, gap: 22 },
  checkOuter: {
    width: 84,
    height: 84,
    borderRadius: 999,
    backgroundColor: c.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInner: {
    width: 60,
    height: 60,
    borderRadius: 999,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 8,
  },
  titleBlock: { alignItems: 'center', gap: 7 },
  title: { fontSize: 21, fontWeight: '800', color: c.ink },
  subtitle: { fontSize: 13, fontWeight: '500', color: c.muted2, textAlign: 'center', lineHeight: 21 },
  card: {
    width: '100%',
    backgroundColor: c.card,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 11,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: c.ink, lineHeight: 20 },
  cardNote: { fontSize: 12.5, fontWeight: '500', color: c.muted, lineHeight: 19, marginTop: -3 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  catPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  catDot: { width: 6, height: 6, borderRadius: 999 },
  catText: { fontSize: 10.5, fontWeight: '800' },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.inputBg,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  metaText: { fontSize: 10.5, fontWeight: '700', color: c.muted },
  time: { fontSize: 10.5, fontWeight: '600', color: c.gold, marginLeft: 'auto' },
  link: { fontSize: 13, fontWeight: '800', color: c.accent },
  linkPressed: { opacity: 0.6 },
});
