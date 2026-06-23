import React, { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORIES, COLORS } from '../theme';
import { CategoryId } from '../types';
import { timeLabel } from '../dateUtils';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (title: string, category: CategoryId) => void;
}

export default function QuickRecordSheet({ visible, onClose, onSubmit }: Props) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CategoryId>('life');
  const [now, setNow] = useState(() => Date.now());
  const slide = useState(() => new Animated.Value(0))[0];

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

  const reset = () => {
    setTitle('');
    setCategory('life');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    onSubmit(trimmed, category);
    reset();
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
              <Text style={styles.subtitle}>{timeLabel(now)} · 刚刚</Text>
            </View>

            <TextInput
              style={styles.input}
              placeholder="做了什么？"
              placeholderTextColor={COLORS.muted3}
              value={title}
              onChangeText={setTitle}
              multiline
              autoFocus
              maxLength={120}
            />

            <Text style={styles.sectionLabel}>选择分类</Text>
            <View style={styles.chips}>
              {CATEGORIES.map((c) => {
                const active = c.id === category;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setCategory(c.id)}
                    style={[
                      styles.chip,
                      active && { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
                    ]}
                  >
                    {!active && <View style={[styles.chipDot, { backgroundColor: c.dot }]} />}
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={!title.trim()}
              style={({ pressed }) => [
                styles.submit,
                !title.trim() && styles.submitDisabled,
                pressed && title.trim() ? styles.submitPressed : null,
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
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 70,
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.ink,
    textAlignVertical: 'top',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: COLORS.gold,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
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
  chipDot: { width: 7, height: 7, borderRadius: 999 },
  chipText: { fontSize: 13, fontWeight: '700', color: COLORS.muted },
  chipTextActive: { color: '#FFFFFF', fontWeight: '800' },
  submit: {
    marginTop: 3,
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 15,
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
