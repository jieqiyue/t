import React, { useEffect, useMemo, useRef } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Palette, useTheme } from '../theme';

export const ITEM_HEIGHT = 44;
const VISIBLE = 5; // odd, so one row sits dead-centre
export const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE;
const PAD = (WHEEL_HEIGHT - ITEM_HEIGHT) / 2;

interface Props {
  values: number[];
  value: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}

/**
 * A vertical snap scroll-wheel: flick or drag and it settles on the row under
 * the centre band. Pure JS (a snapping ScrollView), so it runs on web/native
 * without a native picker module.
 */
export default function WheelPicker({ values, value, onChange, format }: Props) {
  const c = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const ref = useRef<ScrollView>(null);
  const didInit = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const index = Math.max(0, values.indexOf(value));

  useEffect(() => () => clearTimeout(timer.current), []);

  // Position the wheel on the current value once, after first layout.
  const initScroll = () => {
    if (didInit.current) return;
    didInit.current = true;
    ref.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: false });
  };

  const settleAt = (y: number) => {
    const i = Math.min(values.length - 1, Math.max(0, Math.round(y / ITEM_HEIGHT)));
    const next = values[i];
    if (next !== value) onChange(next);
  };
  // Touch flick / drag end settle immediately; the debounced scroll handler is a
  // backstop that also covers trackpad / mouse-wheel scrolling (web).
  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => settleAt(e.nativeEvent.contentOffset.y);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => settleAt(y), 120);
  };

  return (
    <View style={styles.wheel}>
      <View style={styles.band} pointerEvents="none" />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        scrollEventThrottle={16}
        onLayout={initScroll}
        onScroll={onScroll}
        onMomentumScrollEnd={settle}
        onScrollEndDrag={settle}
        contentContainerStyle={{ paddingVertical: PAD }}
      >
        {values.map((v) => (
          <View key={v} style={styles.item}>
            <Text style={[styles.itemText, v === value && styles.itemTextActive]}>
              {format ? format(v) : String(v)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    wheel: { height: WHEEL_HEIGHT, width: 92 },
    band: {
      position: 'absolute',
      top: PAD,
      left: 6,
      right: 6,
      height: ITEM_HEIGHT,
      borderRadius: 12,
      backgroundColor: c.inputBg,
    },
    item: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
    itemText: { fontSize: 20, fontWeight: '700', color: c.muted3 },
    itemTextActive: { fontSize: 23, fontWeight: '800', color: c.ink },
  });
