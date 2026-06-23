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
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { ActivityItem, ActivityTag } from '../types';
import { timeLabel } from '../dateUtils';

interface Props {
  visible: boolean;
  items: ActivityItem[];
  tags: ActivityTag[];
  onClose: () => void;
  onSubmit: (item: ActivityItem) => void;
}

export default function QuickRecordSheet({ visible, items, tags, onClose, onSubmit }: Props) {
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(() => Date.now());
  const slide = useState(() => new Animated.Value(0))[0];
  const activeItems = items.filter((item) => !item.archived);

  useEffect(() => {
    if (visible) {
      setNow(Date.now());
      slide.setValue(0);
      Animated.timing(slide, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slide]);

  const handleClose = () => {
    onClose();
  };

  const translateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [420, 0],
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.fill}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.scrim} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.bottom}
        >
          <Animated.View
            style={[
              styles.sheet,
              { paddingBottom: 20 + insets.bottom, transform: [{ translateY }] },
            ]}
          >
            <View style={styles.grabber} />

            <View style={styles.headerBlock}>
              <Text style={styles.title}>记录此刻</Text>
              <Text style={styles.subtitle}>{timeLabel(now)} · 选择一件事</Text>
            </View>

            <Text style={styles.sectionLabel}>选择做了什么</Text>
            {activeItems.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>还没有可选的事情</Text>
                <Text style={styles.emptyHint}>去设置里添加常做的事情后，就能在这里一键记录。</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.itemScroll}
                contentContainerStyle={styles.items}
                showsVerticalScrollIndicator={false}
              >
                {activeItems.map((item) => {
                  const tag = tags.find((candidate) => candidate.id === item.tagId) || tags[0];
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => onSubmit(item)}
                    style={({ pressed }) => [styles.itemChip, pressed && styles.itemChipPressed]}
                  >
                    <View style={[styles.chipDot, { backgroundColor: tag?.dot || COLORS.accent }]} />
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={[styles.itemTag, { color: tag?.text || COLORS.accentInk }]}>
                      {tag?.label || '标签'}
                    </Text>
                  </Pressable>
                );
              })}
              </ScrollView>
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
    paddingHorizontal: 22,
    paddingTop: 14,
    gap: 14,
    shadowColor: '#322E2A',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.22,
    shadowRadius: 30,
    elevation: 24,
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#DAD3C7',
    alignSelf: 'center',
  },
  headerBlock: { gap: 3 },
  title: { fontSize: 19, fontWeight: '800', color: COLORS.ink },
  subtitle: { fontSize: 12, fontWeight: '600', color: COLORS.muted3 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: COLORS.gold,
  },
  itemScroll: { maxHeight: 320 },
  items: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 4 },
  itemChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 999,
  },
  itemChipPressed: { opacity: 0.58 },
  chipDot: { width: 7, height: 7, borderRadius: 999 },
  itemTitle: { fontSize: 13, fontWeight: '800', color: COLORS.ink },
  itemTag: { fontSize: 11, fontWeight: '800' },
  empty: { backgroundColor: COLORS.inputBg, borderRadius: 16, padding: 16, gap: 6 },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: COLORS.ink },
  emptyHint: { fontSize: 12, color: COLORS.muted3, lineHeight: 18 },
});
