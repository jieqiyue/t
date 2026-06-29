import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette, useTheme } from '../theme';
import { calendarWeeks, dayKey } from '../dateUtils';

const WEEK = ['一', '二', '三', '四', '五', '六', '日'];

interface Props {
  visible: boolean;
  value: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

export default function DatePickerSheet({ visible, value, onSelect, onClose }: Props) {
  const c = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const [view, setView] = useState(() => ({ y: value.getFullYear(), m: value.getMonth() }));

  // Each time the sheet opens, jump to the month of the current value.
  useEffect(() => {
    if (visible) setView({ y: value.getFullYear(), m: value.getMonth() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const weeks = useMemo(() => calendarWeeks(view.y, view.m), [view]);
  const selectedKey = dayKey(value);
  const todayKey = dayKey(new Date());

  const changeMonth = (delta: number) =>
    setView((v) => {
      let m = v.m + delta;
      let y = v.y;
      if (m < 0) {
        m = 11;
        y -= 1;
      } else if (m > 11) {
        m = 0;
        y += 1;
      }
      return { y, m };
    });

  const pick = (day: number) => {
    onSelect(
      new Date(
        view.y,
        view.m,
        day,
        value.getHours(),
        value.getMinutes(),
        value.getSeconds(),
        value.getMilliseconds(),
      ),
    );
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.fill}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
          <View style={styles.header}>
            <Pressable onPress={() => changeMonth(-1)} hitSlop={10} style={styles.navBtn}>
              <Text style={styles.navIcon}>‹</Text>
            </Pressable>
            <Text style={styles.title}>
              {view.y}年{view.m + 1}月
            </Text>
            <Pressable onPress={() => changeMonth(1)} hitSlop={10} style={styles.navBtn}>
              <Text style={styles.navIcon}>›</Text>
            </Pressable>
          </View>

          <View style={styles.weekHeader}>
            {WEEK.map((w, i) => (
              <Text key={w} style={[styles.weekCell, i >= 5 && { color: c.weekend }]}>
                {w}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {weeks.map((week, wi) => (
              <View key={wi} style={styles.weekRow}>
                {week.map((day, di) => {
                  if (day == null) return <View key={di} style={styles.cellSpacer} />;
                  const k = dayKey(new Date(view.y, view.m, day));
                  const selected = k === selectedKey;
                  const isToday = k === todayKey;
                  return (
                    <Pressable
                      key={di}
                      onPress={() => pick(day)}
                      style={({ pressed }) => [
                        styles.cell,
                        isToday && !selected && styles.cellToday,
                        selected && styles.cellSelected,
                        pressed && styles.cellPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.cellText,
                          isToday && !selected && styles.cellTextToday,
                          selected && styles.cellTextSelected,
                        ]}
                      >
                        {day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    fill: { flex: 1, justifyContent: 'flex-end' },
    scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.scrim },
    sheet: {
      backgroundColor: c.sheet,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 22,
      paddingTop: 16,
      gap: 12,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    navBtn: {
      width: 34,
      height: 34,
      borderRadius: 999,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navIcon: { fontSize: 18, fontWeight: '800', color: c.muted, marginTop: -2 },
    title: { fontSize: 15, fontWeight: '800', color: c.ink },
    weekHeader: { flexDirection: 'row' },
    weekCell: { flex: 1, textAlign: 'center', fontSize: 10.5, fontWeight: '700', color: c.gold },
    grid: { gap: 5 },
    weekRow: { flexDirection: 'row', gap: 5 },
    cell: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cellSpacer: { flex: 1, aspectRatio: 1 },
    cellToday: { backgroundColor: c.accentSoft },
    cellSelected: { backgroundColor: c.accent },
    cellPressed: { opacity: 0.6 },
    cellText: { fontSize: 13.5, fontWeight: '700', color: c.ink },
    cellTextToday: { color: c.accentInk, fontWeight: '800' },
    cellTextSelected: { color: '#FFFFFF', fontWeight: '800' },
  });
